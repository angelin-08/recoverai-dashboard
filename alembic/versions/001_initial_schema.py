"""Initial schema for RecoverAI

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-23 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. merchants
    op.create_table(
        'merchants',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_merchants_email'), 'merchants', ['email'], unique=True)

    # 2. customers
    op.create_table(
        'customers',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('merchant_id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=False),
        sa.Column('total_successful_transactions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_failed_transactions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('lifetime_value', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['merchant_id'], ['merchants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customers_email'), 'customers', ['email'], unique=False)
    op.create_index(op.f('ix_customers_merchant_id'), 'customers', ['merchant_id'], unique=False)

    # 3. transactions
    op.create_table(
        'transactions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('merchant_id', sa.String(length=64), nullable=False),
        sa.Column('customer_id', sa.String(length=64), nullable=False),
        sa.Column('external_transaction_id', sa.String(length=128), nullable=False),
        sa.Column('order_id', sa.String(length=128), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('payment_method', sa.String(length=64), nullable=False),
        sa.Column('transaction_type', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=64), nullable=False),
        sa.Column('failure_reason', sa.String(length=255), nullable=True),
        sa.Column('failure_category', sa.String(length=128), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['merchant_id'], ['merchants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transactions_customer_id'), 'transactions', ['customer_id'], unique=False)
    op.create_index(op.f('ix_transactions_external_transaction_id'), 'transactions', ['external_transaction_id'], unique=True)
    op.create_index(op.f('ix_transactions_merchant_id'), 'transactions', ['merchant_id'], unique=False)
    op.create_index(op.f('ix_transactions_occurred_at'), 'transactions', ['occurred_at'], unique=False)
    op.create_index(op.f('ix_transactions_order_id'), 'transactions', ['order_id'], unique=False)
    op.create_index(op.f('ix_transactions_status'), 'transactions', ['status'], unique=False)
    op.create_index('idx_txn_status_occurred', 'transactions', ['status', 'occurred_at'], unique=False)

    # 4. recovery_cases
    op.create_table(
        'recovery_cases',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('transaction_id', sa.String(length=64), nullable=False),
        sa.Column('revenue_at_risk', sa.Float(), nullable=False),
        sa.Column('estimated_recoverable_amount', sa.Float(), nullable=False),
        sa.Column('recovery_probability', sa.Float(), nullable=False),
        sa.Column('priority_score', sa.Float(), nullable=False),
        sa.Column('root_cause', sa.String(length=255), nullable=False),
        sa.Column('recommended_action', sa.String(length=64), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=64), nullable=False, server_default='DETECTED'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recovery_cases_status'), 'recovery_cases', ['status'], unique=False)
    op.create_index(op.f('ix_recovery_cases_transaction_id'), 'recovery_cases', ['transaction_id'], unique=True)
    op.create_index('idx_rc_status_priority', 'recovery_cases', ['status', 'priority_score'], unique=False)

    # 5. recovery_actions
    op.create_table(
        'recovery_actions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('recovery_case_id', sa.String(length=64), nullable=False),
        sa.Column('action_type', sa.String(length=64), nullable=False),
        sa.Column('attempt_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=64), nullable=False, server_default='PENDING'),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('result_message', sa.String(length=512), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['recovery_case_id'], ['recovery_cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recovery_actions_recovery_case_id'), 'recovery_actions', ['recovery_case_id'], unique=False)
    op.create_index('idx_act_case_attempt', 'recovery_actions', ['recovery_case_id', 'attempt_number'], unique=False)

    # 6. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('merchant_id', sa.String(length=64), nullable=False),
        sa.Column('transaction_id', sa.String(length=64), nullable=True),
        sa.Column('recovery_case_id', sa.String(length=64), nullable=True),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('actor', sa.String(length=64), nullable=False, server_default='SYSTEM'),
        sa.Column('decision', sa.String(length=128), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('action', sa.String(length=128), nullable=True),
        sa.Column('result', sa.String(length=128), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['merchant_id'], ['merchants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recovery_case_id'], ['recovery_cases.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_event_type'), 'audit_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_merchant_id'), 'audit_logs', ['merchant_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_recovery_case_id'), 'audit_logs', ['recovery_case_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)
    op.create_index(op.f('ix_audit_logs_transaction_id'), 'audit_logs', ['transaction_id'], unique=False)
    op.create_index('idx_audit_txn_timestamp', 'audit_logs', ['transaction_id', 'timestamp'], unique=False)
    op.create_index('idx_audit_case_timestamp', 'audit_logs', ['recovery_case_id', 'timestamp'], unique=False)


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('recovery_actions')
    op.drop_table('recovery_cases')
    op.drop_table('transactions')
    op.drop_table('customers')
    op.drop_table('merchants')
