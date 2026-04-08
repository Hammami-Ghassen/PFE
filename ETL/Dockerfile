FROM apache/airflow:2.10.5-python3.11

USER airflow

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY dags /opt/airflow/dags
COPY etl /opt/airflow/etl
COPY sql /opt/airflow/sql
COPY scripts /opt/airflow/scripts

RUN chmod +x /opt/airflow/scripts/*.sh

ENV PYTHONPATH=/opt/airflow
ENV AIRFLOW__CORE__LOAD_EXAMPLES=False
ENV AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION=False
ENV AIRFLOW__CORE__EXECUTOR=SequentialExecutor
ENV AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=sqlite:////opt/airflow/airflow.db

CMD ["/opt/airflow/scripts/bootstrap-airflow.sh"]
