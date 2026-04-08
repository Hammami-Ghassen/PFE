param(
    [string]$ImageName = "pfe-airflow-etl",
    [string]$ContainerName = "pfe-airflow-etl",
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

$etlRoot = (Get-Location).Path
$envFile = Join-Path $etlRoot ".env"

if (-not (Test-Path $envFile)) {
    throw "Missing .env file in ETL folder. Create it from .env.example first."
}

Write-Host "Building image $ImageName..."
docker build -t $ImageName .

$existing = docker ps -a --filter "name=^${ContainerName}$" --format "{{.ID}}"
if ($existing) {
    Write-Host "Removing existing container $ContainerName..."
    docker rm -f $ContainerName | Out-Null
}

Write-Host "Starting container $ContainerName..."
docker run -d `
    --name $ContainerName `
    -p "${Port}:8080" `
    --env-file $envFile `
    -v "${etlRoot}/dags:/opt/airflow/dags" `
    -v "${etlRoot}/etl:/opt/airflow/etl" `
    -v "${etlRoot}/sql:/opt/airflow/sql" `
    $ImageName | Out-Null

Write-Host "Airflow is starting. Open: http://localhost:$Port"
Write-Host "Default credentials come from .env (AIRFLOW_WWW_USER_USERNAME / AIRFLOW_WWW_USER_PASSWORD)."
