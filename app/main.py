from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.core.logging_config import setup_logging, logger
from app.core.database import engine, Base, SessionLocal
from app.utils.validators import InvalidStateTransitionError, BusinessRuleViolationError, CaseNotFoundError
from app.seed.seed_database import seed_database
from app.models.merchant import Merchant

# Import API Routers
from app.api.routes.health import router as health_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.transactions import router as transactions_router
from app.api.routes.revenue_risk import router as revenue_risk_router
from app.api.routes.recovery import router as recovery_router
from app.api.routes.insights import router as insights_router
from app.api.routes.simulator import router as simulator_router
from app.api.routes.audit import router as audit_router
from app.api.routes.demo import router as demo_router
from app.api.routes.seed import router as seed_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Initializing RecoverAI Database Schema...")
    Base.metadata.create_all(bind=engine)

    # Automatically seed if database is completely empty
    db = SessionLocal()
    try:
        merchant_count = db.query(Merchant).count()
        if merchant_count == 0:
            logger.info("Database is empty. Seeding initial deterministic dataset...")
            seed_database(db=db)
        else:
            logger.info("Database already contains data (%s merchants).", merchant_count)
    finally:
        db.close()

    yield
    logger.info("Shutting down RecoverAI Agent backend.")


app = FastAPI(
    title="RecoverAI — Autonomous Revenue Recovery Agent",
    description="Autonomous Agentic Revenue Recovery Platform built for Razorpay Buildathon. Detects, diagnoses, scores, guardrails, and recovers at-risk revenue.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed.",
                "details": exc.errors(),
            },
        },
    )


@app.exception_handler(CaseNotFoundError)
async def case_not_found_exception_handler(request: Request, exc: CaseNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "success": False,
            "error": {
                "code": "CASE_NOT_FOUND",
                "message": str(exc),
            },
        },
    )


@app.exception_handler(InvalidStateTransitionError)
async def state_transition_exception_handler(request: Request, exc: InvalidStateTransitionError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": {
                "code": "INVALID_STATE_TRANSITION",
                "message": str(exc),
            },
        },
    )


@app.exception_handler(BusinessRuleViolationError)
async def business_rule_exception_handler(request: Request, exc: BusinessRuleViolationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": {
                "code": "GUARDRAIL_VIOLATION",
                "message": str(exc),
            },
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing the request.",
            },
        },
    )


# Register API Routers
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(transactions_router, prefix=settings.API_PREFIX)
app.include_router(revenue_risk_router, prefix=settings.API_PREFIX)
app.include_router(recovery_router, prefix=settings.API_PREFIX)
app.include_router(insights_router, prefix=settings.API_PREFIX)
app.include_router(simulator_router, prefix=settings.API_PREFIX)
app.include_router(audit_router, prefix=settings.API_PREFIX)
app.include_router(demo_router, prefix=settings.API_PREFIX)
app.include_router(seed_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
def root():
    return {
        "service": "RecoverAI — Autonomous Revenue Recovery Agent",
        "status": "operational",
        "documentation": "/docs",
        "redoc": "/redoc",
        "health": f"{settings.API_PREFIX}/health",
    }
