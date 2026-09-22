from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps.auth import get_current_admin_user
from app.models import Product, ProductCategory
from app.models.user import User
from app.schemas import (
    ProductCategoryCreate,
    ProductCategoryResponse,
    ProductCategoryUpdate,
)

router = APIRouter(prefix="/api/product-categories", tags=["product-categories"])


@router.post("", response_model=ProductCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_product_category(
    payload: ProductCategoryCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    category = ProductCategory(name=payload.name, description=payload.description)
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A product category with this name already exists.",
        )
    db.refresh(category)
    return category


@router.get("", response_model=list[ProductCategoryResponse])
def list_product_categories(
    db: Session = Depends(get_db),
    has_products: bool | None = Query(default=None),
):
    # Kept readable for authenticated user evaluation form (and admin UI).
    # has_products=true → only parent categories that own Product rows
    # (hides legacy product-named categories from the evaluate form).
    stmt = select(ProductCategory).order_by(ProductCategory.id)
    if has_products is True:
        stmt = stmt.where(
            exists().where(Product.product_category_id == ProductCategory.id)
        )
    result = db.execute(stmt)
    return result.scalars().all()


@router.get("/{category_id}", response_model=ProductCategoryResponse)
def get_product_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(ProductCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product category not found.")
    return category


@router.put("/{category_id}", response_model=ProductCategoryResponse)
def update_product_category(
    category_id: int,
    payload: ProductCategoryUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    category = db.get(ProductCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product category not found.")

    category.name = payload.name
    category.description = payload.description
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A product category with this name already exists.",
        )
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_category(
    category_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    category = db.get(ProductCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product category not found.")
    db.delete(category)
    db.commit()
    return None
