# start-frontend.ps1
# Usage:
#  - Run with Python static server (default):
#      .\start-frontend.ps1
#  - Use http-server (Node) instead:
#      .\start-frontend.ps1 -UseHttpServer
#  - Specify port:
#      .\start-frontend.ps1 -Port 8081

param(
    [int]$Port = 8000,
    [switch]$UseHttpServer
)

# Switch to script directory (this file lives in crypto_vault)
$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Set-Location -Path $scriptDir

if ($UseHttpServer) {
    if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
        Write-Host "npx not available. Install Node.js (or run without -UseHttpServer)." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Starting http-server on port $Port ..."
    npx http-server . -p $Port
} else {
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        Write-Host "python not found. Install Python 3 (or run with -UseHttpServer)." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Starting Python http.server on port $Port ..."
    python -m http.server $Port
}
