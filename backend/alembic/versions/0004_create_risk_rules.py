"""create risk_rules table

Revision ID: 0004_risk_rules
Revises: 0003_requirements
Create Date: 2026-09-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_risk_rules"
down_revision: Union[str, Sequence[str], None] = "0003_requirements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "risk_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("condition", sa.Text(), nullable=False),
        sa.Column("risk_level", sa.String(length=255), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("risk_rules")
