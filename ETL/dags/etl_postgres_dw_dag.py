from __future__ import annotations

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator


default_args = {
    "owner": "etl-grh",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
    "execution_timeout": timedelta(hours=4),
}

with DAG(
    dag_id="etl_postgres_dw_dag",
    default_args=default_args,
    description="ETL quotidien de grh_msp vers DW_msp (phase 1)",
    schedule="@daily",
    start_date=datetime(2026, 4, 8),
    catchup=False,
    max_active_runs=1,
    tags=["etl", "postgres", "dw", "grh"],
) as dag:
    prepare_schema = BashOperator(
        task_id="prepare_dw_schema",
        bash_command="python -m etl.main --action prepare-schema",
    )

    run_pipeline = BashOperator(
        task_id="run_phase1_etl",
        bash_command="python -m etl.main --action run",
    )

    run_quality_checks = BashOperator(
        task_id="run_quality_checks",
        bash_command="python -m etl.main --action quality-checks",
    )

    prepare_schema >> run_pipeline >> run_quality_checks
