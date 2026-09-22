"""create users and evaluations tables

Revision ID: 0007_users_evaluations
Revises: 0006_regulation_product_category
Create Date: 2026-09-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0007_users_evaluations"
down_revision: Union[str, Sequence[str], None] = "0006_regulation_product_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "evaluations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("product_category_id", sa.Integer(), nullable=False),
        sa.Column("product_description", sa.Text(), nullable=False),
        sa.Column("supplier_country", sa.String(length=255), nullable=False),
        sa.Column("product_url", sa.String(length=2048), nullable=True),
        sa.Column("evaluation_mode", sa.String(length=32), nullable=False),
        sa.Column("result_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["product_category_id"], ["product_categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evaluations_user_id", "evaluations", ["user_id"])
    op.create_index(
        "ix_evaluations_product_category_id",
        "evaluations",
        ["product_category_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_evaluations_product_category_id", table_name="evaluations")
    op.drop_index("ix_evaluations_user_id", table_name="evaluations")
    op.drop_table("evaluations")
    op.drop_table("users")
