"""initial

Revision ID: 001
Revises: 
Create Date: 2026-05-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Because seed.py creates tables if they don't exist, this can just pass
    # In a real scenario we'd do op.create_table(...)
    pass

def downgrade():
    pass
