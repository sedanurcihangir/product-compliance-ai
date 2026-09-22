from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.evaluation import Evaluation
    from app.models.product_category import ProductCategory
    from app.models.regulation import Regulation


class ProductRegulation(Base):
    """Many-to-many: a regulation may apply to multiple products."""

    __tablename__ = "product_regulations"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "regulation_id",
            name="uq_product_regulations_product_regulation",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )
    regulation_id: Mapped[int] = mapped_column(
        ForeignKey("regulations.id"),
        nullable=False,
        index=True,
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_category_id: Mapped[int] = mapped_column(
        ForeignKey("product_categories.id"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    product_category: Mapped["ProductCategory"] = relationship(
        back_populates="products",
    )
    evaluations: Mapped[list["Evaluation"]] = relationship(
        back_populates="product",
    )
    regulations: Mapped[list["Regulation"]] = relationship(
        secondary="product_regulations",
        back_populates="products",
    )
