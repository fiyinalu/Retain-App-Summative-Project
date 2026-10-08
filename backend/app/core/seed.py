from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import Category


def seed_default_category() -> None:
    db = SessionLocal()

    try:
        existing_category = db.scalar(
            select(Category).where(Category.name == "Uncategorized")
        )

        if existing_category is None:
            category = Category(
                name="Uncategorized",
                is_default=True,
            )
            db.add(category)
            db.commit()
            print("Default Uncategorized category created.")
        else:
            print("Uncategorized category already exists.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_default_category()
