from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps.auth import get_current_admin_user
from app.models import Country, Product, ProductCategory
from app.models.product_distribution import ProductDistribution
from app.schemas.product_distribution import (
    ProductDistributionCreate,
    ProductDistributionResponse,
    ProductDistributionUpdate,
)

router = APIRouter(
    prefix="/api/distributions",
    tags=["distributions"],
    dependencies=[Depends(get_current_admin_user)],
)

def _get_or_404(db: Session, distribution_id: int) -> ProductDistribution:
    record = db.get(ProductDistribution, distribution_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Distribution not found.",
        )
    return record


def _ensure_category(db: Session, product_category_id: int) -> ProductCategory:
    category = db.get(ProductCategory, product_category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product category not found.",
        )
    return category


def _ensure_country(db: Session, import_country_id: int) -> Country:
    country = db.get(Country, import_country_id)
    if country is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import country not found.",
        )
    return country


def _ensure_product_if_set(db: Session, product_id: int | None) -> Product | None:
    if product_id is None:
        return None
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )
    return product


@router.get("", response_model=list[ProductDistributionResponse])
def list_distributions(db: Session = Depends(get_db)):
    result = db.execute(
        select(ProductDistribution).order_by(ProductDistribution.id)
    )
    return result.scalars().all()


@router.get("/{distribution_id}", response_model=ProductDistributionResponse)
def get_distribution(distribution_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, distribution_id)


@router.post(
    "",
    response_model=ProductDistributionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_distribution(
    payload: ProductDistributionCreate,
    db: Session = Depends(get_db),
):
    _ensure_category(db, payload.product_category_id)
    _ensure_country(db, payload.import_country_id)
    product = _ensure_product_if_set(db, payload.product_id)
    category_id = payload.product_category_id
    if product is not None:
        category_id = product.product_category_id
    record = ProductDistribution(
        product_name=payload.product_name,
        product_category_id=category_id,
        product_id=product.id if product is not None else None,
        city=payload.city,
        city_code=payload.city_code,
        quantity=payload.quantity,
        distribution_date=payload.distribution_date,
        import_country_id=payload.import_country_id,
        is_demo=payload.is_demo,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/{distribution_id}", response_model=ProductDistributionResponse)
def update_distribution(
    distribution_id: int,
    payload: ProductDistributionUpdate,
    db: Session = Depends(get_db),
):
    record = _get_or_404(db, distribution_id)
    data = payload.model_dump(exclude_unset=True)

    if "product_category_id" in data and data["product_category_id"] is not None:
        _ensure_category(db, data["product_category_id"])
    if "import_country_id" in data and data["import_country_id"] is not None:
        _ensure_country(db, data["import_country_id"])
    if "product_id" in data:
        product = _ensure_product_if_set(db, data["product_id"])
        if product is not None:
            data["product_category_id"] = product.product_category_id

    for key, value in data.items():
        setattr(record, key, value)

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{distribution_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_distribution(distribution_id: int, db: Session = Depends(get_db)):
    record = _get_or_404(db, distribution_id)
    db.delete(record)
    db.commit()
    return None
