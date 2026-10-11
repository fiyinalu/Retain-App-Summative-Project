
from datetime import date as Date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: Optional[str] = None
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    category_id: int = Field(gt=0)
    date: Date
    payment_method: str = Field(min_length=1, max_length=50)
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=150,
    )
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )
    category_id: Optional[int] = Field(default=None, gt=0)
    date: Optional[Date] = None
    payment_method: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=50,
    )
    notes: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    amount: Decimal
    category_id: int
    date: Date
    payment_method: str
    notes: Optional[str]

    model_config = {
        "from_attributes": True,
    }


class PaginatedExpenseResponse(BaseModel):
    items: list[ExpenseResponse]
    page: int
    page_size: int
    total: int
    total_pages: int