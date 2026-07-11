# Erii Installer Script for Windows
# Installs Node.js LTS → @spcookie/erii

$ErrorActionPreference = "Stop"

# Ensure TLS 1.2 support on older Windows versions
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

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

function Write-Err {
    param([string]$Msg)
    Write-Host "  " -NoNewline
    Write-Host "✗" -ForegroundColor Red -NoNewline
    Write-Host " $Msg" -ForegroundColor Red
}

function Write-Warn {
    param([string]$Msg)
    Write-Host "  " -NoNewline
    Write-Host "⚠" -ForegroundColor Yellow -NoNewline
    Write-Host " $Msg" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Msg)
    Write-Host "  $Msg" -ForegroundColor Cyan
}

# Measure latency to a URL (seconds). Returns 999 on failure.
# Tries HEAD first, falls back to a ranged GET for servers that reject HEAD.
function Measure-Latency {
    param([string]$Url)
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 4 -UseBasicParsing | Out-Null
        $sw.Stop()
        return $sw.Elapsed.TotalSeconds
    } catch {
        try {
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            Invoke-WebRequest -Uri $Url -Headers @{ Range = "bytes=0-0" } -TimeoutSec 4 -UseBasicParsing | Out-Null
            $sw.Stop()
            return $sw.Elapsed.TotalSeconds
        } catch {
            return 999
        }
    }
}

# Select-Fastest -Probe "/index.json" -Candidates @(@{Label=..;Base=..}, ...)
# Returns the base URL with the lowest latency.
function Select-Fastest {
    param([string]$Probe, [hashtable[]]$Candidates)
    $best = $null
    $bestTime = [double]::MaxValue
    foreach ($c in $Candidates) {
        $t = Measure-Latency ($c.Base + $Probe)
        Write-Host ("    {0,-10} {1,7:N3}s  {2}" -f $c.Label, $t, $c.Base) -ForegroundColor DarkGray
        if ($t -lt $bestTime) { $bestTime = $t; $best = $c.Base }
    }
    return $best
}

Write-Host "========================================" -ForegroundColor Blue
Write-Host "     Erii Installer (Windows)           " -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue

# --- Check administrator privileges ---
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Warn "Not running as Administrator. The Node.js installer will request elevation via UAC prompt."
}

# --- Select fastest mirrors (China-friendly) ---
Write-Step "Selecting fastest mirror (testing latency)..."

if ($env:ERII_NODE_MIRROR) {
    $NodeDistBase = $env:ERII_NODE_MIRROR
    Write-Ok "Node.js source from `$ERII_NODE_MIRROR: $NodeDistBase"
} else {
    Write-Info "Node.js mirrors:"
    $NodeDistBase = Select-Fastest -Probe "/index.json" -Candidates @(
        @{ Label = "npmmirror"; Base = "https://cdn.npmmirror.com/binaries/node" },
        @{ Label = "tuna";      Base = "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release" },
        @{ Label = "official";  Base = "https://nodejs.org/dist" }
    )
    Write-Ok "Node.js source: $NodeDistBase"
}

if ($env:ERII_NPM_REGISTRY) {
    $NpmRegistry = $env:ERII_NPM_REGISTRY
    Write-Ok "npm registry from `$ERII_NPM_REGISTRY: $NpmRegistry"
} else {
    Write-Info "npm registries:"
    $NpmRegistry = Select-Fastest -Probe "/" -Candidates @(
        @{ Label = "npmmirror"; Base = "https://registry.npmmirror.com" },
        @{ Label = "official";  Base = "https://registry.npmjs.org" }
    )
    Write-Ok "npm registry: $NpmRegistry"
}

# --- Install Node.js ---
Write-Step "[1/3] Installing Node.js LTS..."

if (Get-Command node -ErrorAction SilentlyContinue) {
    $CurrentNode = & node -v
    Write-Ok "Node.js $CurrentNode already installed"
} else {
    # Get latest LTS version from the selected mirror's dist index
    try {
        Write-Info "Fetching latest Node.js LTS version..."
        $NodeIndex = Invoke-WebRequest -Uri "$NodeDistBase/index.json" -UseBasicParsing | ConvertFrom-Json
    } catch {
        Write-Err "Failed to fetch Node.js version list. Check your internet connection."
        exit 1
    }

    $NodeVersion = ($NodeIndex | Where-Object { $_.lts -ne $false } | Select-Object -First 1).version -replace 'v', ''
    if (-not $NodeVersion) {
        Write-Err "Failed to determine latest LTS version."
        exit 1
    }

    # Detect architecture
    $Arch = switch ($env:PROCESSOR_ARCHITECTURE) {
        "ARM64" { "arm64" }
        "AMD64" { "x64" }
        default {
            if ([System.Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
        }
    }

    $MsiUrl = "$NodeDistBase/v$NodeVersion/node-v$NodeVersion-$Arch.msi"
    $MsiPath = Join-Path $env:TEMP "node-install.msi"

    try {
        Write-Info "Downloading Node.js v$NodeVersion for win-$Arch..."
        Invoke-WebRequest -Uri $MsiUrl -OutFile $MsiPath -UseBasicParsing
    } catch {
        Write-Err "Failed to download Node.js from: $MsiUrl"
        if (Test-Path $MsiPath) { Remove-Item $MsiPath }
        exit 1
    }

    Write-Info "Installing Node.js..."
    $installProc = Start-Process msiexec.exe -Wait -PassThru -ArgumentList "/i `"$MsiPath`" /quiet /norestart"
    Remove-Item $MsiPath

    if ($installProc.ExitCode -ne 0) {
        Write-Err "Node.js MSI installer failed with exit code: $($installProc.ExitCode)"
        exit 1
    }

    # Refresh PATH for current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    # Verify installation
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Err "Node.js installed but 'node' command not found in PATH. Please restart your terminal."
        exit 1
    }

    Write-Ok "Node.js v$NodeVersion installed"
}

$NodeVer = & node -v
$NpmVer = & npm -v
Write-Ok "Node.js $NodeVer"
Write-Ok "npm $NpmVer"

# --- Install Erii ---
Write-Step "[2/3] Installing @spcookie/erii globally..."
& npm install -g @spcookie/erii --registry $NpmRegistry
Write-Ok "@spcookie/erii installed"

# --- Run Setup ---
Write-Step "[3/3] Running erii setup..."
& erii setup

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "     Setup Complete!                    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nStart the server with:" -ForegroundColor White
Write-Host "  erii server" -ForegroundColor Yellow
