# database.py
import os
import urllib.parse
from dotenv import load_dotenv
import models
from sqlmodel import SQLModel, create_engine, Session

load_dotenv()

db_host = urllib.parse.quote_plus(os.getenv("DB_HOST"))
username = urllib.parse.quote_plus(os.getenv("POSTGRES_USER"))
password = urllib.parse.quote_plus(os.getenv("POSTGRES_PASSWORD"))
db_name = urllib.parse.quote_plus(os.getenv("POSTGRES_DB"))

DATABASE_URL = (
    f"postgresql+psycopg2://{username}:{password}@{db_host}/{db_name}?sslmode=disable"
)

engine = create_engine(DATABASE_URL)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        try:
            yield session
            session.commit()  # Auto-commit AFTER endpoint finishes successfully
        except Exception:
            session.rollback()  # Auto-rollback on ANY failure
            raise
        finally:
            session.close()
