"""add product_distributions.product_id; backfill from Product by name

Revision ID: 0012_distribution_product_id
Revises: 0011_products_m2m
Create Date: 2026-09-22

Non-destructive:
- Does not DROP/TRUNCATE rows.
- Adds nullable product_id, backfills from products.name.
- Updates product_category_id to the linked Product's category (parent).
- Renames catalog product 'Demo Elektronik Ürün' → 'Demo' (distribution.product_name unchanged).
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0012_distribution_product_id"
down_revision: Union[str, Sequence[str], None] = "0011_products_m2m"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "product_distributions",
        sa.Column("product_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_product_distributions_product_id",
        "product_distributions",
        ["product_id"],
    )
    op.create_foreign_key(
        "fk_product_distributions_product_id_products",
        "product_distributions",
        "products",
        ["product_id"],
        ["id"],
    )

    bind = op.get_bind()
    products = sa.table(
        "products",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("product_category_id", sa.Integer),
    )
    distributions = sa.table(
        "product_distributions",
        sa.column("id", sa.Integer),
        sa.column("product_name", sa.String),
        sa.column("product_category_id", sa.Integer),
        sa.column("product_id", sa.Integer),
    )

    product_rows = bind.execute(
        sa.select(
            products.c.id,
            products.c.name,
            products.c.product_category_id,
        )
    ).all()
    by_name = {row.name: row for row in product_rows}

    dist_rows = bind.execute(
        sa.select(
            distributions.c.id,
            distributions.c.product_name,
            distributions.c.product_id,
        )
    ).all()

    for dist in dist_rows:
        if dist.product_id is not None:
            continue
        product = by_name.get(dist.product_name)
        if product is None:
            continue
        bind.execute(
            distributions.update()
            .where(distributions.c.id == int(dist.id))
            .values(
                product_id=int(product.id),
                product_category_id=int(product.product_category_id),
            )
        )

    # Display name for dashboard product filter (distribution.product_name kept).
    demo_product = by_name.get("Demo Elektronik Ürün")
    if demo_product is not None:
        bind.execute(
            products.update()
            .where(products.c.id == int(demo_product.id))
            .values(name="Demo")
        )


def downgrade() -> None:
    bind = op.get_bind()
    products = sa.table(
        "products",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
    )
    # Best-effort rename reverse for Demo catalog row.
    bind.execute(
        products.update().where(products.c.name == "Demo").values(name="Demo Elektronik Ürün")
    )

    op.drop_constraint(
        "fk_product_distributions_product_id_products",
        "product_distributions",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_product_distributions_product_id",
        table_name="product_distributions",
    )
    op.drop_column("product_distributions", "product_id")
