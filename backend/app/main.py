import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base, SessionLocal
from app.routes.api import router as api_router
from app.services.seed_service import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and auto-seed if clean
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title="StockSense API",
    description="Enterprise-grade modular Inventory & Warehouse Management System API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "message": "StockSense API is active",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api")
def api_root():
    return {
        "message": "StockSense API is active",
        "docs": "/docs",
        "health": "/api/health"
    }
