"""create product_distributions table

Revision ID: 0009_product_distributions
Revises: 0008_documents
Create Date: 2026-09-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009_product_distributions"
down_revision: Union[str, Sequence[str], None] = "0008_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "product_distributions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("product_category_id", sa.Integer(), nullable=False),
        sa.Column("city", sa.String(length=64), nullable=False),
        sa.Column("city_code", sa.String(length=8), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("distribution_date", sa.Date(), nullable=False),
        sa.Column("import_country_id", sa.Integer(), nullable=False),
        sa.Column(
            "is_demo",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "quantity > 0",
            name="ck_product_distributions_quantity_positive",
        ),
        sa.ForeignKeyConstraint(
            ["import_country_id"],
            ["countries.id"],
        ),
        sa.ForeignKeyConstraint(
            ["product_category_id"],
            ["product_categories.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_product_distributions_import_country_date",
        "product_distributions",
        ["import_country_id", "distribution_date"],
    )
    op.create_index(
        "ix_product_distributions_category_date",
        "product_distributions",
        ["product_category_id", "distribution_date"],
    )
    op.create_index(
        "ix_product_distributions_city_code",
        "product_distributions",
        ["city_code"],
    )
    op.create_index(
        "ix_product_distributions_product_name",
        "product_distributions",
        ["product_name"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_product_distributions_product_name",
        table_name="product_distributions",
    )
    op.drop_index(
        "ix_product_distributions_city_code",
        table_name="product_distributions",
    )
    op.drop_index(
        "ix_product_distributions_category_date",
        table_name="product_distributions",
    )
    op.drop_index(
        "ix_product_distributions_import_country_date",
        table_name="product_distributions",
    )
    op.drop_table("product_distributions")
