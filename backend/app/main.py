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

# Enable CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
