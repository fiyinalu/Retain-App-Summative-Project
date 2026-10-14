from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Optional, Union

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.core.database import get_db
from app.models import Category, Expense, User

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def money(value: Optional[Union[Decimal, int, float]]) -> float:
    return float(value or 0)


@router.get("/insights")
def get_admin_insights(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    today = date.today()
    month_start = date(today.year, today.month, 1)

    if today.month == 12:
        next_month_start = date(today.year + 1, 1, 1)
    else:
        next_month_start = date(today.year, today.month + 1, 1)

    total_users = db.scalar(select(func.count(User.id))) or 0
    total_expenses = db.scalar(select(func.count(Expense.id))) or 0
    total_expense_value = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0))
    ) or 0

    current_month_expenses = db.scalar(
        select(func.count(Expense.id)).where(
            Expense.date >= month_start,
            Expense.date < next_month_start,
        )
    ) or 0

    category_rows = db.execute(
        select(
            Category.id,
            Category.name,
            func.count(Expense.id).label("expense_count"),
            func.coalesce(func.sum(Expense.amount), 0).label("total_spent"),
        )
        .outerjoin(Expense, Expense.category_id == Category.id)
        .group_by(Category.id, Category.name)
    ).all()

    category_spending = [
        {
            "category_id": row.id,
            "category_name": row.name,
            "expense_count": int(row.expense_count),
            "total_spent": money(row.total_spent),
        }
        for row in category_rows
    ]

    top_categories = sorted(
        category_spending,
        key=lambda item: (
            -item["expense_count"],
            -item["total_spent"],
            item["category_name"].lower(),
        ),
    )[:5]

    bottom_categories = sorted(
        category_spending,
        key=lambda item: (
            item["expense_count"],
            item["total_spent"],
            item["category_name"].lower(),
        ),
    )[:5]

    recent_expense_rows = db.execute(
        select(Expense, User.name, User.email, Category.name)
        .join(User, Expense.user_id == User.id)
        .join(Category, Expense.category_id == Category.id)
        .order_by(Expense.created_at.desc(), Expense.id.desc())
        .limit(10)
    ).all()

    recent_expenses = [
        {
            "id": expense.id,
            "title": expense.title,
            "amount": money(expense.amount),
            "date": expense.date.isoformat(),
            "category_name": category_name,
            "user_name": user_name,
            "user_email": user_email,
            "created_at": (
                expense.created_at.isoformat()
                if expense.created_at
                else None
            ),
        }
        for expense, user_name, user_email, category_name
        in recent_expense_rows
    ]

    recent_users_rows = db.scalars(
        select(User)
        .order_by(User.created_at.desc(), User.id.desc())
        .limit(10)
    ).all()

    recent_users = [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": (
                user.created_at.isoformat()
                if user.created_at
                else None
            ),
        }
        for user in recent_users_rows
    ]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "overview": {
            "total_users": int(total_users),
            "total_expenses": int(total_expenses),
            "total_expense_value": money(total_expense_value),
            "current_month_expenses": int(current_month_expenses),
        },
        "category_spending": category_spending,
        "top_categories": top_categories,
        "bottom_categories": bottom_categories,
        "recent_expenses": recent_expenses,
        "recent_users": recent_users,
    }
