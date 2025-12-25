# start-contracts.ps1
# Helper to install deps and run a local Hardhat node or deploy to a network.
# Usage:
#  - Start local Hardhat node:
#      .\start-contracts.ps1 -Node
#  - Install dependencies:
#      .\start-contracts.ps1 -InstallDeps
#  - Deploy to localhost (after starting node):
#      .\start-contracts.ps1 -DeployLocal

param(
    [switch]$InstallDeps,
    [switch]$Node,
    [switch]$DeployLocal
)

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Set-Location -Path $scriptDir

if ($InstallDeps) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "npm not found. Install Node.js to continue." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Installing npm dependencies..."
    npm install
    exit 0
}

if ($Node) {
    Write-Host "Starting Hardhat node on localhost:8545 ..."
    npx hardhat node
    exit 0
}

if ($DeployLocal) {
    Write-Host "Deploying contracts to local Hardhat node..."
    npx hardhat run --network localhost scripts/deploy.js
    exit 0
}

Write-Host "No flags passed. Use -InstallDeps, -Node, or -DeployLocal." -ForegroundColor Cyan
