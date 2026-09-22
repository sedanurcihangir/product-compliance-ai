"""create products + product_regulations; backfill evaluation.product_id

Revision ID: 0011_products_m2m
Revises: 0010_user_role
Create Date: 2026-09-22

Non-destructive:
- Does not DROP/TRUNCATE existing tables or rows.
- Does not delete legacy ProductCategory rows (kept as legacy references).
- Adds Product + ProductRegulation (M2M) and nullable evaluations.product_id,
  then backfills from existing category/regulation links by name.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0011_products_m2m"
down_revision: Union[str, Sequence[str], None] = "0010_user_role"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ELECTRONICS_NAME = "Elektronik Ürünler"
ELECTRONICS_DESCRIPTION = (
    "Türkiye'ye ithal edilmesi planlanan elektronik tüketici ürünleri için "
    "ana ürün kategorisi."
)

# Legacy ProductCategory names that become Product rows under Elektronik Ürünler.
LEGACY_PRODUCT_NAMES: tuple[str, ...] = (
    "Bluetooth Kulaklık",
    "Akıllı Saat",
    "Kablosuz Hoparlör",
    "Kablosuz Mouse",
    "Kablosuz Oyun Kumandası",
    "Dizüstü Bilgisayar",
    "Harici Güç Adaptörü",
    "Demo Elektronik Ürün",
)


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("product_category_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["product_category_id"],
            ["product_categories.id"],
        ),
    )
    op.create_index("ix_products_name", "products", ["name"])
    op.create_index(
        "ix_products_product_category_id",
        "products",
        ["product_category_id"],
    )

    op.create_table(
        "product_regulations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("regulation_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.ForeignKeyConstraint(["regulation_id"], ["regulations.id"]),
        sa.UniqueConstraint(
            "product_id",
            "regulation_id",
            name="uq_product_regulations_product_regulation",
        ),
    )
    op.create_index(
        "ix_product_regulations_product_id",
        "product_regulations",
        ["product_id"],
    )
    op.create_index(
        "ix_product_regulations_regulation_id",
        "product_regulations",
        ["regulation_id"],
    )

    op.add_column(
        "evaluations",
        sa.Column("product_id", sa.Integer(), nullable=True),
    )
    op.create_index("ix_evaluations_product_id", "evaluations", ["product_id"])
    op.create_foreign_key(
        "fk_evaluations_product_id_products",
        "evaluations",
        "products",
        ["product_id"],
        ["id"],
    )

    _backfill_data()


def _backfill_data() -> None:
    bind = op.get_bind()
    categories = sa.table(
        "product_categories",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
    )
    products = sa.table(
        "products",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("product_category_id", sa.Integer),
    )
    regulations = sa.table(
        "regulations",
        sa.column("id", sa.Integer),
        sa.column("product_category_id", sa.Integer),
    )
    product_regulations = sa.table(
        "product_regulations",
        sa.column("product_id", sa.Integer),
        sa.column("regulation_id", sa.Integer),
    )
    evaluations = sa.table(
        "evaluations",
        sa.column("id", sa.Integer),
        sa.column("product_category_id", sa.Integer),
        sa.column("product_id", sa.Integer),
    )

    # 1) Ensure parent category exists.
    existing_electronics = bind.execute(
        sa.select(categories.c.id).where(categories.c.name == ELECTRONICS_NAME)
    ).scalar_one_or_none()
    if existing_electronics is None:
        bind.execute(
            categories.insert().values(
                name=ELECTRONICS_NAME,
                description=ELECTRONICS_DESCRIPTION,
            )
        )
        electronics_id = bind.execute(
            sa.select(categories.c.id).where(categories.c.name == ELECTRONICS_NAME)
        ).scalar_one()
    else:
        electronics_id = int(existing_electronics)

    # 2) Create Product rows from legacy category names (idempotent by name+parent).
    legacy_rows = bind.execute(
        sa.select(categories.c.id, categories.c.name, categories.c.description).where(
            categories.c.name.in_(list(LEGACY_PRODUCT_NAMES))
        )
    ).all()
    legacy_by_name = {row.name: row for row in legacy_rows}

    product_id_by_legacy_category_id: dict[int, int] = {}
    for name in LEGACY_PRODUCT_NAMES:
        legacy = legacy_by_name.get(name)
        description = legacy.description if legacy is not None else None
        existing_product = bind.execute(
            sa.select(products.c.id).where(
                products.c.name == name,
                products.c.product_category_id == electronics_id,
            )
        ).scalar_one_or_none()
        if existing_product is None:
            bind.execute(
                products.insert().values(
                    name=name,
                    description=description,
                    product_category_id=electronics_id,
                )
            )
            product_id = bind.execute(
                sa.select(products.c.id).where(
                    products.c.name == name,
                    products.c.product_category_id == electronics_id,
                )
            ).scalar_one()
        else:
            product_id = int(existing_product)
        if legacy is not None:
            product_id_by_legacy_category_id[int(legacy.id)] = int(product_id)

    # 3) M2M: Regulation.product_category_id (legacy) → ProductRegulation.
    regs = bind.execute(
        sa.select(regulations.c.id, regulations.c.product_category_id).where(
            regulations.c.product_category_id.is_not(None)
        )
    ).all()
    for reg in regs:
        legacy_cat_id = int(reg.product_category_id)
        product_id = product_id_by_legacy_category_id.get(legacy_cat_id)
        if product_id is None:
            continue
        exists = bind.execute(
            sa.select(product_regulations.c.product_id).where(
                product_regulations.c.product_id == product_id,
                product_regulations.c.regulation_id == int(reg.id),
            )
        ).scalar_one_or_none()
        if exists is None:
            bind.execute(
                product_regulations.insert().values(
                    product_id=product_id,
                    regulation_id=int(reg.id),
                )
            )

    # 4) Backfill Evaluation.product_id from legacy product_category_id.
    eval_rows = bind.execute(
        sa.select(evaluations.c.id, evaluations.c.product_category_id).where(
            evaluations.c.product_id.is_(None)
        )
    ).all()
    for ev in eval_rows:
        product_id = product_id_by_legacy_category_id.get(int(ev.product_category_id))
        if product_id is None:
            continue
        bind.execute(
            evaluations.update()
            .where(evaluations.c.id == int(ev.id))
            .values(product_id=product_id)
        )


def downgrade() -> None:
    op.drop_constraint(
        "fk_evaluations_product_id_products",
        "evaluations",
        type_="foreignkey",
    )
    op.drop_index("ix_evaluations_product_id", table_name="evaluations")
    op.drop_column("evaluations", "product_id")
    op.drop_index(
        "ix_product_regulations_regulation_id",
        table_name="product_regulations",
    )
    op.drop_index(
        "ix_product_regulations_product_id",
        table_name="product_regulations",
    )
    op.drop_table("product_regulations")
    op.drop_index("ix_products_product_category_id", table_name="products")
    op.drop_index("ix_products_name", table_name="products")
    op.drop_table("products")
