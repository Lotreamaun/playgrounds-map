"""Миграция: существующая база получает новые таблицы и колонки,
площадки остаются опубликованными с прежними ID."""

import sqlite3
from datetime import datetime

from sqlmodel import Session

from app.core import database
from app.models.court import Court

OLD_SCHEMA = """
CREATE TABLE courts (
    id INTEGER PRIMARY KEY,
    sport_type VARCHAR NOT NULL,
    name VARCHAR,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    surface VARCHAR NOT NULL,
    condition VARCHAR NOT NULL,
    has_lighting BOOLEAN NOT NULL,
    is_covered BOOLEAN,
    description VARCHAR,
    address VARCHAR,
    photo_url VARCHAR,
    attributes JSON,
    created_at DATETIME,
    updated_at DATETIME
)
"""


def _make_legacy_db(db_path: str) -> None:
    connection = sqlite3.connect(db_path)
    connection.execute(OLD_SCHEMA)
    connection.execute(
        """
        INSERT INTO courts (
            id, sport_type, name, latitude, longitude, surface, condition,
            has_lighting, is_covered, description, address, photo_url,
            attributes, created_at, updated_at
        ) VALUES (
            7, 'basketball', 'Легаси-парк', 41.715, 44.827, 'asphalt', 'good',
            1, NULL, 'старое описание', NULL, NULL,
            NULL, '2026-01-01 10:00:00.000000', '2026-01-01 10:00:00.000000'
        )
        """
    )
    connection.commit()
    connection.close()


def test_migration_preserves_existing_courts_and_ids(tmp_path, monkeypatch):
    db_path = str(tmp_path / "legacy.db")
    _make_legacy_db(db_path)

    legacy_engine = database.create_engine(f"sqlite:///{db_path}")
    monkeypatch.setattr(database, "engine", legacy_engine)

    database.create_db_and_tables()

    with Session(legacy_engine) as session:
        courts = session.query(Court).all()
        assert len(courts) == 1
        court = courts[0]
        # Тот же ID и данные, статус — «Опубликована».
        assert court.id == 7
        assert court.name == "Легаси-парк"
        assert court.description == "старое описание"
        assert court.is_hidden is False
        assert court.is_photo_published is True

        # Новые таблицы созданы добавочной миграцией.
        inspector = database.inspect(legacy_engine)
        tables = set(inspector.get_table_names())
        assert {"courts", "court_reports", "admin_actions", "delivery_jobs"} <= tables
        columns = {col["name"] for col in inspector.get_columns("courts")}
        assert {"is_hidden", "is_photo_published"} <= columns


def test_migration_is_idempotent(tmp_path, monkeypatch):
    db_path = str(tmp_path / "legacy.db")
    _make_legacy_db(db_path)
    legacy_engine = database.create_engine(f"sqlite:///{db_path}")
    monkeypatch.setattr(database, "engine", legacy_engine)

    database.create_db_and_tables()
    database.create_db_and_tables()  # повторный запуск ничего не ломает

    with Session(legacy_engine) as session:
        court = session.query(Court).one()
        assert court.id == 7
        assert court.created_at is not None
