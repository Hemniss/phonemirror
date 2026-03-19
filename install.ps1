# PhoneMirror — Script d'installation des dépendances
# Exécuter en tant qu'administrateur : Right-click > "Run as administrator"

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-SKIP($msg) { Write-Host "   [--] $msg" -ForegroundColor Yellow }
function Write-FAIL($msg) { Write-Host "   [!!] $msg" -ForegroundColor Red }

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "   PhoneMirror — Installateur de dependances" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

# ─── Vérification winget ───────────────────────────────────────────────────
Write-Step "Verification de winget..."
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-FAIL "winget non trouve. Installez 'App Installer' depuis le Microsoft Store."
    exit 1
}
Write-OK "winget disponible"

# ─── Node.js ──────────────────────────────────────────────────────────────
Write-Step "Verification de Node.js..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node --version
    Write-SKIP "Node.js deja installe ($nodeVer)"
} else {
    Write-Host "   Installation de Node.js..." -ForegroundColor White
    winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    Write-OK "Node.js installe"
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# ─── Rust ─────────────────────────────────────────────────────────────────
Write-Step "Verification de Rust..."
if (Get-Command cargo -ErrorAction SilentlyContinue) {
    $rustVer = rustc --version
    Write-SKIP "Rust deja installe ($rustVer)"
} else {
    Write-Host "   Installation de Rust via rustup..." -ForegroundColor White
    winget install --id Rustlang.Rustup --silent --accept-package-agreements --accept-source-agreements
    Write-OK "Rust installe — relancez ce script apres redemarrage du terminal"
    Write-Host "`n   IMPORTANT: Fermez et rouvrez PowerShell, puis relancez ce script." -ForegroundColor Yellow
    exit 0
}

# ─── Visual Studio Build Tools ────────────────────────────────────────────
Write-Step "Verification des Build Tools C++..."
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasCpp = $false
if (Test-Path $vsWhere) {
    $instances = & $vsWhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -format json 2>$null | ConvertFrom-Json
    if ($instances.Count -gt 0) { $hasCpp = $true }
}
if ($hasCpp) {
    Write-SKIP "Build Tools C++ deja installes"
} else {
    Write-Host "   Installation des Visual Studio Build Tools..." -ForegroundColor White
    winget install --id Microsoft.VisualStudio.2022.BuildTools --silent --accept-package-agreements --accept-source-agreements `
        --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet --wait"
    Write-OK "Build Tools C++ installes"
}

# ─── scrcpy ───────────────────────────────────────────────────────────────
Write-Step "Verification de scrcpy..."
if (Get-Command scrcpy -ErrorAction SilentlyContinue) {
    $scrcpyVer = scrcpy --version 2>&1 | Select-Object -First 1
    Write-SKIP "scrcpy deja installe ($scrcpyVer)"
} else {
    Write-Host "   Installation de scrcpy..." -ForegroundColor White
    winget install --id Genymobile.scrcpy --silent --accept-package-agreements --accept-source-agreements
    Write-OK "scrcpy installe"
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# ─── ADB ──────────────────────────────────────────────────────────────────
Write-Step "Verification de ADB..."
if (Get-Command adb -ErrorAction SilentlyContinue) {
    $adbVer = adb version 2>&1 | Select-Object -First 1
    Write-SKIP "ADB deja installe ($adbVer)"
} else {
    Write-Host "   ADB est normalement inclus avec scrcpy." -ForegroundColor White
    Write-Host "   Si ADB manque, installation des Android Platform Tools..." -ForegroundColor White
    winget install --id Google.PlatformTools --silent --accept-package-agreements --accept-source-agreements
    Write-OK "Android Platform Tools installe"
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# ─── npm install ──────────────────────────────────────────────────────────
Write-Step "Installation des dependances npm..."
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
npm install
Write-OK "Dependances npm installees"

# ─── Résumé ───────────────────────────────────────────────────────────────
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "   Installation terminee !" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "`nPour lancer l'application en mode dev :" -ForegroundColor White
Write-Host "   npm run tauri dev" -ForegroundColor Cyan
Write-Host "`nPour compiler l'application :" -ForegroundColor White
Write-Host "   npm run tauri build" -ForegroundColor Cyan
Write-Host ""
