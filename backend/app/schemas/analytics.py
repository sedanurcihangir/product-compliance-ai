from datetime import date

from pydantic import BaseModel, Field


class AnalyticsOverviewResponse(BaseModel):
    total_quantity: int = 0
    record_count: int = 0
    product_count: int = 0
    category_count: int = 0
    import_country_count: int = 0
    is_demo: bool


class CityDistributionResponse(BaseModel):
    city: str
    city_code: str
    quantity: int = Field(ge=0)
    record_count: int = Field(default=0, ge=0)


class ProductDistributionAnalyticsResponse(BaseModel):
    product_name: str
    quantity: int = Field(ge=0)


class CountryDistributionResponse(BaseModel):
    import_country_id: int
    country_name: str
    country_code: str
    quantity: int = Field(ge=0)


class TimeSeriesResponse(BaseModel):
    period: str
    quantity: int = Field(ge=0)


class AnalyticsFilterParams(BaseModel):
    """Shared optional analytics filters (validated at router layer)."""

    import_country_id: int | None = Field(default=None, gt=0)
    product_category_id: int | None = Field(default=None, gt=0)
    product_name: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    include_demo: bool = True
