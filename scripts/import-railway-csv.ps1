param(
    [string] $DatabaseUrl = $env:RAILWAY_DB_URL
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    throw "RAILWAY_DB_URL is not set. Pass -DatabaseUrl or set `$env:RAILWAY_DB_URL first."
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$sqlFile = Join-Path $root "server/src/main/resources/sql/import_application_csv.psql"

Push-Location $root
try {
    psql $DatabaseUrl -f $sqlFile
}
finally {
    Pop-Location
}
