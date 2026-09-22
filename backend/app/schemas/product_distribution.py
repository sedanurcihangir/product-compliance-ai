from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProductDistributionCreate(BaseModel):
    product_name: str = Field(min_length=1, max_length=255)
    product_category_id: int = Field(gt=0)
    product_id: int | None = Field(default=None, gt=0)
    city: str = Field(min_length=1, max_length=64)
    city_code: str = Field(min_length=1, max_length=8)
    quantity: int = Field(gt=0)
    distribution_date: date
    import_country_id: int = Field(gt=0)
    is_demo: bool = True

    @field_validator("product_name", "city", "city_code")
    @classmethod
    def must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be empty")
        return cleaned


class ProductDistributionUpdate(BaseModel):
    product_name: str | None = Field(default=None, min_length=1, max_length=255)
    product_category_id: int | None = Field(default=None, gt=0)
    product_id: int | None = Field(default=None, gt=0)
    city: str | None = Field(default=None, min_length=1, max_length=64)
    city_code: str | None = Field(default=None, min_length=1, max_length=8)
    quantity: int | None = Field(default=None, gt=0)
    distribution_date: date | None = None
    import_country_id: int | None = Field(default=None, gt=0)
    is_demo: bool | None = None

    @field_validator("product_name", "city", "city_code")
    @classmethod
    def must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be empty")
        return cleaned


class ProductDistributionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_name: str
    product_category_id: int
    product_id: int | None = None
    city: str
    city_code: str
    quantity: int
    distribution_date: date
    import_country_id: int
    is_demo: bool
    created_at: datetime
