# Erii Installer Script for Windows
# Installs NVM-Windows → Node.js LTS → @spcookie/erii

$ErrorActionPreference = "Stop"

$NvmVersion = "1.1.12"
$NvmZipUrl = "https://github.com/coreybutler/nvm-windows/releases/download/${NvmVersion}/nvm-noinstall.zip"

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

# --- Install NVM-Windows ---
Write-Step "[1/3] Installing NVM-Windows ${NvmVersion}..."

$NvmHome = Join-Path $env:LOCALAPPDATA "nvm"
$NvmSymlink = Join-Path $env:PROGRAMFILES "nodejs"

if (Test-Path $NvmHome) {
    Write-Ok "NVM-Windows already installed at $NvmHome"
} else {
    $TempZip = Join-Path $env:TEMP "nvm-noinstall.zip"
    $TempDir = Join-Path $env:TEMP "nvm-temp"

    Write-Info "Downloading NVM-Windows..."
    Invoke-WebRequest -Uri $NvmZipUrl -OutFile $TempZip -UseBasicParsing

    Write-Info "Extracting..."
    Expand-Archive -Path $TempZip -DestinationPath $NvmHome -Force
    Remove-Item $TempZip

    # Create settings.txt for nvm
    $SettingsPath = Join-Path $NvmHome "settings.txt"
    @"
root: $NvmHome
path: $NvmSymlink
node_mirror:
npm_mirror:
"@ | Set-Content -Path $SettingsPath -Encoding UTF8

    # Add to PATH for current session
    $env:NVM_HOME = $NvmHome
    $env:NVM_SYMLINK = $NvmSymlink
    $env:Path = "$NvmHome;$NvmSymlink;$env:Path"

    # Add to user PATH permanently
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($UserPath -notlike "*$NvmHome*") {
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$NvmHome", "User")
    }
    if ($UserPath -notlike "*$NvmSymlink*") {
        $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
        [Environment]::SetEnvironmentVariable("Path", "$UserPath;$NvmSymlink", "User")
    }

    # Set NVM_HOME / NVM_SYMLINK environment variables
    [Environment]::SetEnvironmentVariable("NVM_HOME", $NvmHome, "User")
    [Environment]::SetEnvironmentVariable("NVM_SYMLINK", $NvmSymlink, "User")

    Write-Ok "NVM-Windows installed to $NvmHome"
}

# Ensure nvm is in PATH for this session
if ($env:Path -notlike "*$NvmHome*") {
    $env:Path = "$NvmHome;$env:Path"
}
if ($env:Path -notlike "*$NvmSymlink*") {
    $env:Path = "$NvmSymlink;$env:Path"
}

# --- Install Node.js LTS ---
Write-Step "[2/3] Installing Node.js LTS..."

$NodeVersion = & nvm list 2>$null | Select-String "\*" | ForEach-Object { $_.ToString().Trim() -replace "\*\s*", "" }
if ($NodeVersion) {
    Write-Info "Node.js already active: $NodeVersion"
} else {
    Write-Info "Installing latest LTS Node.js..."
    & nvm install lts
    & nvm use lts
    Write-Ok "Node.js installed"
}

$NodeVer = & node -v
$NpmVer = & npm -v
Write-Ok "Node.js $NodeVer"
Write-Ok "npm $NpmVer"

# --- Install Erii ---
Write-Step "[3/3] Installing @spcookie/erii globally..."
& npm install -g @spcookie/erii
Write-Ok "@spcookie/erii installed"

# --- Run Setup ---
Write-Step "[4/4] Running erii setup..."
& erii setup

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "     Setup Complete!                    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nStart the server with:" -ForegroundColor White
Write-Host "  erii server" -ForegroundColor Yellow
