# One-time local setup: create database (if missing) and write backend/.env
# Usage (from PowerShell):
#   cd C:\src\product-compliance-ai\backend
#   .\scripts\setup_database.ps1
#
# You will be prompted for the postgres user password.
# The password is not printed and is not committed to Git.

$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$dbName = "product_compliance"
$hostName = "127.0.0.1"
$port = "5432"
$user = "postgres"

if (-not (Test-Path $psql)) {
    throw "psql not found at $psql"
}

Write-Host "PostgreSQL password for user '$user' (input is hidden):"
$secure = Read-Host -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

$env:PGPASSWORD = $plain
try {
    Write-Host "Checking server..."
    & $psql -U $user -h $hostName -p $port -d postgres -tAc "SELECT 1;" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not connect to PostgreSQL. Check password and that the server is running." }

    $exists = (& $psql -U $user -h $hostName -p $port -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$dbName';").Trim()
    if ($exists -eq "1") {
        Write-Host "Database '$dbName' already exists."
    } else {
        Write-Host "Creating database '$dbName'..."
        & $psql -U $user -h $hostName -p $port -d postgres -c "CREATE DATABASE $dbName;"
        if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE failed." }
        Write-Host "Database created."
    }

    # URL-encode password for DATABASE_URL
    $encodedPass = [uri]::EscapeDataString($plain)
    $envPath = Join-Path $backendRoot ".env"
    $url = "postgresql+psycopg://${user}:${encodedPass}@${hostName}:${port}/${dbName}"
    @"
DATABASE_URL=$url
"@ | Set-Content -Path $envPath -Encoding UTF8
    Write-Host "Wrote $envPath (gitignored)."
    Write-Host "Done. You can start the API with:"
    Write-Host "  cd $backendRoot"
    Write-Host "  .\.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000"
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $plain = $null
    $encodedPass = $null
}
