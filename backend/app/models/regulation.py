from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.country import Country
    from app.models.product_category import ProductCategory
    from app.models.requirement import Requirement


class Regulation(Base):
    __tablename__ = "regulations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id"), nullable=False)
    product_category_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_categories.id"),
        nullable=True,
    )
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")

    country: Mapped["Country"] = relationship(back_populates="regulations")
    product_category: Mapped["ProductCategory | None"] = relationship(
        back_populates="regulations",
    )
    requirements: Mapped[list["Requirement"]] = relationship(
        back_populates="regulation",
    )
