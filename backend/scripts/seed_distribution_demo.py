"""
Idempotent DEMO seed for ProductDistribution rows.

IMPORTANT:
- These records are synthetic sample/demo rows for dashboard development.
- They are NOT real sales, import, or market distribution statistics.
- Re-running this script must not duplicate demo rows.
- Does not delete or modify existing regulatory / evaluation / document data.
- Does not modify the existing Türkiye (TR) country row.
- Links rows to Product (ProductCategory → Product model).
"""

from __future__ import annotations

from datetime import date

from app.db import SessionLocal
from app.models import Country, Product
from app.models.product_distribution import ProductDistribution

# Synthetic sample quantities only — not market figures.
DEMO_DATE = date(2026, 9, 1)

# (catalog_product_name, distribution_product_name, city, city_code, quantity, import_country_code)
DEMO_ROWS: list[tuple[str, str, str, str, int, str]] = [
    ("Bluetooth Kulaklık", "Bluetooth Kulaklık", "İstanbul", "34", 120, "CN"),
    ("Bluetooth Kulaklık", "Bluetooth Kulaklık", "Ankara", "06", 80, "CN"),
    ("Bluetooth Kulaklık", "Bluetooth Kulaklık", "İzmir", "35", 60, "CN"),
    ("Bluetooth Kulaklık", "Bluetooth Kulaklık", "Bursa", "16", 40, "CN"),
    ("Bluetooth Kulaklık", "Bluetooth Kulaklık", "İstanbul", "34", 55, "DE"),
    ("Bluetooth Kulaklık", "Bluetooth Kulaklık", "Kocaeli", "41", 35, "DE"),
    ("Bluetooth Kulaklık", "Bluetooth Kulaklık", "Ankara", "06", 25, "DE"),
    ("Demo", "Demo Elektronik Ürün", "İstanbul", "34", 45, "CN"),
    ("Demo", "Demo Elektronik Ürün", "Ankara", "06", 30, "DE"),
]

IMPORT_COUNTRIES = [
    ("Çin", "CN"),
    ("Almanya", "DE"),
]


def _get_or_create_country(db, *, name: str, code: str) -> Country:
    existing = (
        db.query(Country)
        .filter((Country.code == code) | (Country.name == name))
        .one_or_none()
    )
    if existing is not None:
        return existing
    country = Country(name=name, code=code)
    db.add(country)
    db.flush()
    return country


def _find_demo_row(
    db,
    *,
    product_name: str,
    product_id: int,
    city_code: str,
    distribution_date: date,
    import_country_id: int,
) -> ProductDistribution | None:
    return (
        db.query(ProductDistribution)
        .filter(
            ProductDistribution.is_demo.is_(True),
            ProductDistribution.product_name == product_name,
            ProductDistribution.product_id == product_id,
            ProductDistribution.city_code == city_code,
            ProductDistribution.distribution_date == distribution_date,
            ProductDistribution.import_country_id == import_country_id,
        )
        .one_or_none()
    )


def seed_distribution_demo() -> dict[str, int]:
    db = SessionLocal()
    created = 0
    skipped = 0
    countries_created = 0
    try:
        country_by_code: dict[str, Country] = {}
        for name, code in IMPORT_COUNTRIES:
            before_id = (
                db.query(Country.id).filter(Country.code == code).one_or_none()
            )
            country = _get_or_create_country(db, name=name, code=code)
            country_by_code[code] = country
            if before_id is None:
                countries_created += 1

        products = {p.name: p for p in db.query(Product).order_by(Product.id)}

        for (
            catalog_name,
            distribution_name,
            city,
            city_code,
            quantity,
            country_code,
        ) in DEMO_ROWS:
            product = products.get(catalog_name)
            if product is None and catalog_name == "Demo":
                product = products.get("Demo Elektronik Ürün")
            if product is None:
                raise RuntimeError(f"Missing product: {catalog_name}")
            country = country_by_code[country_code]
            existing = _find_demo_row(
                db,
                product_name=distribution_name,
                product_id=product.id,
                city_code=city_code,
                distribution_date=DEMO_DATE,
                import_country_id=country.id,
            )
            if existing is not None:
                skipped += 1
                continue
            db.add(
                ProductDistribution(
                    product_name=distribution_name,
                    product_category_id=product.product_category_id,
                    product_id=product.id,
                    city=city,
                    city_code=city_code,
                    quantity=quantity,
                    distribution_date=DEMO_DATE,
                    import_country_id=country.id,
                    is_demo=True,
                )
            )
            created += 1

        db.commit()
        total = db.query(ProductDistribution).count()
        demo_total = (
            db.query(ProductDistribution)
            .filter(ProductDistribution.is_demo.is_(True))
            .count()
        )
        return {
            "created": created,
            "skipped": skipped,
            "countries_created": countries_created,
            "distributions_total": total,
            "distributions_demo": demo_total,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    result = seed_distribution_demo()
    print(
        "seed_distribution_demo complete "
        f"(created={result['created']}, skipped={result['skipped']}, "
        f"countries_created={result['countries_created']}, "
        f"demo_total={result['distributions_demo']})"
    )
