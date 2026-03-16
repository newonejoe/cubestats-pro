@echo off
echo ========================================
echo CubeStats Pro - Starting Server
echo ========================================
echo.

REM Find the project directory
set PROJECT_DIR=%~dp0CubeStatsApi

if not exist "%PROJECT_DIR%" (
    echo Error: CubeStatsApi folder not found
    echo Please ensure this script is in the project folder
    pause
    exit /b 1
)

echo Starting CubeStats Pro on http://0.0.0.0:5001
echo.

cd /d "%PROJECT_DIR%"

REM Check if dotnet is available
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo Error: .NET SDK not found
    echo Please install .NET 8.0 from https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo Starting server...
dotnet run --urls "http://0.0.0.0:5001"

pause
