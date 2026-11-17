"""
FastAPI endpoint integration tests using Starlette/FastAPI TestClient.
Verifies exact contract compatibility with the React frontend (frontend/src/services/api.js).
"""

import unittest
from fastapi.testclient import TestClient

from backend.data import reset_stations_state
from backend.main import app


class TestFastAPIEndpoints(unittest.TestCase):
    def setUp(self) -> None:
        reset_stations_state()
        self.client = TestClient(app)

    def test_get_health(self) -> None:
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["stations_count"], 3)
        self.assertEqual(data["pumps_total"], 9)

    def test_get_stations_matches_frontend_contract(self) -> None:
        res = self.client.get("/stations")
        self.assertEqual(res.status_code, 200)
        stations = res.json()
        self.assertEqual(len(stations), 3)

        for st in stations:
            # Exact checks from frontend validateStationObject(st)
            self.assertIsInstance(st["id"], str)
            self.assertIsInstance(st["name"], str)
            self.assertIsInstance(st["distance_km"], (int, float))
            self.assertIsInstance(st["travel_time_min"], (int, float))
            self.assertIsInstance(st["fuel_availability"]["petrol_92"], bool)
            self.assertIsInstance(st["fuel_availability"]["petrol_95"], bool)
            self.assertIsInstance(st["fuel_availability"]["diesel"], bool)
            self.assertIsInstance(st["queue_length"], int)
            self.assertIsInstance(st["predicted_wait_min"], (int, float))
            self.assertIsInstance(st["pumps"], list)
            self.assertEqual(len(st["pumps"]), 3)

    def test_post_recommend_valid_and_filtering(self) -> None:
        res = self.client.post(
            "/recommend",
            json={"location": "Kegalle Town - Clock Tower (Center)", "fuel_type": "diesel"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNotNone(data["recommended_station"])
        self.assertIn(data["recommended_station"]["id"], ["A", "B"])
        self.assertTrue(data["recommended_station"]["has_requested_fuel"])
        self.assertTrue(data["recommended_station"]["has_compatible_pump"])
        self.assertEqual(len(data["all_stations"]), 3)
        # Station C has no diesel, so it must not be in ranked_stations
        ranked_ids = [s["id"] for s in data["ranked_stations"]]
        self.assertNotIn("C", ranked_ids)

    def test_post_predict_deterministic_and_no_fuel_handling(self) -> None:
        res = self.client.post(
            "/predict",
            json={
                "station_id": "A",
                "fuel_type": "petrol_92",
                "vehicle_type": "car",
                "queue_length": 6,
                "active_compatible_pumps": 3,
                "estimated_service_min": 4.5,
                "workload_min": 27.0,
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["station_id"], "A")
        self.assertIsInstance(data["predicted_wait_min"], (int, float))
        self.assertFalse(data["is_trained_ml_model"])
        self.assertEqual(data["prediction_method"], "deterministic_queue_workload_estimator")
        self.assertTrue(data["eligible"])
        self.assertIn(data["recommended_pump"], ["Pump 1", "Pump 2", "Pump 3"])

        # Test no-fuel station (Station C for diesel)
        res_no_fuel = self.client.post(
            "/predict",
            json={
                "station_id": "C",
                "fuel_type": "diesel",
                "vehicle_type": "lorry",
            },
        )
        self.assertEqual(res_no_fuel.status_code, 200)
        nf_data = res_no_fuel.json()
        self.assertFalse(nf_data["eligible"])
        self.assertIsNone(nf_data["recommended_pump"])

    def test_post_simulate_and_compare_endpoints(self) -> None:
        sim_res = self.client.post(
            "/simulate",
            json={"vehicle_count": 200, "scenario": "normal", "seed": 42},
        )
        self.assertEqual(sim_res.status_code, 200)
        sim_data = sim_res.json()
        self.assertEqual(sim_data["vehicle_count"], 200)
        self.assertIn("A", sim_data["results"]["station_metrics"])
        self.assertIn("B", sim_data["results"]["station_metrics"])
        self.assertIn("C", sim_data["results"]["station_metrics"])

        cmp_res = self.client.post(
            "/compare",
            json={"vehicle_count": 200, "seed": 42},
        )
        self.assertEqual(cmp_res.status_code, 200)
        cmp_data = cmp_res.json()
        self.assertIn("overall", cmp_data)
        self.assertIn("fixed_fcfs", cmp_data["overall"])
        self.assertIn("smart_allocation", cmp_data["overall"])
        self.assertIn("improvement", cmp_data["overall"])
        self.assertEqual(len(cmp_data["station_breakdown"]), 3)
        self.assertEqual(len(cmp_data["timeline_chart"]), 6)
        self.assertEqual(len(cmp_data["pump_utilization_chart"]), 3)

    def test_invalid_inputs_return_422(self) -> None:
        # Invalid fuel type
        r1 = self.client.post("/recommend", json={"location": "Kegalle", "fuel_type": "jet_fuel"})
        self.assertEqual(r1.status_code, 422)

        # Invalid station ID
        r2 = self.client.post("/predict", json={"station_id": "Z", "fuel_type": "petrol_92"})
        self.assertEqual(r2.status_code, 422)

        # Negative vehicle count
        r3 = self.client.post("/simulate", json={"vehicle_count": -10, "scenario": "normal", "seed": 42})
        self.assertEqual(r3.status_code, 422)

    def test_cors_headers_for_vite_ports(self) -> None:
        for port in (5173, 5174, 5175):
            origin = f"http://localhost:{port}"
            res = self.client.options(
                "/recommend",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                },
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.headers.get("access-control-allow-origin"), origin)


if __name__ == "__main__":
    unittest.main()
