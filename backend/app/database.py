import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Check for external hosted database (e.g., PostgreSQL / Neon / Supabase)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Normalize postgres:// to postgresql:// for SQLAlchemy 2.0+
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
else:
    # Detect serverless / read-only deployment environment (e.g. Vercel / AWS Lambda)
    is_serverless = (
        os.getenv("VERCEL") == "1"
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None
        or os.getenv("SERVERLESS") == "1"
    )

    if is_serverless:
        # On Vercel, the application bundle is read-only; only /tmp is writable
        tmp_db_path = "/tmp/stocksense.db"
        bundled_db_path = os.path.abspath(os.path.join(DATABASE_DIR, "..", "stocksense.db"))

        # Pre-populate /tmp database from bundled seed if available
        if not os.path.exists(tmp_db_path) and os.path.exists(bundled_db_path):
            try:
                shutil.copy2(bundled_db_path, tmp_db_path)
            except Exception as e:
                print(f"[StockSense] Notice: could not copy bundled seed db to /tmp: {e}")

        SQLALCHEMY_DATABASE_URL = f"sqlite:///{tmp_db_path}"
    else:
        # Standard local development
        local_db_path = os.path.abspath(os.path.join(DATABASE_DIR, "..", "stocksense.db"))
        SQLALCHEMY_DATABASE_URL = f"sqlite:///{local_db_path}"

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
