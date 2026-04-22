from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

from etl.extract import run_extract
from etl.load import run_load
from etl.transform import run_transform

with DAG(
    dag_id='etl_pipeline',
    start_date=datetime(2024, 1, 1),
    schedule='@hourly',  
    catchup=False
) as dag:
    
    t1 = PythonOperator(task_id='extract', python_callable=run_extract)
    t2 = PythonOperator(task_id='transform', python_callable=run_transform, op_kwargs={'extracted_data': t1.output})
    t3 = PythonOperator(task_id='load', python_callable=run_load, op_kwargs={'transformed_data': t2.output})
    t1 >> t2 >> t3