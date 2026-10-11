from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Category, Expense, User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    PaginatedExpenseResponse,
)


router = APIRouter(
    prefix="/api/expenses",
    tags=["Expenses"],
)


def get_user_expense(
    expense_id: int,
    current_user: User,
    db: Session,
) -> Expense:
    expense = db.scalar(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == current_user.id,
        )
    )

    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )

    return expense


def validate_category(
    category_id: int,
    db: Session,
) -> Category:
    category = db.get(Category, category_id)

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category not found",
        )

    return category


@router.post(
    "",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_expense(
    request: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    validate_category(request.category_id, db)

    expense = Expense(
        title=request.title.strip(),
        description=request.description,
        amount=request.amount,
        category_id=request.category_id,
        date=request.date,
        payment_method=request.payment_method.strip(),
        notes=request.notes,
        user_id=current_user.id,
    )

    db.add(expense)
    db.commit()
    db.refresh(expense)

    return ExpenseResponse.model_validate(expense)


@router.get(
    "",
    response_model=PaginatedExpenseResponse,
)
def list_expenses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedExpenseResponse:
    base_query = select(Expense).where(
        Expense.user_id == current_user.id
    )

    total = db.scalar(
        select(func.count()).select_from(
            base_query.subquery()
        )
    ) or 0

    total_pages = ceil(total / page_size) if total else 0

    expenses = db.scalars(
        base_query
        .order_by(Expense.date.desc(), Expense.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return PaginatedExpenseResponse(
        items=[
            ExpenseResponse.model_validate(expense)
            for expense in expenses
        ],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get(
    "/{expense_id}",
    response_model=ExpenseResponse,
)
def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    expense = get_user_expense(
        expense_id,
        current_user,
        db,
    )

    return ExpenseResponse.model_validate(expense)


@router.put(
    "/{expense_id}",
    response_model=ExpenseResponse,
)
def update_expense(
    expense_id: int,
    request: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    expense = get_user_expense(
        expense_id,
        current_user,
        db,
    )

    updates = request.model_dump(exclude_unset=True)

    if (
        "category_id" in updates
        and updates["category_id"] is not None
    ):
        validate_category(updates["category_id"], db)

    if "title" in updates and updates["title"] is not None:
        updates["title"] = updates["title"].strip()

    if (
        "payment_method" in updates
        and updates["payment_method"] is not None
    ):
        updates["payment_method"] = updates[
            "payment_method"
        ].strip()

    for field, value in updates.items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)

    return ExpenseResponse.model_validate(expense)


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    expense = get_user_expense(
        expense_id,
        current_user,
        db,
    )

    db.delete(expense)
    db.commit()
