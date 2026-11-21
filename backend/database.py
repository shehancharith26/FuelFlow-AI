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
import uuid

logger = logging.getLogger("fuelflow.database")

_DEFAULT_DB_PATH = Path(__file__).resolve().parent / "fuelflow.db"
_SIMULATED_DATA_DISCLAIMER = (
    "PROTOTYPE — SIMULATED DATA. All simulation summaries recorded in this database "
    "are synthetic discrete-event simulations for the Kegalle corridor prototype."
)
_VIRTUAL_QUEUE_DISCLAIMER = (
    "PROTOTYPE — VIRTUAL QUEUE SIMULATION. This registration generates an estimated queue position "
    "and wait forecast for the fictional Kegalle corridor prototype. It does not reserve a physical bay at a real filling station."
)


class DuplicateActiveRegistrationError(Exception):
    """Raised when a vehicle already has an active registration ('WAITING' or 'SERVING')."""
    pass


class InvalidStatusTransitionError(Exception):
    """Raised when an invalid queue status transition is attempted."""
    pass


class RegistrationNotFoundError(Exception):
    """Raised when a queue registration ID is not found."""
    pass


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
    """
    Initialize SQLite database schema for simulation summaries and virtual queue registrations.
    Safe and additive: preserves all existing tables and data.
    """
    path = db_path or _DEFAULT_DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)

    with db_session(path) as conn:
        cursor = conn.cursor()
        # 1. Existing Hackathon Simulation Summaries Table (Preserved Intact)
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

        # 2. Virtual Queue Registrations Table (New for v1.1 Portfolio Edition)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS virtual_queue_registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_id TEXT UNIQUE NOT NULL,
                vehicle_number TEXT NOT NULL,
                vehicle_type TEXT NOT NULL,
                fuel_type TEXT NOT NULL,
                fuel_quantity_litres REAL NOT NULL,
                station_id TEXT NOT NULL,
                queue_position INTEGER NOT NULL,
                estimated_wait_min REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'SERVING', 'COMPLETED', 'CANCELLED')),
                assigned_pump_id INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_simulated INTEGER DEFAULT 1,
                disclaimer TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_vq_station_fuel_status
            ON virtual_queue_registrations(station_id, fuel_type, status)
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_vq_created_at
            ON virtual_queue_registrations(created_at DESC)
            """
        )
        # Database-level constraint: prevent duplicate active registrations ('WAITING' or 'SERVING')
        cursor.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_vq_active_vehicle
            ON virtual_queue_registrations(vehicle_number)
            WHERE status IN ('WAITING', 'SERVING')
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


# -----------------------------------------------------------------------------
# Virtual Queue Registrations (v1.1 Portfolio Edition)
# -----------------------------------------------------------------------------

def _row_to_queue_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Helper to convert a sqlite3.Row for virtual_queue_registrations into a dict."""
    return {
        "id": row["id"],
        "registration_id": row["registration_id"],
        "vehicle_number": row["vehicle_number"],
        "vehicle_type": row["vehicle_type"],
        "fuel_type": row["fuel_type"],
        "fuel_quantity_litres": float(row["fuel_quantity_litres"]),
        "station_id": row["station_id"],
        "queue_position": int(row["queue_position"]),
        "estimated_wait_min": float(row["estimated_wait_min"]),
        "status": row["status"],
        "assigned_pump_id": int(row["assigned_pump_id"]) if row["assigned_pump_id"] is not None else None,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "is_simulated": bool(row["is_simulated"]),
        "disclaimer": row["disclaimer"],
    }


def create_queue_registration(
    vehicle_number: str,
    vehicle_type: str,
    fuel_type: str,
    fuel_quantity_litres: float,
    station_id: str,
    estimated_wait_min: float,
    assigned_pump_id: Optional[int] = None,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Create a new driver virtual queue registration using SQLite transaction locking.
    Enforces active duplicate prevention at both application and database constraint levels.
    Calculates sequential queue position per station and fuel type.
    """
    path = db_path or _DEFAULT_DB_PATH
    init_db(path)

    clean_plate = vehicle_number.strip().upper()
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    reg_id = f"VQ-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    with db_session(path) as conn:
        cursor = conn.cursor()
        # Immediate exclusive lock to protect against race conditions in concurrent registration
        cursor.execute("BEGIN IMMEDIATE")

        # 1. Application-level active duplicate check
        cursor.execute(
            """
            SELECT registration_id, status FROM virtual_queue_registrations
            WHERE vehicle_number = ? AND status IN ('WAITING', 'SERVING')
            LIMIT 1
            """,
            (clean_plate,),
        )
        existing = cursor.fetchone()
        if existing:
            raise DuplicateActiveRegistrationError(
                f"Vehicle '{clean_plate}' already has an active virtual queue registration "
                f"({existing['registration_id']}, status: {existing['status']})."
            )

        # 2. Compute queue position among active WAITING vehicles for this station and fuel type
        cursor.execute(
            """
            SELECT COUNT(*) AS wait_count FROM virtual_queue_registrations
            WHERE station_id = ? AND fuel_type = ? AND status = 'WAITING'
            """,
            (station_id, fuel_type),
        )
        wait_row = cursor.fetchone()
        queue_pos = int(wait_row["wait_count"] if wait_row else 0) + 1

        # 3. Database insert (guarded by UNIQUE INDEX idx_vq_active_vehicle)
        try:
            cursor.execute(
                """
                INSERT INTO virtual_queue_registrations (
                    registration_id,
                    vehicle_number,
                    vehicle_type,
                    fuel_type,
                    fuel_quantity_litres,
                    station_id,
                    queue_position,
                    estimated_wait_min,
                    status,
                    assigned_pump_id,
                    created_at,
                    updated_at,
                    is_simulated,
                    disclaimer
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'WAITING', ?, ?, ?, 1, ?)
                """,
                (
                    reg_id,
                    clean_plate,
                    vehicle_type,
                    fuel_type,
                    float(fuel_quantity_litres),
                    station_id,
                    queue_pos,
                    float(estimated_wait_min),
                    assigned_pump_id,
                    now_iso,
                    now_iso,
                    _VIRTUAL_QUEUE_DISCLAIMER,
                ),
            )
        except sqlite3.IntegrityError as exc:
            if "idx_vq_active_vehicle" in str(exc) or "UNIQUE" in str(exc).upper():
                raise DuplicateActiveRegistrationError(
                    f"Vehicle '{clean_plate}' already has an active virtual queue registration."
                ) from exc
            raise

        cursor.execute(
            "SELECT * FROM virtual_queue_registrations WHERE registration_id = ?",
            (reg_id,),
        )
        row = cursor.fetchone()
        assert row is not None
        return _row_to_queue_dict(row)


def get_queue_registration_by_id(
    registration_id: str,
    db_path: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    """Retrieve virtual queue registration by its unique registration_id."""
    path = db_path or _DEFAULT_DB_PATH
    init_db(path)

    with db_session(path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM virtual_queue_registrations WHERE registration_id = ?",
            (registration_id.strip().upper(),),
        )
        row = cursor.fetchone()
        return _row_to_queue_dict(row) if row else None


def get_active_registration_by_vehicle(
    vehicle_number: str,
    db_path: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    """Retrieve currently active ('WAITING' or 'SERVING') registration for a vehicle plate."""
    path = db_path or _DEFAULT_DB_PATH
    init_db(path)

    clean_plate = vehicle_number.strip().upper()
    with db_session(path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM virtual_queue_registrations
            WHERE vehicle_number = ? AND status IN ('WAITING', 'SERVING')
            ORDER BY id DESC LIMIT 1
            """,
            (clean_plate,),
        )
        row = cursor.fetchone()
        return _row_to_queue_dict(row) if row else None


def list_queue_registrations(
    station_id: Optional[str] = None,
    status: Optional[str] = None,
    fuel_type: Optional[str] = None,
    limit: int = 100,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """List virtual queue registrations with optional filters."""
    path = db_path or _DEFAULT_DB_PATH
    init_db(path)

    clauses: List[str] = []
    params: List[Any] = []

    if station_id:
        clauses.append("station_id = ?")
        params.append(station_id.strip().upper())
    if status:
        clauses.append("status = ?")
        params.append(status.strip().upper())
    if fuel_type:
        clauses.append("fuel_type = ?")
        params.append(fuel_type.strip().lower())

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    query = f"""
        SELECT * FROM virtual_queue_registrations
        {where_sql}
        ORDER BY 
            CASE status 
                WHEN 'WAITING' THEN 1 
                WHEN 'SERVING' THEN 2 
                ELSE 3 
            END ASC,
            queue_position ASC,
            created_at DESC
        LIMIT ?
    """
    params.append(max(1, min(limit, 500)))

    with db_session(path) as conn:
        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        return [_row_to_queue_dict(r) for r in rows]


def update_queue_status(
    registration_id: str,
    new_status: str,
    db_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Safely transition a queue registration status following strict state machine rules:
      WAITING -> SERVING -> COMPLETED
      WAITING -> CANCELLED
    Automatically recalculates queue positions for all remaining WAITING vehicles at that station/fuel.
    """
    path = db_path or _DEFAULT_DB_PATH
    init_db(path)

    target_status = new_status.strip().upper()
    now_iso = datetime.now(timezone.utc).isoformat()

    allowed_transitions = {
        "WAITING": ["SERVING", "CANCELLED"],
        "SERVING": ["COMPLETED"],
        "COMPLETED": [],
        "CANCELLED": [],
    }

    with db_session(path) as conn:
        cursor = conn.cursor()
        cursor.execute("BEGIN IMMEDIATE")

        cursor.execute(
            "SELECT * FROM virtual_queue_registrations WHERE registration_id = ?",
            (registration_id.strip().upper(),),
        )
        row = cursor.fetchone()
        if not row:
            raise RegistrationNotFoundError(f"Virtual queue registration '{registration_id}' was not found.")

        current_status = row["status"]
        if target_status not in allowed_transitions.get(current_status, []):
            allowed_next = allowed_transitions.get(current_status, [])
            allowed_msg = ", ".join(allowed_next) if allowed_next else "None (Terminal State)"
            raise InvalidStatusTransitionError(
                f"Invalid queue status transition from '{current_status}' to '{target_status}'. "
                f"Allowed transitions for '{current_status}': [{allowed_msg}]."
            )

        # Non-waiting vehicles (SERVING, COMPLETED, CANCELLED) have queue_position 0 (no longer waiting in line)
        updated_position = 0

        cursor.execute(
            """
            UPDATE virtual_queue_registrations
            SET status = ?, queue_position = ?, updated_at = ?
            WHERE registration_id = ?
            """,
            (target_status, updated_position, now_iso, registration_id.strip().upper()),
        )

        # Recalculate queue positions sequentially (1, 2, 3...) for remaining WAITING vehicles
        st_id = row["station_id"]
        f_type = row["fuel_type"]
        cursor.execute(
            """
            SELECT id FROM virtual_queue_registrations
            WHERE station_id = ? AND fuel_type = ? AND status = 'WAITING'
            ORDER BY created_at ASC, id ASC
            """,
            (st_id, f_type),
        )
        waiting_rows = cursor.fetchall()
        for idx, w_row in enumerate(waiting_rows, start=1):
            cursor.execute(
                """
                UPDATE virtual_queue_registrations
                SET queue_position = ?, updated_at = ?
                WHERE id = ?
                """,
                (idx, now_iso, w_row["id"]),
            )

        # Return updated record
        cursor.execute(
            "SELECT * FROM virtual_queue_registrations WHERE registration_id = ?",
            (registration_id.strip().upper(),),
        )
        updated_row = cursor.fetchone()
        assert updated_row is not None
        return _row_to_queue_dict(updated_row)
