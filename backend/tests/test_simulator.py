"""
Unit tests for the FuelFlow AI discrete-event simulation engine, pump allocation strategies,
predictor, and recommender services.
"""

from copy import deepcopy
import unittest

from backend.data import DEFAULT_STATIONS, reset_stations_state
from backend.services.allocator import (
    SimPumpState,
    allocate_fcfs_pump,
    allocate_smart_pump,
    get_compatible_operational_pumps,
)
from backend.services.predictor import predict_wait_time_service
from backend.services.recommender import recommend_station_service
from backend.services.simulator import (
    GeneratedVehicle,
    compare_strategies_service,
    execute_strategy_simulation,
    generate_vehicle_stream,
    run_simulation_service,
)


class TestSimulationAndAllocation(unittest.TestCase):
    def setUp(self) -> None:
        reset_stations_state()

    def test_200_vehicle_simulation_and_seed_reproducibility(self) -> None:
        """200-vehicle simulation runs deterministically and produces identical results for the same seed."""
        res1 = run_simulation_service(vehicle_count=200, scenario="normal", seed=42)
        res2 = run_simulation_service(vehicle_count=200, scenario="normal", seed=42)
        res_diff_seed = run_simulation_service(vehicle_count=200, scenario="normal", seed=99)

        self.assertEqual(res1["results"]["total_vehicles_simulated"], 200)
        self.assertEqual(res1["results"], res2["results"])
        self.assertEqual(res1["allocation_log"], res2["allocation_log"])
        # Different seed produces a different trajectory
        self.assertNotEqual(
            res1["allocation_log"][0]["vehicle_id"],
            res_diff_seed["allocation_log"][0]["vehicle_id"],
        )

    def test_normal_vs_peak_traffic_scenarios(self) -> None:
        """Peak traffic scenario experiences higher wait times than normal traffic for the same seed."""
        normal_res = run_simulation_service(vehicle_count=200, scenario="normal", seed=42)
        peak_res = run_simulation_service(vehicle_count=200, scenario="peak", seed=42)

        self.assertGreater(
            peak_res["results"]["system_avg_wait_min"],
            normal_res["results"]["system_avg_wait_min"],
        )
        self.assertGreater(
            peak_res["results"]["system_max_wait_min"],
            normal_res["results"]["system_max_wait_min"],
        )

    def test_zero_arrivals_handled_safely(self) -> None:
        """Simulation and comparison handle 0 vehicle arrivals without division-by-zero errors."""
        sim_zero = run_simulation_service(vehicle_count=0, scenario="normal", seed=42)
        self.assertEqual(sim_zero["results"]["total_vehicles_simulated"], 0)
        self.assertEqual(sim_zero["results"]["vehicles_served"], 0)
        self.assertEqual(sim_zero["results"]["system_avg_wait_min"], 0.0)
        self.assertEqual(sim_zero["results"]["system_max_wait_min"], 0.0)

        cmp_zero = compare_strategies_service(vehicle_count=0, seed=42)
        self.assertEqual(cmp_zero["overall"]["total_vehicles"], 0)
        self.assertEqual(cmp_zero["overall"]["improvement"]["wait_reduction_pct"], 0.0)

    def test_diesel_compatibility_strictly_enforced(self) -> None:
        """Diesel vehicles are ONLY assigned to Pump 3 (never Pump 1 or Pump 2) and never to Station C (no diesel)."""
        vehicles = generate_vehicle_stream(vehicle_count=200, scenario="normal", seed=42)
        for strat in ("fcfs", "smart"):
            out = execute_strategy_simulation(vehicles=vehicles, strategy=strat)
            for rec in out["records"]:
                if rec.vehicle.fuel_type == "diesel":
                    self.assertIsNotNone(rec.station_id)
                    self.assertNotEqual(rec.station_id, "C", "Station C has no diesel in stock")
                    self.assertEqual(rec.pump_id, 3, "Only Pump 3 supports diesel")

    def test_offline_pumps_and_no_fuel_never_assigned(self) -> None:
        """Offline (maintenance) pumps and out-of-stock fuels are never assigned."""
        vehicles = generate_vehicle_stream(vehicle_count=200, scenario="peak", seed=17)
        for strat in ("fcfs", "smart"):
            out = execute_strategy_simulation(vehicles=vehicles, strategy=strat)
            for rec in out["records"]:
                # Station B Pump 2 is in maintenance
                if rec.station_id == "B":
                    self.assertNotEqual(rec.pump_id, 2, "Station B Pump 2 is in maintenance")
                    self.assertNotEqual(rec.vehicle.fuel_type, "petrol_95", "Station B has no petrol_95")
                if rec.station_id == "C":
                    self.assertNotEqual(rec.vehicle.fuel_type, "diesel", "Station C has no diesel")

        # Also test when ALL compatible pumps are offline at all stations for diesel
        custom_stations = deepcopy(DEFAULT_STATIONS)
        for st in custom_stations:
            for p in st["pumps"]:
                if "diesel" in p["fuel_types"]:
                    p["status"] = "maintenance"

        out_no_diesel_pump = execute_strategy_simulation(
            vehicles=vehicles[:30],
            strategy="smart",
            stations_config=custom_stations,
        )
        for rec in out_no_diesel_pump["records"]:
            if rec.vehicle.fuel_type == "diesel":
                self.assertIsNone(rec.station_id)
                self.assertIsNone(rec.pump_id)
                self.assertFalse(rec.served_within_horizon)

    def test_comparison_fairness_and_dynamic_improvements(self) -> None:
        """
        Both strategies use identical generated vehicles and calculate percentage improvements
        dynamically (never hardcoded 46.7, 49.5, or 54.2).
        """
        cmp_res = compare_strategies_service(vehicle_count=200, seed=42, scenario="normal")
        overall = cmp_res["overall"]
        fcfs_avg = overall["fixed_fcfs"]["avg_wait_min"]
        smart_avg = overall["smart_allocation"]["avg_wait_min"]
        expected_reduction = round(((fcfs_avg - smart_avg) / fcfs_avg) * 100.0, 1)

        self.assertEqual(overall["improvement"]["wait_reduction_pct"], expected_reduction)
        self.assertLess(smart_avg, fcfs_avg, "Smart allocation should reduce average wait time on 200 vehicles")
        self.assertNotIn(
            (
                overall["improvement"]["wait_reduction_pct"],
                overall["improvement"]["max_wait_reduction_pct"],
                overall["improvement"]["throughput_gain_pct"],
            ),
            [(46.7, 49.5, 54.2)],
        )

    def test_negative_improvement_when_smart_performs_worse_on_adversarial_stream(self) -> None:
        """
        Verify dynamic improvement calculation supports negative values when an adversarial
        actual_service_min distribution causes smart's diesel-preservation buffer to wait longer
        (proving no target leakage and no floor clamping at 0%).
        """
        single_station = [deepcopy(DEFAULT_STATIONS[0])]  # Station A only
        # Vehicle 1 (petrol_92 car) arrives at t=0.0 on Pump 1 with an unexpectedly tiny actual duration (0.2m)
        # under FCFS or huge actual duration (25.0m) on Pump 1 while Pump 3 is completely empty.
        # Under Smart Allocation, Petrol 92 vehicle 2 arriving at t=0.1 sees Pump 1 has estimated workload ~4.4m
        # and Pump 3 has 0m workload + 3.5m diesel preservation buffer = 3.5m -> goes to Pump 3.
        # Vehicle 3 (petrol_92) arriving at t=0.2 sees Pump 1 (est 4.3m) vs Pump 3 (est 4.4m + 3.5m = 7.9m) ->
        # Smart sends Vehicle 3 to Pump 1 (where Vehicle 1 actually takes 25.0m!), whereas FCFS sends
        # Vehicle 1 -> P1, Vehicle 2 -> P2, Vehicle 3 -> P3 (all 0 wait!).
        adversarial_vehicles = [
            GeneratedVehicle(
                index=1,
                vehicle_id="WP-ADV-1001",
                arrival_time_min=0.0,
                origin_id="kegalle_clock_tower",
                vehicle_type="motorcycle",
                fuel_type="petrol_92",
                estimated_service_min=1.0,
                actual_service_min=20.0,  # Unforeseen stall on Pump 1
                habitual_station_id="A",
            ),
            GeneratedVehicle(
                index=2,
                vehicle_id="WP-ADV-1002",
                arrival_time_min=0.1,
                origin_id="kegalle_clock_tower",
                vehicle_type="lorry",
                fuel_type="petrol_92",
                estimated_service_min=3.0,
                actual_service_min=0.5,  # Finishes much faster than expected on Pump 2
                habitual_station_id="A",
            ),
            GeneratedVehicle(
                index=3,
                vehicle_id="WP-ADV-1003",
                arrival_time_min=0.2,
                origin_id="kegalle_clock_tower",
                vehicle_type="car",
                fuel_type="petrol_92",
                estimated_service_min=2.0,
                actual_service_min=2.0,
                habitual_station_id="A",
            ),
        ]

        fcfs_out = execute_strategy_simulation(
            vehicles=adversarial_vehicles,
            strategy="fcfs",
            stations_config=single_station,
            allow_station_rerouting=False,
        )
        smart_out = execute_strategy_simulation(
            vehicles=adversarial_vehicles,
            strategy="smart",
            stations_config=single_station,
            allow_station_rerouting=False,
        )
        cmp_adv = compare_strategies_service(
            stations_config=single_station,
            allow_station_rerouting=False,
            vehicles_override=adversarial_vehicles,
        )

        # In FCFS, v1->P1, v2->P2, v3->P3 -> 0 wait for all 3!
        # In Smart, v1->P1 (est 1.0m), v2->P2 (est 3.0m), v3 sees P1 (est 0.8m) < P3 (0 + 3.5m diesel buffer) -> v3 joins P1 behind stalled v1!
        self.assertEqual(fcfs_out["system_avg_wait_min"], 0.0)
        self.assertGreater(smart_out["system_avg_wait_min"], 0.0)

        # Also test when FCFS has positive wait (e.g. 1.0m) and Smart has larger wait -> negative wait_reduction_pct
        adversarial_vehicles_2 = [
            GeneratedVehicle(1, "V1", 0.0, "kegalle_clock_tower", "motorcycle", "petrol_92", 1.0, 20.0, "A"),
            GeneratedVehicle(2, "V2", 0.1, "kegalle_clock_tower", "lorry", "petrol_92", 5.0, 2.0, "A"),
            GeneratedVehicle(3, "V3", 0.2, "kegalle_clock_tower", "lorry", "petrol_92", 5.0, 2.0, "A"),
            GeneratedVehicle(4, "V4", 0.3, "kegalle_clock_tower", "car", "petrol_92", 2.0, 2.0, "A"),
        ]
        cmp_adv_2 = compare_strategies_service(
            stations_config=single_station,
            allow_station_rerouting=False,
            vehicles_override=adversarial_vehicles_2,
        )
        self.assertLess(cmp_adv_2["overall"]["improvement"]["wait_reduction_pct"], 0.0)

    def test_recommender_updates_dynamically_with_fuel_location_and_availability(self) -> None:
        """Station recommendation changes based on origin, fuel type, and station stock/pump status."""
        # From Ranwala Junction for petrol_92 -> Station C is closest (3m travel + 6m wait = 9m)
        rec_ranwala_p92 = recommend_station_service(
            location="Ranwala Junction (Valley Link)",
            fuel_type="petrol_92",
            location_id="kegalle_ranwala",
        )
        self.assertEqual(rec_ranwala_p92["best_station_id"], "C")

        # From Ranwala Junction for diesel -> Station C has NO diesel, so must recommend Station A (or B)
        rec_ranwala_diesel = recommend_station_service(
            location="Ranwala Junction (Valley Link)",
            fuel_type="diesel",
            location_id="kegalle_ranwala",
        )
        self.assertNotEqual(rec_ranwala_diesel["best_station_id"], "C")
        self.assertEqual(rec_ranwala_diesel["best_station_id"], "A")

        # For petrol_95 -> Station B has NO petrol_95, so Station B must not be in ranked_stations
        rec_p95 = recommend_station_service(location="Kegalle Bypass Junction", fuel_type="petrol_95")
        eligible_ids = [s["id"] for s in rec_p95["ranked_stations"]]
        self.assertNotIn("B", eligible_ids)

        # Changing vehicle_type updates predicted wait times and total journey times
        rec_moto = recommend_station_service(
            location="Kegalle Town - Clock Tower (Center)",
            fuel_type="petrol_92",
            vehicle_type="motorcycle",
        )
        rec_van = recommend_station_service(
            location="Kegalle Town - Clock Tower (Center)",
            fuel_type="petrol_92",
            vehicle_type="van",
        )
        self.assertNotEqual(
            rec_moto["recommended_station"]["predicted_wait_min"],
            rec_van["recommended_station"]["predicted_wait_min"],
        )


if __name__ == "__main__":
    unittest.main()
