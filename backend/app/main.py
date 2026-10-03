from contextlib import asynccontextmanager

from app.api import analysis, artifacts, cases, evidence, timeline
from app.core.config import settings
from app.core.database import close_db, init_db
from app.core.exceptions import ForensicException, forensic_exception_to_http
from app.core.logging import get_logger, setup_logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting Forensic Recovery Platform")
    await init_db()
    yield
    await close_db()
    logger.info("Shutting down Forensic Recovery Platform")


app = FastAPI(
    title="Forensic Recovery Platform",
    description="Unified Digital Forensic Recovery & Analysis Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(ForensicException)
async def forensic_exception_handler(request: Request, exc: ForensicException):
    return forensic_exception_to_http(exc)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"code": "INTERNAL_ERROR", "message": "Internal server error"},
    )


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "forensic-recovery-platform",
        "version": "0.1.0",
    }


# API Routes
app.include_router(cases.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(artifacts.router, prefix="/api/v1")
app.include_router(timeline.router, prefix="/api/v1")


# Root
@app.get("/")
async def root():
    return {
        "name": "Forensic Recovery Platform",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }
