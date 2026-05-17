@echo off
:: Erii Installer Launcher for Windows
:: This batch file calls the PowerShell installer

echo ========================================
echo      Erii Installer (Windows)
echo ========================================
echo.

:: Check if PowerShell is available
where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: PowerShell is required but not found.
    echo Please install PowerShell and try again.
    exit /b 1
)

:: Run the PowerShell installer
echo Starting PowerShell installer...
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if %errorlevel% neq 0 (
    echo.
    echo Installation failed. Please check the error messages above.
    exit /b 1
)

echo.
pause
