from fastapi import FastAPI

from app.api.auth import router as auth_router


app = FastAPI(
    title="Retain API",
    description="Personal Expense & Budget Manager API",
    version="1.0.0",
)


app.include_router(auth_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Retain API is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
