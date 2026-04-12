# Tech Turf - Quick Start Script (PowerShell)
# This script starts the backend server

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Tech Turf - India Edition" -ForegroundColor Cyan
Write-Host "Quick Start Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm found: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] npm not found. Please install npm." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host ""

# Install backend dependencies if needed
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
    Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "[OK] Backend dependencies already installed" -ForegroundColor Green
}

Write-Host ""

# Check if .env exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "[ERROR] .env file not found in backend folder" -ForegroundColor Red
    Write-Host "Please ensure backend/.env file exists with proper configuration" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}
else {
    Write-Host "[OK] .env file found" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Starting Tech Turf Backend..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Start backend server
Set-Location backend
Write-Host "Backend attempting to start on http://localhost:8080" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    npm start
}
catch {
    Write-Host ""
    Write-Host "[ERROR] The backend server failed to start." -ForegroundColor Red
    Write-Host "Please check the error messages above and ensure your .env file is correct." -ForegroundColor Yellow
    Write-Host "(Common issue: DATABASE_URL password placeholder not replaced)" -ForegroundColor Yellow
    Write-Host ""
}

Set-Location ..
Read-Host "Press Enter to exit..."
