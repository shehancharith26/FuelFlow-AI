"""
Unit tests specifically verifying the Machine Learning model artifact,
target leakage prevention, and SQLite persistence layer.
"""

from pathlib import Path
import unittest
import joblib

from backend.database import (
    init_db,
    save_simulation_summary,
    save_compare_summary,
    get_recent_summaries,
)
from backend.services.predictor import (
    MODEL_PATH,
    RandomForestWaitPredictor,
)


class TestMLModelAndDatabase(unittest.TestCase):
    def setUp(self) -> None:
        self.test_db = Path(__file__).resolve().parent / "test_temp.db"
        if self.test_db.exists():
            try:
                self.test_db.unlink(missing_ok=True)
            except Exception:
                pass

    def tearDown(self) -> None:
        if self.test_db.exists():
            try:
                self.test_db.unlink(missing_ok=True)
            except Exception:
                pass

    def test_model_artifact_exists_and_contains_required_metadata(self) -> None:
        self.assertTrue(MODEL_PATH.exists(), f"Model artifact missing at {MODEL_PATH}")
        artifact = joblib.load(str(MODEL_PATH))

        # Check required metadata
        self.assertIn("pipeline", artifact)
        self.assertIn("metrics", artifact)
        self.assertIn("mae_min", artifact["metrics"])
        self.assertIn("rmse_min", artifact["metrics"])
        self.assertIn("r2_score", artifact["metrics"])
        self.assertIn("disclaimer", artifact)
        self.assertTrue(artifact["is_simulated"])

        # Check metrics thresholds
        mae = artifact["metrics"]["mae_min"]
        rmse = artifact["metrics"]["rmse_min"]
        r2 = artifact["metrics"]["r2_score"]

        self.assertLess(mae, 2.5, f"MAE too high: {mae}")
        self.assertLess(rmse, 4.0, f"RMSE too high: {rmse}")
        self.assertGreater(r2, 0.90, f"R² too low: {r2}")

    def test_target_leakage_prevention(self) -> None:
        artifact = joblib.load(str(MODEL_PATH))
        features = artifact["feature_columns"]

        # Strictly prohibited features that would constitute target leakage
        prohibited = [
            "actual_service_min",
            "service_start_min",
            "service_end_min",
            "served_within_horizon",
            "wait_min",
            "completion_time",
        ]
        for p in prohibited:
            self.assertNotIn(p, features, f"Target leakage detected: {p} in feature columns!")

    def test_predictor_ml_inference(self) -> None:
        predictor = RandomForestWaitPredictor(MODEL_PATH)
        dummy_station = {
            "id": "A",
            "name": "Station A",
            "fuel_availability": {"petrol_92": True, "petrol_95": True, "diesel": True},
            "queue_length": 5,
            "pumps": [
                {"id": 1, "name": "Pump 1", "fuel_types": ["petrol_92", "petrol_95"], "status": "active", "queue_count": 2},
                {"id": 2, "name": "Pump 2", "fuel_types": ["petrol_92", "petrol_95"], "status": "active", "queue_count": 3},
                {"id": 3, "name": "Pump 3", "fuel_types": ["petrol_92", "petrol_95", "diesel"], "status": "active", "queue_count": 0},
            ],
        }

        res = predictor.predict(station=dummy_station, fuel_type="petrol_92", vehicle_type="car")
        self.assertTrue(res["is_trained_ml_model"])
        self.assertEqual(res["prediction_method"], "random_forest_regressor")
        self.assertGreater(res["predicted_wait_min"], 0)
        self.assertTrue(res["eligible"])

    def test_sqlite_database_persistence_and_disclaimer(self) -> None:
        init_db(self.test_db)
        self.assertTrue(self.test_db.exists())

        # Test save simulation summary
        sim_sample = {
            "scenario": "normal",
            "vehicle_count": 200,
            "seed": 42,
            "strategy": "smart",
            "horizon_min": 60.0,
            "results": {
                "vehicles_served": 190,
                "unserved_incompatible_or_no_fuel": 10,
                "system_avg_wait_min": 8.5,
                "system_max_wait_min": 17.2,
                "throughput_per_hr": 82.0,
            },
            "allocation_log": [],
        }
        sim_id = save_simulation_summary(sim_sample, db_path=self.test_db)
        self.assertIsInstance(sim_id, int)
        self.assertGreater(sim_id, 0)

        # Test save compare summary
        cmp_sample = {
            "scenario": "peak",
            "seed": 101,
            "horizon_min": 60.0,
            "overall": {
                "total_vehicles": 200,
                "fixed_fcfs": {"avg_wait_min": 19.5, "max_wait_min": 38.0, "throughput_per_hr": 52.0, "vehicles_served": 160},
                "smart_allocation": {"avg_wait_min": 9.2, "max_wait_min": 18.0, "throughput_per_hr": 84.0, "vehicles_served": 192},
                "improvement": {"wait_reduction_pct": 52.8, "max_wait_reduction_pct": 52.6, "throughput_gain_pct": 61.5, "efficiency_score": 95},
            },
        }
        cmp_id = save_compare_summary(cmp_sample, db_path=self.test_db)
        self.assertIsInstance(cmp_id, int)

        # Retrieve and verify
        summaries = get_recent_summaries(limit=10, db_path=self.test_db)
        self.assertEqual(len(summaries), 2)
        for s in summaries:
            self.assertTrue(s["is_simulated"])
            self.assertIn("SIMULATED DATA", s["disclaimer"])


if __name__ == "__main__":
    unittest.main()
