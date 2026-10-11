from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Budget, Expense, User
from app.schemas.budget import (
    BudgetCreate,
    BudgetResponse,
    BudgetSummaryResponse,
    BudgetUpdate,
)

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_budget(
    request: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BudgetResponse:
    existing = db.scalar(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.month == request.month,
            Budget.year == request.year,
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A budget already exists for this month",
        )

    budget = Budget(
        month=request.month,
        year=request.year,
        amount=request.amount,
        user_id=current_user.id,
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)

    return BudgetResponse.model_validate(budget)


@router.get("", response_model=list[BudgetResponse])
def list_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BudgetResponse]:
    budgets = db.scalars(
        select(Budget)
        .where(Budget.user_id == current_user.id)
        .order_by(Budget.year.desc(), Budget.month.desc())
    ).all()

    return [
        BudgetResponse.model_validate(budget)
        for budget in budgets
    ]


@router.get("/summary", response_model=BudgetSummaryResponse)
def get_budget_summary(
    month: int = Query(ge=1, le=12),
    year: int = Query(ge=2000, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BudgetSummaryResponse:
    budget = db.scalar(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.month == month,
            Budget.year == year,
        )
    )

    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No budget exists for this month",
        )

    total_spent = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == current_user.id,
            extract("month", Expense.date) == month,
            extract("year", Expense.date) == year,
        )
    )

    spent = Decimal(str(total_spent or 0))
    budget_amount = budget.amount
    remaining = budget_amount - spent
    percentage_used = float((spent / budget_amount) * 100)

    return BudgetSummaryResponse(
        month=month,
        year=year,
        budget_amount=budget_amount,
        total_spent=spent,
        remaining=remaining,
        percentage_used=round(percentage_used, 2),
        is_over_budget=spent > budget_amount,
    )


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    request: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BudgetResponse:
    budget = db.scalar(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == current_user.id,
        )
    )

    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    budget.amount = request.amount
    db.commit()
    db.refresh(budget)

    return BudgetResponse.model_validate(budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    budget = db.scalar(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == current_user.id,
        )
    )

    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )

    db.delete(budget)
    db.commit()