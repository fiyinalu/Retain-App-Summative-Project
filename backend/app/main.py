from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.init_db import init_db
from app.core.seed import seed_default_category

from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.expenses import router as expenses_router
from app.api.categories import router as categories_router
from app.api.budgets import router as budgets_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db()
    seed_default_category()
    yield


app = FastAPI(
    title="Retain API",
    description="Personal Expense & Budget Manager API",
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        settings.frontend_origin.rstrip('/'),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(expenses_router)
app.include_router(categories_router)
app.include_router(budgets_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Retain API is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
