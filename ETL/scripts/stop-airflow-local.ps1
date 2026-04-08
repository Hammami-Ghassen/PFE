param(
    [string]$ContainerName = "pfe-airflow-etl"
)

$ErrorActionPreference = "Stop"

$existing = docker ps -a --filter "name=^${ContainerName}$" --format "{{.ID}}"
if (-not $existing) {
    Write-Host "Container $ContainerName does not exist."
    exit 0
}

Write-Host "Stopping and removing $ContainerName..."
docker rm -f $ContainerName | Out-Null
Write-Host "Container removed."
