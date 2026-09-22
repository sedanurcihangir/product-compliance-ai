"""Read-only analytics endpoints for Admin Dashboard (aggregation only)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps.auth import get_current_admin_user
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    CityDistributionResponse,
    CountryDistributionResponse,
    ProductDistributionAnalyticsResponse,
    TimeSeriesResponse,
)
from app.services import analytics_service

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    dependencies=[Depends(get_current_admin_user)],
)

def _validate_date_range(
    date_from: date | None,
    date_to: date | None,
) -> None:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="date_from must be less than or equal to date_to.",
        )


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def analytics_overview(
    db: Session = Depends(get_db),
    import_country_id: int | None = Query(default=None, gt=0),
    product_category_id: int | None = Query(default=None, gt=0),
    product_name: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    include_demo: bool = Query(default=True),
):
    _validate_date_range(date_from, date_to)
    return analytics_service.get_overview(
        db,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    )


@router.get(
    "/distribution-by-city",
    response_model=list[CityDistributionResponse],
)
def analytics_distribution_by_city(
    db: Session = Depends(get_db),
    import_country_id: int | None = Query(default=None, gt=0),
    product_category_id: int | None = Query(default=None, gt=0),
    product_name: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    include_demo: bool = Query(default=True),
):
    _validate_date_range(date_from, date_to)
    return analytics_service.get_distribution_by_city(
        db,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    )


@router.get(
    "/distribution-by-product",
    response_model=list[ProductDistributionAnalyticsResponse],
)
def analytics_distribution_by_product(
    db: Session = Depends(get_db),
    import_country_id: int | None = Query(default=None, gt=0),
    product_category_id: int | None = Query(default=None, gt=0),
    product_name: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    include_demo: bool = Query(default=True),
):
    _validate_date_range(date_from, date_to)
    return analytics_service.get_distribution_by_product(
        db,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    )


@router.get(
    "/distribution-by-country",
    response_model=list[CountryDistributionResponse],
)
def analytics_distribution_by_country(
    db: Session = Depends(get_db),
    import_country_id: int | None = Query(default=None, gt=0),
    product_category_id: int | None = Query(default=None, gt=0),
    product_name: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    include_demo: bool = Query(default=True),
):
    _validate_date_range(date_from, date_to)
    return analytics_service.get_distribution_by_country(
        db,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    )


@router.get(
    "/distribution-over-time",
    response_model=list[TimeSeriesResponse],
)
def analytics_distribution_over_time(
    db: Session = Depends(get_db),
    import_country_id: int | None = Query(default=None, gt=0),
    product_category_id: int | None = Query(default=None, gt=0),
    product_name: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    include_demo: bool = Query(default=True),
):
    _validate_date_range(date_from, date_to)
    return analytics_service.get_distribution_over_time(
        db,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    )
