from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.country import Country
    from app.models.product import Product
    from app.models.product_category import ProductCategory


class ProductDistribution(Base):
    __tablename__ = "product_distributions"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_product_distributions_quantity_positive"),
        Index(
            "ix_product_distributions_import_country_date",
            "import_country_id",
            "distribution_date",
        ),
        Index(
            "ix_product_distributions_category_date",
            "product_category_id",
            "distribution_date",
        ),
        Index("ix_product_distributions_city_code", "city_code"),
        Index("ix_product_distributions_product_name", "product_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_category_id: Mapped[int] = mapped_column(
        ForeignKey("product_categories.id"),
        nullable=False,
    )
    # Canonical product link (ProductCategory → Product model). Nullable for legacy
    # safety during migration; backfilled for existing demo rows.
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id"),
        nullable=True,
        index=True,
    )
    city: Mapped[str] = mapped_column(String(64), nullable=False)
    city_code: Mapped[str] = mapped_column(String(8), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    distribution_date: Mapped[date] = mapped_column(Date, nullable=False)
    import_country_id: Mapped[int] = mapped_column(
        ForeignKey("countries.id"),
        nullable=False,
    )
    is_demo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    product_category: Mapped["ProductCategory"] = relationship()
    product: Mapped["Product | None"] = relationship()
    import_country: Mapped["Country"] = relationship(
        back_populates="product_distributions",
    )
