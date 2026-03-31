import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, TimeoutError as SATimeoutError

from app.api.routes import router
from app.api.analytics import router as analytics_router
from app.core.database import engine
from app.models import Base

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="AI Sentiment Analyzer",
    description="Production-grade sentiment analysis API with pluggable ML engines.",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(OperationalError)
async def db_connection_error_handler(request: Request, exc: OperationalError):
    logger.error("Database connection error: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Database is currently unavailable. Please try again later."},
    )


@app.exception_handler(SATimeoutError)
async def db_timeout_handler(request: Request, exc: SATimeoutError):
    logger.error("Database timeout: %s", exc)
    return JSONResponse(
        status_code=504,
        content={"detail": "Database operation timed out. Please try again later."},
    )


@app.exception_handler(TimeoutError)
async def inference_timeout_handler(request: Request, exc: TimeoutError):
    logger.error("ML inference timeout: %s", exc)
    return JSONResponse(
        status_code=504,
        content={"detail": "ML inference timed out. Try a shorter text or a different engine."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


app.include_router(router)
app.include_router(analytics_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
