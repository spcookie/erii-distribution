# Erii Installer Script for Windows
# Installs Node.js LTS → @spcookie/erii

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Msg)
    Write-Host "`n" -NoNewline
    Write-Host $Msg -ForegroundColor Yellow
}

function Write-Ok {
    param([string]$Msg)
    Write-Host "  " -NoNewline
    Write-Host "✓" -ForegroundColor Green -NoNewline
    Write-Host " $Msg"
}

function Write-Info {
    param([string]$Msg)
    Write-Host "  $Msg" -ForegroundColor Cyan
}

Write-Host "========================================" -ForegroundColor Blue
Write-Host "     Erii Installer (Windows)           " -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue

# --- Install Node.js ---
Write-Step "[1/3] Installing Node.js LTS..."

if (Get-Command node -ErrorAction SilentlyContinue) {
    $CurrentNode = & node -v
    Write-Ok "Node.js $CurrentNode already installed"
} else {
    # Get latest LTS version from Node.js dist index
    $NodeIndex = Invoke-WebRequest -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing | ConvertFrom-Json
    $NodeVersion = ($NodeIndex | Where-Object { $_.lts -ne $false } | Select-Object -First 1).version -replace 'v', ''

    # Detect architecture
    $Arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } elseif ([System.Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }

    Write-Info "Downloading Node.js v$NodeVersion for win-$Arch..."
    $MsiUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-$Arch.msi"
    $MsiPath = Join-Path $env:TEMP "node-install.msi"

    Invoke-WebRequest -Uri $MsiUrl -OutFile $MsiPath -UseBasicParsing

    Write-Info "Installing Node.js (requires administrator privileges)..."
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$MsiPath`" /quiet /norestart"
    Remove-Item $MsiPath

    # Refresh PATH for current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Ok "Node.js v$NodeVersion installed"
}

$NodeVer = & node -v
$NpmVer = & npm -v
Write-Ok "Node.js $NodeVer"
Write-Ok "npm $NpmVer"

# --- Install Erii ---
Write-Step "[2/3] Installing @spcookie/erii globally..."
& npm install -g @spcookie/erii
Write-Ok "@spcookie/erii installed"

# --- Run Setup ---
Write-Step "[3/3] Running erii setup..."
& erii setup

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "     Setup Complete!                    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nStart the server with:" -ForegroundColor White
Write-Host "  erii server" -ForegroundColor Yellow
