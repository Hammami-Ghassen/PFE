#!/usr/bin/env bash
set -euo pipefail

export AIRFLOW_HOME="${AIRFLOW_HOME:-/opt/airflow}"
export AIRFLOW__CORE__LOAD_EXAMPLES="${AIRFLOW__CORE__LOAD_EXAMPLES:-False}"
export AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION="${AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION:-False}"
export AIRFLOW__CORE__EXECUTOR="${AIRFLOW__CORE__EXECUTOR:-SequentialExecutor}"
export AIRFLOW__DATABASE__SQL_ALCHEMY_CONN="${AIRFLOW__DATABASE__SQL_ALCHEMY_CONN:-sqlite:////opt/airflow/airflow.db}"

AIRFLOW_WWW_USER_USERNAME="${AIRFLOW_WWW_USER_USERNAME:-admin}"
AIRFLOW_WWW_USER_PASSWORD="${AIRFLOW_WWW_USER_PASSWORD:-admin}"
AIRFLOW_WWW_USER_FIRSTNAME="${AIRFLOW_WWW_USER_FIRSTNAME:-ETL}"
AIRFLOW_WWW_USER_LASTNAME="${AIRFLOW_WWW_USER_LASTNAME:-Admin}"
AIRFLOW_WWW_USER_EMAIL="${AIRFLOW_WWW_USER_EMAIL:-etl-admin@local}"
AIRFLOW_WEBSERVER_PORT="${AIRFLOW_WEBSERVER_PORT:-8080}"

echo "[bootstrap] Initializing Airflow metadata database..."
airflow db migrate

echo "[bootstrap] Ensuring Airflow admin user exists..."
set +e
airflow users create \
    --role Admin \
    --username "${AIRFLOW_WWW_USER_USERNAME}" \
    --password "${AIRFLOW_WWW_USER_PASSWORD}" \
    --firstname "${AIRFLOW_WWW_USER_FIRSTNAME}" \
    --lastname "${AIRFLOW_WWW_USER_LASTNAME}" \
    --email "${AIRFLOW_WWW_USER_EMAIL}"
create_exit_code=$?
set -e

if [ "${create_exit_code}" -ne 0 ]; then
    echo "[bootstrap] Admin user may already exist. Continuing..."
fi

echo "[bootstrap] Starting scheduler in background..."
airflow scheduler &
scheduler_pid=$!

cleanup() {
    echo "[bootstrap] Stopping scheduler (pid=${scheduler_pid})..."
    kill "${scheduler_pid}" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "[bootstrap] Starting webserver on port ${AIRFLOW_WEBSERVER_PORT}..."
exec airflow webserver --port "${AIRFLOW_WEBSERVER_PORT}"
