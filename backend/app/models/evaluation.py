from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.product import Product
    from app.models.product_category import ProductCategory
    from app.models.user import User


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_category_id: Mapped[int] = mapped_column(
        ForeignKey("product_categories.id"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id"),
        nullable=True,
        index=True,
    )
    product_description: Mapped[str] = mapped_column(Text, nullable=False)
    supplier_country: Mapped[str] = mapped_column(String(255), nullable=False)
    product_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    evaluation_mode: Mapped[str] = mapped_column(String(32), nullable=False)
    result_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="evaluations")
    product_category: Mapped["ProductCategory"] = relationship()
    product: Mapped["Product | None"] = relationship(back_populates="evaluations")
    documents: Mapped[list["Document"]] = relationship(
        back_populates="evaluation",
    )
