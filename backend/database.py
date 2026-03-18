import sqlite3
import pandas as pd
import os
from pathlib import Path
from typing import Any
from config import settings
from models import ColumnInfo, SchemaResponse, DatasetProfile, DatasetProfileColumn

# In-memory session storage for uploaded datasets
_session_dbs: dict[str, str] = {}  # session_id -> db_path


def _get_db_path(session_id: str | None = None) -> str:
    if session_id and session_id in _session_dbs:
        return _session_dbs[session_id]
    return settings.db_path


def init_default_db() -> None:
    """Initialize the default SQLite database from the CSV file."""
    csv_path = os.path.join(settings.data_dir, settings.default_csv)
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Default CSV not found at {csv_path}")
    _load_csv_to_db(csv_path, settings.db_path, "sales_data")
    print(f"[DB] Default database initialized at {settings.db_path}")


def load_csv_for_session(csv_path: str, session_id: str) -> SchemaResponse:
    """Load a user-uploaded CSV into a session-specific SQLite database."""
    db_path = f"session_{session_id}.db"
    _load_csv_to_db(csv_path, db_path, "sales_data")
    _session_dbs[session_id] = db_path
    return get_schema(session_id)


def merge_csv_into_session(csv_path: str, session_id: str) -> SchemaResponse:
    """Merge an uploaded file into an existing session dataset for cross-source analysis."""
    incoming_df = _read_table_with_fallbacks(csv_path)
    if incoming_df.empty:
        raise ValueError("Dataset is empty")

    # Target a session DB (never mutate the default base DB directly).
    if session_id in _session_dbs:
        db_path = _session_dbs[session_id]
        existing_db_path = db_path
    else:
        db_path = f"session_{session_id}.db"
        existing_db_path = settings.db_path

    existing_df = pd.DataFrame()
    try:
        conn_existing = sqlite3.connect(existing_db_path)
        existing_df = pd.read_sql_query("SELECT * FROM sales_data", conn_existing)
    except Exception:
        existing_df = pd.DataFrame()
    finally:
        try:
            conn_existing.close()
        except Exception:
            pass

    incoming_df.columns = [c.strip().lower().replace(" ", "_") for c in incoming_df.columns]
    if "data_source" not in incoming_df.columns:
        incoming_df["data_source"] = "uploaded"

    if not existing_df.empty:
        existing_df.columns = [c.strip().lower().replace(" ", "_") for c in existing_df.columns]
        if "data_source" not in existing_df.columns:
            existing_df["data_source"] = "uploaded"

    merged_df = pd.concat([existing_df, incoming_df], ignore_index=True, sort=False)
    _load_dataframe_to_db(merged_df, db_path, "sales_data")
    _session_dbs[session_id] = db_path
    return get_schema(session_id)


def load_records_for_session(records: list[dict[str, Any]], session_id: str) -> SchemaResponse:
    """Load API-fetched records into a session-specific SQLite database."""
    if not records:
        raise ValueError("No records were returned from the selected data source")

    df = pd.DataFrame(records)
    db_path = f"session_{session_id}.db"
    _load_dataframe_to_db(df, db_path, "sales_data")
    _session_dbs[session_id] = db_path
    return get_schema(session_id)


def merge_records_into_session(records: list[dict[str, Any]], session_id: str) -> SchemaResponse:
    """Merge API-fetched records with existing session data for cross-source comparisons."""
    if not records:
        raise ValueError("No records were returned from the selected data source")

    incoming_df = pd.DataFrame(records)
    if incoming_df.empty:
        raise ValueError("Fetched dataset is empty")

    # Target a session DB (never mutate the default base DB directly).
    if session_id in _session_dbs:
        db_path = _session_dbs[session_id]
        existing_db_path = db_path
    else:
        db_path = f"session_{session_id}.db"
        existing_db_path = settings.db_path

    existing_df = pd.DataFrame()
    try:
        conn_existing = sqlite3.connect(existing_db_path)
        existing_df = pd.read_sql_query("SELECT * FROM sales_data", conn_existing)
    except Exception:
        existing_df = pd.DataFrame()
    finally:
        try:
            conn_existing.close()
        except Exception:
            pass

    # Normalize columns before union so both datasets align safely.
    incoming_df.columns = [c.strip().lower().replace(" ", "_") for c in incoming_df.columns]
    if not existing_df.empty:
        existing_df.columns = [c.strip().lower().replace(" ", "_") for c in existing_df.columns]
        if "data_source" not in existing_df.columns:
            existing_df["data_source"] = "uploaded"

    if "data_source" not in incoming_df.columns:
        incoming_df["data_source"] = "amazon_api"

    merged_df = pd.concat([existing_df, incoming_df], ignore_index=True, sort=False)
    _load_dataframe_to_db(merged_df, db_path, "sales_data")
    _session_dbs[session_id] = db_path
    return get_schema(session_id)


def _load_csv_to_db(csv_path: str, db_path: str, table_name: str) -> None:
    """Load CSV/JSON/XLSX file into a SQLite database table."""
    df = _read_table_with_fallbacks(csv_path)
    _load_dataframe_to_db(df, db_path, table_name)


def _load_dataframe_to_db(df: pd.DataFrame, db_path: str, table_name: str) -> None:
    """Load a pandas DataFrame into a SQLite database table."""
    if df.empty:
        raise ValueError("Dataset is empty")
    # Normalize column names: lowercase, replace spaces with underscores
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    conn = sqlite3.connect(db_path)
    df.to_sql(table_name, conn, if_exists="replace", index=False)
    conn.close()


def _read_table_with_fallbacks(csv_path: str) -> pd.DataFrame:
    """Read CSV/JSON/XLSX files with common fallbacks for user uploads."""
    ext = Path(csv_path).suffix.lower()

    if ext in {".xlsx", ".xls"}:
        return pd.read_excel(csv_path)

    if ext == ".json":
        try:
            return pd.read_json(csv_path)
        except ValueError:
            return pd.read_json(csv_path, lines=True)

    encodings = ["utf-8", "utf-8-sig", "cp1252", "latin-1"]
    read_attempts = [
        {},
        {"sep": None, "engine": "python"},
    ]
    last_error: Exception | None = None

    for encoding in encodings:
        for attempt in read_attempts:
            try:
                return pd.read_csv(csv_path, encoding=encoding, **attempt)
            except (UnicodeDecodeError, pd.errors.ParserError, pd.errors.EmptyDataError) as exc:
                last_error = exc

    raise ValueError(
        "Unable to read file. Supported formats: CSV (UTF-8/UTF-8 BOM/CP1252/Latin-1), JSON, XLSX."
    ) from last_error


def execute_query(sql: str, session_id: str | None = None) -> list[dict[str, Any]]:
    """Execute a SQL query and return results as a list of dicts."""
    db_path = _get_db_path(session_id)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.execute(sql)
        rows = [dict(row) for row in cursor.fetchall()]
        return rows
    finally:
        conn.close()


def get_schema(session_id: str | None = None) -> SchemaResponse:
    """Get the schema and sample data from the database."""
    db_path = _get_db_path(session_id)
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.execute("SELECT * FROM sales_data LIMIT 5")
        sample_rows = [dict(zip([d[0] for d in cursor.description], row)) for row in cursor.fetchall()]
        col_names = [d[0] for d in cursor.description]

        # Get type info
        type_cursor = conn.execute("PRAGMA table_info(sales_data)")
        col_types = {row[1]: row[2] for row in type_cursor.fetchall()}

        count_row = conn.execute("SELECT COUNT(*) FROM sales_data").fetchone()
        row_count = count_row[0] if count_row else 0

        columns = []
        for col in col_names:
            sample_vals = [str(row.get(col, "")) for row in sample_rows[:3]]
            columns.append(ColumnInfo(
                name=col,
                type=col_types.get(col, "TEXT"),
                sample_values=sample_vals
            ))

        return SchemaResponse(
            columns=columns,
            sample_data=sample_rows,
            row_count=row_count
        )
    finally:
        conn.close()


def get_dataset_profile(session_id: str | None = None) -> DatasetProfile:
    """Compute a lightweight profile for the active dataset."""
    db_path = _get_db_path(session_id)
    conn = sqlite3.connect(db_path)
    try:
        count_row = conn.execute("SELECT COUNT(*) FROM sales_data").fetchone()
        row_count = count_row[0] if count_row else 0

        type_cursor = conn.execute("PRAGMA table_info(sales_data)")
        table_info = type_cursor.fetchall()

        columns: list[DatasetProfileColumn] = []
        numeric_columns: list[str] = []
        categorical_columns: list[str] = []
        date_columns: list[str] = []

        for _, col_name, col_type, *_ in table_info:
            null_row = conn.execute(
                f'SELECT COUNT(*) FROM sales_data WHERE "{col_name}" IS NULL'
            ).fetchone()
            distinct_row = conn.execute(
                f'SELECT COUNT(DISTINCT "{col_name}") FROM sales_data'
            ).fetchone()

            inferred = (col_type or "TEXT").upper()
            if any(token in col_name.lower() for token in ["date", "month", "year"]) or "DATE" in inferred:
                date_columns.append(col_name)
            elif any(token in inferred for token in ["INT", "REAL", "NUM", "DEC", "FLOAT", "DOUBLE"]):
                numeric_columns.append(col_name)
            else:
                categorical_columns.append(col_name)

            columns.append(DatasetProfileColumn(
                name=col_name,
                inferred_type=inferred,
                null_count=int(null_row[0] if null_row else 0),
                distinct_count=int(distinct_row[0] if distinct_row else 0),
            ))

        return DatasetProfile(
            row_count=row_count,
            column_count=len(table_info),
            numeric_columns=numeric_columns,
            categorical_columns=categorical_columns,
            date_columns=date_columns,
            columns=columns,
        )
    finally:
        conn.close()
