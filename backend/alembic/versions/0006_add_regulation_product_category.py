"""add nullable product_category_id to regulations

Revision ID: 0006_regulation_product_category
Revises: 0005_sources
Create Date: 2026-09-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_regulation_product_category"
down_revision: Union[str, Sequence[str], None] = "0005_sources"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "regulations",
        sa.Column("product_category_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_regulations_product_category_id",
        "regulations",
        "product_categories",
        ["product_category_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_regulations_product_category_id",
        "regulations",
        type_="foreignkey",
    )
    op.drop_column("regulations", "product_category_id")
