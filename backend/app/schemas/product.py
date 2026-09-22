from datetime import datetime

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    product_category_id: int = Field(gt=0)


class ProductUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    product_category_id: int = Field(gt=0)


class ProductResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    product_category_id: int
    product_category_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
