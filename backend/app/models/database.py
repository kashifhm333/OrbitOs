from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

# Engine configuration with dialect compatibility
engine_args = {"echo": False}
if "sqlite" in settings.DATABASE_URL:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args["pool_size"] = settings.DB_POOL_SIZE
    engine_args["max_overflow"] = settings.DB_MAX_OVERFLOW

engine = create_async_engine(settings.DATABASE_URL, **engine_args)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    """FastAPI dependency yielding an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Initializes schema tables if not existing."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

