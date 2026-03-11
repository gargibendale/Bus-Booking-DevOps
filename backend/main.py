from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routes import router as app_router
from loguru import logger
from database import create_db_and_tables

logger.add("logs/app.log", rotation="10 MB", retention="10 days", level="DEBUG")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.debug("Happy logging with Loguru!")
    create_db_and_tables()
    logger.info("Connected to PostgreSQL and created the tables")

    yield

    logger.info("Application shutdown😴")


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(app_router, tags=["busapp"], prefix="/busapp")
