@echo off
REM Tech Turf - Quick Start Script (Fixed Encoding)
@chcp 65001 >nul

echo ==================================
echo Tech Turf - India Edition
echo Quick Start Script
echo ==================================
echo.

REM Check if backend exists
if not exist "backend" (
    echo [ERROR] backend directory not found.
    pause
    exit /b 1
)

REM Check for .env file
if not exist "backend\.env" (
    echo [ERROR] .env file not found in backend folder.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    pushd backend
    call npm install
    popd
)

echo ==================================
echo Starting Tech Turf Platform...
echo ==================================
echo.

pushd backend
echo Starting Backend on port 8080...
call npm start

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The server stopped unexpectedly with error code %errorlevel%.
    pause
)
popd

pause
