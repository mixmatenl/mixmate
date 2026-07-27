from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect, event

DATABASE_URL = "sqlite:///./mixmate.db"
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

# WAL-mode: staat gelijktijdige lees- en schrijfoperaties toe zonder blokkering.
@event.listens_for(engine, "connect")
def _set_wal_mode(dbapi_conn, _):
    dbapi_conn.execute("PRAGMA journal_mode=WAL")
    dbapi_conn.execute("PRAGMA synchronous=NORMAL")
    dbapi_conn.execute("PRAGMA busy_timeout=5000")


def _migrate():
    """Voeg ontbrekende kolommen toe aan bestaande tabellen (SQLite ondersteunt geen ALTER TABLE ADD COLUMN via SQLModel)."""
    migrations = [
        # (tabel, kolom, type + default)
        ("recipe",     "glass_id",     "INTEGER"),
        ("recipe",     "image_url",    "TEXT NOT NULL DEFAULT ''"),
        ("recipe",     "enabled",      "INTEGER NOT NULL DEFAULT 1"),
        ("pump",       "pump_type",    "TEXT NOT NULL DEFAULT 'peristaltic'"),
        ("pump",       "enabled",      "INTEGER NOT NULL DEFAULT 1"),
        ("ingredient", "unit",         "TEXT NOT NULL DEFAULT 'ml'"),
        ("ingredient", "image_url",    "TEXT NOT NULL DEFAULT ''"),
    ]
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        for table, column, col_type in migrations:
            if table not in tables:
                continue
            existing = [c["name"] for c in inspector.get_columns(table)]
            if column not in existing:
                try:
                    conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {col_type}'))
                    conn.commit()
                    print(f"[db] Kolom toegevoegd: {table}.{column}")
                except Exception as e:
                    print(f"[db] Migratie overgeslagen: {table}.{column} — {e}")


def create_db():
    SQLModel.metadata.create_all(engine)
    _migrate()


def get_session():
    with Session(engine) as session:
        yield session
