"""Read-only analytics aggregations over ProductDistribution (+ Product)."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models.country import Country
from app.models.product import Product
from app.models.product_distribution import ProductDistribution
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    CityDistributionResponse,
    CountryDistributionResponse,
    ProductDistributionAnalyticsResponse,
    TimeSeriesResponse,
)


def _apply_filters(
    stmt: Select,
    *,
    import_country_id: int | None,
    product_category_id: int | None,
    product_name: str | None,
    date_from: date | None,
    date_to: date | None,
    include_demo: bool,
) -> Select:
    # Outer join so legacy rows without product_id still appear when unfiltered.
    stmt = stmt.outerjoin(Product, Product.id == ProductDistribution.product_id)

    if include_demo:
        stmt = stmt.where(ProductDistribution.is_demo.is_(True))
    else:
        stmt = stmt.where(ProductDistribution.is_demo.is_(False))

    if import_country_id is not None:
        stmt = stmt.where(
            ProductDistribution.import_country_id == import_country_id
        )
    if product_category_id is not None:
        # Prefer Product.product_category_id; fall back to distribution FK.
        stmt = stmt.where(
            or_(
                Product.product_category_id == product_category_id,
                ProductDistribution.product_category_id == product_category_id,
            )
        )
    if product_name is not None and product_name.strip():
        name = product_name.strip()
        stmt = stmt.where(
            or_(
                Product.name == name,
                ProductDistribution.product_name == name,
            )
        )
    if date_from is not None:
        stmt = stmt.where(ProductDistribution.distribution_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(ProductDistribution.distribution_date <= date_to)
    return stmt


def _product_label_expr():
    return func.coalesce(Product.name, ProductDistribution.product_name)


def _category_id_expr():
    return func.coalesce(Product.product_category_id, ProductDistribution.product_category_id)


def get_overview(
    db: Session,
    *,
    import_country_id: int | None = None,
    product_category_id: int | None = None,
    product_name: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    include_demo: bool = True,
) -> AnalyticsOverviewResponse:
    filtered = select(
        ProductDistribution.id.label("id"),
        ProductDistribution.quantity.label("quantity"),
        ProductDistribution.import_country_id.label("import_country_id"),
        ProductDistribution.product_id.label("product_id"),
        ProductDistribution.product_name.label("product_name"),
        _category_id_expr().label("category_id"),
        _product_label_expr().label("product_label"),
    )
    filtered = _apply_filters(
        filtered,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    ).subquery()

    stmt = select(
        func.coalesce(func.sum(filtered.c.quantity), 0),
        func.count(),
        func.count(func.distinct(filtered.c.category_id)),
        func.count(func.distinct(filtered.c.import_country_id)),
    )
    row = db.execute(stmt).one()

    # Catalog product count from Product table (not distinct distribution labels).
    catalog_stmt = select(func.count()).select_from(Product)
    if product_category_id is not None:
        catalog_stmt = catalog_stmt.where(
            Product.product_category_id == product_category_id
        )
    if product_name is not None and product_name.strip():
        catalog_stmt = catalog_stmt.where(Product.name == product_name.strip())
    catalog_product_count = int(db.execute(catalog_stmt).scalar() or 0)

    return AnalyticsOverviewResponse(
        total_quantity=int(row[0] or 0),
        record_count=int(row[1] or 0),
        product_count=catalog_product_count,
        category_count=int(row[2] or 0),
        import_country_count=int(row[3] or 0),
        # Scope of this aggregation: demo-only or non-demo-only (not mixed).
        is_demo=include_demo,
    )


def get_distribution_by_city(
    db: Session,
    *,
    import_country_id: int | None = None,
    product_category_id: int | None = None,
    product_name: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    include_demo: bool = True,
) -> list[CityDistributionResponse]:
    stmt = select(
        ProductDistribution.city,
        ProductDistribution.city_code,
        func.coalesce(func.sum(ProductDistribution.quantity), 0).label("quantity"),
    )
    stmt = _apply_filters(
        stmt,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    )
    stmt = (
        stmt.group_by(ProductDistribution.city, ProductDistribution.city_code)
        .order_by(
            func.sum(ProductDistribution.quantity).desc(),
            ProductDistribution.city.asc(),
        )
    )
    rows = db.execute(stmt).all()
    return [
        CityDistributionResponse(
            city=row.city,
            city_code=row.city_code,
            quantity=int(row.quantity or 0),
        )
        for row in rows
    ]


def get_distribution_by_product(
    db: Session,
    *,
    import_country_id: int | None = None,
    product_category_id: int | None = None,
    product_name: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    include_demo: bool = True,
) -> list[ProductDistributionAnalyticsResponse]:
    label = _product_label_expr().label("product_name")
    stmt = select(
        label,
        func.coalesce(func.sum(ProductDistribution.quantity), 0).label("quantity"),
    )
    stmt = _apply_filters(
        stmt,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    )
    stmt = (
        stmt.group_by(label)
        .order_by(
            func.sum(ProductDistribution.quantity).desc(),
            label.asc(),
        )
    )
    rows = db.execute(stmt).all()
    return [
        ProductDistributionAnalyticsResponse(
            product_name=row.product_name,
            quantity=int(row.quantity or 0),
        )
        for row in rows
    ]


def get_distribution_by_country(
    db: Session,
    *,
    import_country_id: int | None = None,
    product_category_id: int | None = None,
    product_name: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    include_demo: bool = True,
) -> list[CountryDistributionResponse]:
    stmt = select(
        ProductDistribution.import_country_id,
        Country.name.label("country_name"),
        Country.code.label("country_code"),
        func.coalesce(func.sum(ProductDistribution.quantity), 0).label("quantity"),
    ).join(Country, Country.id == ProductDistribution.import_country_id)
    stmt = _apply_filters(
        stmt,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    )
    stmt = (
        stmt.group_by(
            ProductDistribution.import_country_id,
            Country.name,
            Country.code,
        )
        .order_by(
            func.sum(ProductDistribution.quantity).desc(),
            Country.name.asc(),
        )
    )
    rows = db.execute(stmt).all()
    return [
        CountryDistributionResponse(
            import_country_id=int(row.import_country_id),
            country_name=row.country_name,
            country_code=row.country_code,
            quantity=int(row.quantity or 0),
        )
        for row in rows
    ]


def get_distribution_over_time(
    db: Session,
    *,
    import_country_id: int | None = None,
    product_category_id: int | None = None,
    product_name: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    include_demo: bool = True,
) -> list[TimeSeriesResponse]:
    period_expr = func.to_char(
        func.date_trunc("month", ProductDistribution.distribution_date),
        "YYYY-MM",
    )
    stmt = select(
        period_expr.label("period"),
        func.coalesce(func.sum(ProductDistribution.quantity), 0).label("quantity"),
    )
    stmt = _apply_filters(
        stmt,
        import_country_id=import_country_id,
        product_category_id=product_category_id,
        product_name=product_name,
        date_from=date_from,
        date_to=date_to,
        include_demo=include_demo,
    )
    stmt = stmt.group_by(period_expr).order_by(period_expr.asc())
    rows = db.execute(stmt).all()
    return [
        TimeSeriesResponse(period=str(row.period), quantity=int(row.quantity or 0))
        for row in rows
    ]
