"""
SQLite Storage Layer for FuelFlow AI Prototype Simulation Summaries.

NOTICE:
PROTOTYPE — SIMULATED DATA.
All simulation runs recorded here represent synthetic discrete-event queue scenarios
for the BuildX 0.1 hackathon demonstration.
"""

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sqlite3
from typing import Any, Dict, Generator, List, Optional

logger = logging.getLogger("fuelflow.database")

_DEFAULT_DB_PATH = Path(__file__).resolve().parent / "fuelflow.db"
_SIMULATED_DATA_DISCLAIMER = (
    "PROTOTYPE — SIMULATED DATA. All simulation summaries recorded in this database "
    "are synthetic discrete-event simulations for the Kegalle corridor prototype."
)


@contextmanager
def db_session(db_path: Optional[Path] = None) -> Generator[sqlite3.Connection, None, None]:
    """Context manager that opens, commits, and explicitly closes SQLite connection."""
    path = db_path or _DEFAULT_DB_PATH
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: Optional[Path] = None) -> None:
    """Initialize SQLite database schema for simulation summaries."""
    path = db_path or _DEFAULT_DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)

    with db_session(path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS simulation_summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                run_type TEXT NOT NULL,
                vehicle_count INTEGER NOT NULL,
                scenario TEXT NOT NULL,
                seed INTEGER NOT NULL,
                strategy TEXT,
                horizon_min REAL,
                vehicles_served INTEGER,
                vehicles_unserved INTEGER DEFAULT 0,
                system_avg_wait_min REAL,
                system_max_wait_min REAL,
                throughput_per_hr REAL,
                summary_json TEXT NOT NULL,
                is_simulated INTEGER DEFAULT 1,
                disclaimer TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_sim_created_at
            ON simulation_summaries(created_at DESC)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_sim_run_type
            ON simulation_summaries(run_type)
            """
        )
    logger.info("FuelFlow SQLite database initialized at %s", path)


def save_simulation_summary(
    result: Dict[str, Any],
    db_path: Optional[Path] = None,
) -> int:
    """
    Save execution results from POST /simulate into SQLite.
    Returns the newly inserted row ID.
    """
    path = db_path or _DEFAULT_DB_PATH
    init_db(path)

    results_data = result.get("results", {})
    now_iso = datetime.now(timezone.utc).isoformat()

    summary_payload = {
        "scenario": result.get("scenario"),
        "vehicle_count": result.get("vehicle_count"),
        "seed": result.get("seed"),
        "strategy": result.get("strategy"),
        "horizon_min": result.get("horizon_min"),
        "results": results_data,
        "recent_allocation_sample": result.get("allocation_log", [])[:5],
    }

    with db_session(path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO simulation_summaries (
                created_at,
                run_type,
                vehicle_count,
                scenario,
                seed,
                strategy,
                horizon_min,
                vehicles_served,
                vehicles_unserved,
                system_avg_wait_min,
                system_max_wait_min,
                throughput_per_hr,
                summary_json,
                is_simulated,
                disclaimer
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (
                now_iso,
                "simulate",
                int(result.get("vehicle_count", 0)),
                str(result.get("scenario", "normal")),
                int(result.get("seed", 42)),
                str(result.get("strategy", "smart")),
                float(result.get("horizon_min", 60.0)),
                int(results_data.get("vehicles_served", 0)),
                int(results_data.get("unserved_incompatible_or_no_fuel", 0)),
                float(results_data.get("system_avg_wait_min", 0.0)),
                float(results_data.get("system_max_wait_min", 0.0)),
                float(results_data.get("throughput_per_hr", 0.0)),
                json.dumps(summary_payload),
                _SIMULATED_DATA_DISCLAIMER,
            ),
        )
        return int(cursor.lastrowid)


def save_compare_summary(
    result: Dict[str, Any],
    db_path: Optional[Path] = None,
) -> int:
    """
    Save execution results from POST /compare into SQLite.
    Returns the newly inserted row ID.
    """
    path = db_path or _DEFAULT_DB_PATH
    init_db(path)

    overall = result.get("overall", {})
    smart = overall.get("smart_allocation", {})
    now_iso = datetime.now(timezone.utc).isoformat()

    summary_payload = {
        "scenario": result.get("scenario"),
        "seed": result.get("seed"),
        "horizon_min": result.get("horizon_min"),
        "overall": overall,
        "station_breakdown": result.get("station_breakdown", []),
        "timeline_chart": result.get("timeline_chart", []),
        "pump_utilization_chart": result.get("pump_utilization_chart", []),
        "recent_allocation_sample": result.get("allocation_log", [])[:5],
    }

    with db_session(path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO simulation_summaries (
                created_at,
                run_type,
                vehicle_count,
                scenario,
                seed,
                strategy,
                horizon_min,
                vehicles_served,
                vehicles_unserved,
                system_avg_wait_min,
                system_max_wait_min,
                throughput_per_hr,
                summary_json,
                is_simulated,
                disclaimer
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (
                now_iso,
                "compare",
                int(overall.get("total_vehicles", 200)),
                str(result.get("scenario", "normal")),
                int(result.get("seed", 42)),
                "compare_fcfs_vs_smart",
                float(result.get("horizon_min", 60.0)),
                int(smart.get("vehicles_served", 0)),
                0,
                float(smart.get("avg_wait_min", 0.0)),
                float(smart.get("max_wait_min", 0.0)),
                float(smart.get("throughput_per_hr", 0.0)),
                json.dumps(summary_payload),
                _SIMULATED_DATA_DISCLAIMER,
            ),
        )
        return int(cursor.lastrowid)


def get_recent_summaries(
    limit: int = 20,
    run_type: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Retrieve recent simulation run summaries from SQLite."""
    path = db_path or _DEFAULT_DB_PATH
    init_db(path)

    query = (
        "SELECT * FROM simulation_summaries "
        + ("WHERE run_type = ? " if run_type else "")
        + "ORDER BY id DESC LIMIT ?"
    )
    params = (run_type, limit) if run_type else (limit,)

    with db_session(path) as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()

        results = []
        for row in rows:
            results.append(
                {
                    "id": row["id"],
                    "created_at": row["created_at"],
                    "run_type": row["run_type"],
                    "vehicle_count": row["vehicle_count"],
                    "scenario": row["scenario"],
                    "seed": row["seed"],
                    "strategy": row["strategy"],
                    "horizon_min": row["horizon_min"],
                    "vehicles_served": row["vehicles_served"],
                    "system_avg_wait_min": row["system_avg_wait_min"],
                    "system_max_wait_min": row["system_max_wait_min"],
                    "throughput_per_hr": row["throughput_per_hr"],
                    "summary": json.loads(row["summary_json"]),
                    "is_simulated": bool(row["is_simulated"]),
                    "disclaimer": row["disclaimer"],
                }
            )
        return results
