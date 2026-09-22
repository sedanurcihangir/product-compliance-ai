from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.deps.auth import get_current_admin_user
from app.models import Product, ProductCategory
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter(prefix="/api/products", tags=["products"])


def _to_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        product_category_id=product.product_category_id,
        product_category_name=(
            product.product_category.name if product.product_category is not None else None
        ),
        created_at=product.created_at,
    )


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    product_category_id: int | None = Query(default=None, gt=0),
):
    """Public read — evaluation form needs product options."""
    stmt = (
        select(Product)
        .options(joinedload(Product.product_category))
        .order_by(Product.id)
    )
    if product_category_id is not None:
        stmt = stmt.where(Product.product_category_id == product_category_id)
    rows = db.execute(stmt).scalars().unique().all()
    return [_to_response(row) for row in rows]


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = (
        db.query(Product)
        .options(joinedload(Product.product_category))
        .filter(Product.id == product_id)
        .one_or_none()
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return _to_response(product)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    category = db.get(ProductCategory, payload.product_category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product category not found.",
        )
    product = Product(
        name=payload.name.strip(),
        description=payload.description,
        product_category_id=category.id,
    )
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create product.",
        )
    db.refresh(product)
    product = (
        db.query(Product)
        .options(joinedload(Product.product_category))
        .filter(Product.id == product.id)
        .one()
    )
    return _to_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    category = db.get(ProductCategory, payload.product_category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product category not found.",
        )
    product.name = payload.name.strip()
    product.description = payload.description
    product.product_category_id = category.id
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not update product.",
        )
    product = (
        db.query(Product)
        .options(joinedload(Product.product_category))
        .filter(Product.id == product_id)
        .one()
    )
    return _to_response(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    # Evaluations keep nullable product_id; clear links instead of cascade-delete history.
    from app.models.evaluation import Evaluation

    linked = (
        db.query(Evaluation)
        .filter(Evaluation.product_id == product_id)
        .count()
    )
    if linked > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Product has linked evaluations and cannot be deleted. "
                "Reassign or keep the product for history integrity."
            ),
        )
    db.delete(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product is referenced by other records and cannot be deleted.",
        )
    return None
