from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_courts_address()


def _migrate_courts_address() -> None:
    inspector = inspect(engine)
    if "courts" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("courts")}
    if "address" in columns:
        return
    with engine.connect() as connection:
        connection.execute(text("ALTER TABLE courts ADD COLUMN address VARCHAR"))
        connection.commit()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
