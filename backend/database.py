from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect

DATABASE_URL = "sqlite:///./mixmate.db"
engine = create_engine(DATABASE_URL, echo=False)


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
