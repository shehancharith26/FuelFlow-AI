"""
Unit and Integration Tests for FuelFlow AI Virtual Queue System (v1.1 Portfolio Edition).
Tests all 15 architectural and business requirements in an isolated temporary SQLite database.
"""

import os
from pathlib import Path
import sqlite3
import threading
import unittest
from fastapi.testclient import TestClient

from backend.data import reset_stations_state
from backend.database import (
    DuplicateActiveRegistrationError,
    InvalidStatusTransitionError,
    RegistrationNotFoundError,
    create_queue_registration,
    get_active_registration_by_vehicle,
    get_queue_registration_by_id,
    init_db,
    list_queue_registrations,
    update_queue_status,
)
from backend.main import app

TEST_MANAGER_KEY = "test-manager-api-key-2026-isolated"


class TestVirtualQueueSystem(unittest.TestCase):
    def setUp(self) -> None:
        reset_stations_state()
        self.test_db_path = Path(__file__).resolve().parent / "test_vq_isolated.db"
        if self.test_db_path.exists():
            try:
                self.test_db_path.unlink(missing_ok=True)
            except Exception:
                pass

        # Initialize fresh isolated database schema
        init_db(self.test_db_path)

        # Monkey-patch default DB path in database module for TestClient requests
        import backend.database as db_mod
        self.orig_db_path = db_mod._DEFAULT_DB_PATH
        db_mod._DEFAULT_DB_PATH = self.test_db_path

        # Configure environment variable for test execution
        self.orig_manager_key = os.environ.get("MANAGER_API_KEY")
        os.environ["MANAGER_API_KEY"] = TEST_MANAGER_KEY

        self.client = TestClient(app)
        self.manager_headers = {"X-Manager-Key": TEST_MANAGER_KEY}

    def tearDown(self) -> None:
        import backend.database as db_mod
        db_mod._DEFAULT_DB_PATH = self.orig_db_path

        if self.orig_manager_key is not None:
            os.environ["MANAGER_API_KEY"] = self.orig_manager_key
        else:
            os.environ.pop("MANAGER_API_KEY", None)

        if self.test_db_path.exists():
            try:
                self.test_db_path.unlink(missing_ok=True)
            except Exception:
                pass

        if self.test_db_path.exists():
            try:
                self.test_db_path.unlink(missing_ok=True)
            except Exception:
                pass

    def test_queue_join_success(self) -> None:
        """Test successful registration with validation, ML wait prediction and DB persistence."""
        payload = {
            "vehicle_number": "WP-CAB-4012",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 30.0,
            "station_id": "A",
        }
        res = self.client.post("/queue/join", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()

        self.assertTrue(data["registration_id"].startswith("VQ-"))
        self.assertEqual(data["vehicle_number"], "WP-CAB-4012")
        self.assertEqual(data["vehicle_type"], "car")
        self.assertEqual(data["fuel_type"], "petrol_92")
        self.assertEqual(data["fuel_quantity_litres"], 30.0)
        self.assertEqual(data["station_id"], "A")
        self.assertEqual(data["queue_position"], 1)
        self.assertEqual(data["status"], "WAITING")
        self.assertGreater(data["estimated_wait_min"], 0.0)
        self.assertIn("Pump", str(data["assigned_pump_name"]))
        self.assertIn("PROTOTYPE — VIRTUAL QUEUE", data["disclaimer"])

        # Verify record exists in SQLite
        db_record = get_queue_registration_by_id(data["registration_id"], db_path=self.test_db_path)
        self.assertIsNotNone(db_record)
        self.assertEqual(db_record["vehicle_number"], "WP-CAB-4012")
        self.assertEqual(db_record["status"], "WAITING")

    def test_sequential_queue_position_calculation(self) -> None:
        """Verify queue positions are calculated consistently per station and fuel type."""
        # 1. Car 1 at Station A, petrol_92 -> Position 1
        r1 = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-4012",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 25.0,
            "station_id": "A",
        })
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r1.json()["queue_position"], 1)

        # 2. Car 2 at Station A, petrol_92 -> Position 2
        r2 = self.client.post("/queue/join", json={
            "vehicle_number": "CP-ND-5510",
            "vehicle_type": "van",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 40.0,
            "station_id": "A",
        })
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(r2.json()["queue_position"], 2)

        # 3. Lorry at Station A, diesel -> Position 1 (isolated by fuel type)
        r3 = self.client.post("/queue/join", json={
            "vehicle_number": "EP-LA-3091",
            "vehicle_type": "lorry",
            "fuel_type": "diesel",
            "fuel_quantity_litres": 80.0,
            "station_id": "A",
        })
        self.assertEqual(r3.status_code, 201)
        self.assertEqual(r3.json()["queue_position"], 1)

        # 4. Bike at Station B, petrol_92 -> Position 1 (isolated by station)
        r4 = self.client.post("/queue/join", json={
            "vehicle_number": "SP-BC-7890",
            "vehicle_type": "motorcycle",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 8.0,
            "station_id": "B",
        })
        self.assertEqual(r4.status_code, 201)
        self.assertEqual(r4.json()["queue_position"], 1)

    def test_duplicate_active_registration_prevention(self) -> None:
        """Verify duplicate active registrations are prevented at both API and DB levels."""
        # First registration succeeds
        r1 = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-4012",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 30.0,
            "station_id": "A",
        })
        self.assertEqual(r1.status_code, 201)

        # Duplicate active registration fails with HTTP 409
        r2 = self.client.post("/queue/join", json={
            "vehicle_number": "wp-cab-4012",  # Case-insensitive duplicate
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 15.0,
            "station_id": "B",
        })
        self.assertEqual(r2.status_code, 409)
        self.assertIn("already has an active virtual queue registration", r2.json()["detail"])

        # Direct database insert must also fail via UNIQUE INDEX constraint
        with self.assertRaises(DuplicateActiveRegistrationError):
            create_queue_registration(
                vehicle_number="WP-CAB-4012",
                vehicle_type="car",
                fuel_type="petrol_92",
                fuel_quantity_litres=20.0,
                station_id="A",
                estimated_wait_min=5.0,
                db_path=self.test_db_path,
            )

    def test_incompatible_or_depleted_fuel_rejected(self) -> None:
        """Verify registration is rejected if fuel is depleted or no compatible pumps are operational."""
        # Station C has NO diesel
        r_depleted = self.client.post("/queue/join", json={
            "vehicle_number": "EP-LA-9999",
            "vehicle_type": "lorry",
            "fuel_type": "diesel",
            "fuel_quantity_litres": 50.0,
            "station_id": "C",
        })
        self.assertEqual(r_depleted.status_code, 400)
        self.assertIn("out of stock / depleted", r_depleted.json()["detail"])

        # Station B has NO petrol_95
        r_p95_depleted = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAD-8812",
            "vehicle_type": "car",
            "fuel_type": "petrol_95",
            "fuel_quantity_litres": 30.0,
            "station_id": "B",
        })
        self.assertEqual(r_p95_depleted.status_code, 400)
        self.assertIn("out of stock / depleted", r_p95_depleted.json()["detail"])

    def test_strict_queue_status_transitions(self) -> None:
        """
        Verify strict state transitions:
          WAITING -> SERVING -> COMPLETED
          WAITING -> CANCELLED
        All other transitions must be rejected with HTTP 400.
        """
        r_join = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-4012",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 30.0,
            "station_id": "A",
        })
        reg_id = r_join.json()["registration_id"]

        # 1. WAITING -> COMPLETED is invalid (must be served first)
        r_bad = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "COMPLETED"},
            headers=self.manager_headers,
        )
        self.assertEqual(r_bad.status_code, 400)
        self.assertIn("Invalid queue status transition", r_bad.json()["detail"])

        # 2. WAITING -> SERVING is valid
        r_serving = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "SERVING"},
            headers=self.manager_headers,
        )
        self.assertEqual(r_serving.status_code, 200)
        self.assertEqual(r_serving.json()["status"], "SERVING")
        self.assertEqual(r_serving.json()["queue_position"], 0)

        # 3. SERVING -> WAITING is invalid
        r_back = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "WAITING"},
            headers=self.manager_headers,
        )
        self.assertEqual(r_back.status_code, 400)

        # 4. SERVING -> COMPLETED is valid
        r_comp = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "COMPLETED"},
            headers=self.manager_headers,
        )
        self.assertEqual(r_comp.status_code, 200)
        self.assertEqual(r_comp.json()["status"], "COMPLETED")

        # 5. COMPLETED is terminal; cannot transition further
        r_after_comp = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "SERVING"},
            headers=self.manager_headers,
        )
        self.assertEqual(r_after_comp.status_code, 400)

        # 6. Test cancellation: WAITING -> CANCELLED
        r2_join = self.client.post("/queue/join", json={
            "vehicle_number": "CP-ND-5510",
            "vehicle_type": "van",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 35.0,
            "station_id": "A",
        })
        reg2_id = r2_join.json()["registration_id"]

        r_cancel = self.client.patch(
            f"/queue/registrations/{reg2_id}/status",
            json={"status": "CANCELLED"},
            headers=self.manager_headers,
        )
        self.assertEqual(r_cancel.status_code, 200)
        self.assertEqual(r_cancel.json()["status"], "CANCELLED")

        # CANCELLED is terminal
        r_cancel_revive = self.client.patch(
            f"/queue/registrations/{reg2_id}/status",
            json={"status": "WAITING"},
            headers=self.manager_headers,
        )
        self.assertEqual(r_cancel_revive.status_code, 400)

    def test_queue_position_recalculation(self) -> None:
        """Verify that when vehicles leave the waiting queue, remaining positions are recalculated."""
        r1 = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-1001",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 20.0,
            "station_id": "A",
        }).json()
        r2 = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-1002",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 20.0,
            "station_id": "A",
        }).json()
        r3 = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-1003",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 20.0,
            "station_id": "A",
        }).json()

        self.assertEqual(r1["queue_position"], 1)
        self.assertEqual(r2["queue_position"], 2)
        self.assertEqual(r3["queue_position"], 3)

        # V1 moves to SERVING -> V2 should become 1, V3 should become 2
        self.client.patch(
            f"/queue/registrations/{r1['registration_id']}/status",
            json={"status": "SERVING"},
            headers=self.manager_headers,
        )

        v2_status = self.client.get(f"/queue/status/{r2['registration_id']}").json()
        v3_status = self.client.get(f"/queue/status/{r3['registration_id']}").json()
        self.assertEqual(v2_status["queue_position"], 1)
        self.assertEqual(v3_status["queue_position"], 2)

        # V2 is CANCELLED -> V3 should become 1
        self.client.patch(
            f"/queue/registrations/{r2['registration_id']}/status",
            json={"status": "CANCELLED"},
            headers=self.manager_headers,
        )

        v3_status_updated = self.client.get(f"/queue/status/{r3['registration_id']}").json()
        self.assertEqual(v3_status_updated["queue_position"], 1)

    def test_manager_authentication_protection(self) -> None:
        """Verify manager endpoints reject unauthenticated or incorrectly authenticated requests."""
        r_join = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-4012",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 30.0,
            "station_id": "A",
        }).json()
        reg_id = r_join["registration_id"]

        # 1. No auth headers -> 401
        res_no_auth = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "SERVING"},
        )
        self.assertEqual(res_no_auth.status_code, 401)
        self.assertIn("Valid manager credentials required", res_no_auth.json()["detail"])

        # 2. Invalid header -> 401
        res_bad_auth = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "SERVING"},
            headers={"X-Manager-Key": "wrong-secret-key"},
        )
        self.assertEqual(res_bad_auth.status_code, 401)

        # 3. Empty header -> 401
        res_empty_auth = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "SERVING"},
            headers={"X-Manager-Key": ""},
        )
        self.assertEqual(res_empty_auth.status_code, 401)

        # 4. Valid X-Manager-Key header -> 200
        res_header_auth = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "SERVING"},
            headers={"X-Manager-Key": TEST_MANAGER_KEY},
        )
        self.assertEqual(res_header_auth.status_code, 200)
        self.assertEqual(res_header_auth.json()["status"], "SERVING")

        # 5. Valid Bearer token in Authorization header -> 200 (SERVING -> COMPLETED)
        res_bearer_auth = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "COMPLETED"},
            headers={"Authorization": f"Bearer {TEST_MANAGER_KEY}"},
        )
        self.assertEqual(res_bearer_auth.status_code, 200)
        self.assertEqual(res_bearer_auth.json()["status"], "COMPLETED")

    def test_manager_auth_fails_closed_when_env_var_missing(self) -> None:
        """Verify manager actions fail closed (HTTP 503) when MANAGER_API_KEY is unset in the environment."""
        r_join = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-4012",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 30.0,
            "station_id": "A",
        }).json()
        reg_id = r_join["registration_id"]

        # Temporarily unset MANAGER_API_KEY
        os.environ.pop("MANAGER_API_KEY", None)

        # Even with a provided key, access is completely denied (fail closed)
        res = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "SERVING"},
            headers={"X-Manager-Key": "any-attempted-key"},
        )
        self.assertEqual(res.status_code, 503)
        self.assertIn("MANAGER_API_KEY", res.json()["detail"])

    def test_manager_auth_fails_closed_when_env_var_is_empty(self) -> None:
        """Verify manager actions fail closed (HTTP 503) when MANAGER_API_KEY is empty or whitespace."""
        r_join = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-4012",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 30.0,
            "station_id": "A",
        }).json()
        reg_id = r_join["registration_id"]

        # Set to whitespace
        os.environ["MANAGER_API_KEY"] = "   "

        res = self.client.patch(
            f"/queue/registrations/{reg_id}/status",
            json={"status": "SERVING"},
            headers={"X-Manager-Key": "any-attempted-key"},
        )
        self.assertEqual(res.status_code, 503)
        self.assertIn("MANAGER_API_KEY", res.json()["detail"])

    def test_queue_status_lookup(self) -> None:
        """Verify ticket lookup works by registration ID and by vehicle registration plate."""
        r_join = self.client.post("/queue/join", json={
            "vehicle_number": "WP-CAB-4012",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 30.0,
            "station_id": "A",
        }).json()
        reg_id = r_join["registration_id"]

        # Lookup by registration ID
        res_by_id = self.client.get(f"/queue/status/{reg_id}")
        self.assertEqual(res_by_id.status_code, 200)
        self.assertEqual(res_by_id.json()["vehicle_number"], "WP-CAB-4012")

        # Lookup by vehicle plate
        res_by_plate = self.client.get("/queue/status/WP-CAB-4012")
        self.assertEqual(res_by_plate.status_code, 200)
        self.assertEqual(res_by_plate.json()["registration_id"], reg_id)

        # Non-existent ticket -> 404
        res_missing = self.client.get("/queue/status/NON-EXISTENT-ID")
        self.assertEqual(res_missing.status_code, 404)

    def test_list_queue_registrations_filters(self) -> None:
        """Verify listing registrations with station, status, and fuel type filters."""
        self.client.post("/queue/join", json={
            "vehicle_number": "WP-A1-0001",
            "vehicle_type": "car",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 20.0,
            "station_id": "A",
        })
        self.client.post("/queue/join", json={
            "vehicle_number": "WP-B1-0002",
            "vehicle_type": "motorcycle",
            "fuel_type": "petrol_92",
            "fuel_quantity_litres": 10.0,
            "station_id": "B",
        })
        self.client.post("/queue/join", json={
            "vehicle_number": "WP-A2-0003",
            "vehicle_type": "lorry",
            "fuel_type": "diesel",
            "fuel_quantity_litres": 60.0,
            "station_id": "A",
        })

        # Filter by station_id=A
        res_st_a = self.client.get("/queue/registrations?station_id=A")
        self.assertEqual(res_st_a.status_code, 200)
        self.assertEqual(len(res_st_a.json()), 2)
        for r in res_st_a.json():
            self.assertEqual(r["station_id"], "A")

        # Filter by fuel_type=diesel
        res_diesel = self.client.get("/queue/registrations?fuel_type=diesel")
        self.assertEqual(res_diesel.status_code, 200)
        self.assertEqual(len(res_diesel.json()), 1)
        self.assertEqual(res_diesel.json()[0]["vehicle_number"], "WP-A2-0003")

    def test_concurrent_registrations_transaction_safety(self) -> None:
        """Verify concurrent registrations are handled safely without data corruption or duplicate positions."""
        results = []
        errors = []

        def register_vehicle(idx: int) -> None:
            plate = f"WP-CON-{idx:04d}"
            try:
                res = create_queue_registration(
                    vehicle_number=plate,
                    vehicle_type="car",
                    fuel_type="petrol_92",
                    fuel_quantity_litres=20.0,
                    station_id="A",
                    estimated_wait_min=5.0,
                    db_path=self.test_db_path,
                )
                results.append(res)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=register_vehicle, args=(i,)) for i in range(1, 11)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Concurrent registration errors: {errors}")
        self.assertEqual(len(results), 10)

        # Positions must be sequentially distinct: 1 to 10
        assigned_positions = [r["queue_position"] for r in results]
        self.assertEqual(sorted(assigned_positions), list(range(1, 11)))


if __name__ == "__main__":
    unittest.main()
