from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.regulation import Regulation


class ProductCategory(Base):
    __tablename__ = "product_categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Legacy FK target for regulations created before Product M2M.
    regulations: Mapped[list["Regulation"]] = relationship(
        back_populates="product_category",
    )
    products: Mapped[list["Product"]] = relationship(
        back_populates="product_category",
    )
