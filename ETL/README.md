# ETL Airflow Bootstrap (Dockerfile Only)

This ETL package loads `DW_msp` from `grh_msp` and ships with an Airflow DAG.

## 1) Prepare environment

From this folder (`ETL`), ensure a `.env` file exists.

Use `.env.example` as reference. Required sections:
- Source DB (`grh_msp`)
- DW DB (`DW_msp`)
- Airflow admin credentials

## 2) Build and run on Windows PowerShell

```powershell
cd c:\PFE\ETL
./scripts/run-airflow-local.ps1
```

Optional custom params:

```powershell
./scripts/run-airflow-local.ps1 -ImageName pfe-airflow-etl -ContainerName pfe-airflow-etl -Port 8080
```

## 3) Access Airflow

- URL: `http://localhost:8080`
- Credentials come from `.env`:
  - `AIRFLOW_WWW_USER_USERNAME`
  - `AIRFLOW_WWW_USER_PASSWORD`

DAG name:
- `etl_postgres_dw_dag`

## 4) Stop container

```powershell
./scripts/stop-airflow-local.ps1
```

## 5) Manual docker commands (alternative)

```powershell
cd c:\PFE\ETL
docker build -t pfe-airflow-etl .
docker run -d --name pfe-airflow-etl -p 8080:8080 --env-file .env -v "${PWD}/dags:/opt/airflow/dags" -v "${PWD}/etl:/opt/airflow/etl" -v "${PWD}/sql:/opt/airflow/sql" pfe-airflow-etl
```
