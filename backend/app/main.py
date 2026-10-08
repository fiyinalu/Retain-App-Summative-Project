from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router


app = FastAPI(
    title="Retain API",
    description="Personal Expense & Budget Manager API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Retain API is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
