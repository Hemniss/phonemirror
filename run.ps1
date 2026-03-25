# PhoneMirror — Lancer l'application (Windows)
# Usage : .\run.ps1 [dev|build|start|install]

param(
    [string]$Mode = "build"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Trouver le binaire de production
function Find-Binary {
    $bin = Join-Path $ScriptDir "src-tauri\target\release\phonemirror.exe"
    if (Test-Path $bin) { return $bin }
    # Tauri peut nommer le binaire d'après productName
    $bin = Join-Path $ScriptDir "src-tauri\target\release\PhoneMirror.exe"
    if (Test-Path $bin) { return $bin }
    return $null
}

switch ($Mode.ToLower()) {
    "dev" {
        Write-Host ">> Lancement en mode developpement..." -ForegroundColor Cyan
        npm run tauri dev
    }
    "build" {
        Write-Host ">> Build de production..." -ForegroundColor Cyan
        npm run tauri build
        if ($LASTEXITCODE -ne 0) { Write-Host "Erreur lors du build." -ForegroundColor Red; exit 1 }

        $bin = Find-Binary
        if (-not $bin) { Write-Host "Binaire introuvable apres le build." -ForegroundColor Red; exit 1 }

        Write-Host "`n>> Build termine !" -ForegroundColor Green
        Write-Host ">> Lancement de PhoneMirror..." -ForegroundColor Cyan
        Start-Process -FilePath $bin
    }
    "start" {
        $bin = Find-Binary
        if (-not $bin) {
            Write-Host "Binaire introuvable. Lancez d'abord : .\run.ps1 build" -ForegroundColor Red
            exit 1
        }
        Write-Host ">> Lancement de PhoneMirror..." -ForegroundColor Cyan
        Start-Process -FilePath $bin
    }
    "install" {
        $bin = Find-Binary
        if (-not $bin) {
            Write-Host "Binaire introuvable. Lancez d'abord : .\run.ps1 build" -ForegroundColor Red
            exit 1
        }
        $icon = Join-Path $ScriptDir "assets\app-icon.png"

        # Créer un raccourci sur le Bureau
        $desktop = [Environment]::GetFolderPath("Desktop")
        $shortcutPath = Join-Path $desktop "PhoneMirror.lnk"
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $bin
        $shortcut.WorkingDirectory = $ScriptDir
        $shortcut.Description = "Streamez votre telephone Android sur votre PC"
        $shortcut.WindowStyle = 1
        # Utiliser l'icône du .exe (Tauri l'embarque)
        $shortcut.IconLocation = "$bin,0"
        $shortcut.Save()
        Write-Host "Raccourci cree sur le Bureau : $shortcutPath" -ForegroundColor Green

        # Créer aussi dans le menu Démarrer
        $startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
        $startShortcut = Join-Path $startMenu "PhoneMirror.lnk"
        $shortcut2 = $shell.CreateShortcut($startShortcut)
        $shortcut2.TargetPath = $bin
        $shortcut2.WorkingDirectory = $ScriptDir
        $shortcut2.Description = "Streamez votre telephone Android sur votre PC"
        $shortcut2.WindowStyle = 1
        $shortcut2.IconLocation = "$bin,0"
        $shortcut2.Save()
        Write-Host "Raccourci cree dans le menu Demarrer : $startShortcut" -ForegroundColor Green

        Write-Host "`nPhoneMirror est maintenant accessible sans terminal !" -ForegroundColor Green
    }
    default {
        Write-Host "Usage : .\run.ps1 [dev|build|start|install]" -ForegroundColor White
        Write-Host "  build   - Compile et lance l'application (defaut)" -ForegroundColor White
        Write-Host "  start   - Lance le binaire deja compile" -ForegroundColor White
        Write-Host "  dev     - Mode developpement avec hot-reload" -ForegroundColor White
        Write-Host "  install - Cree des raccourcis (Bureau + menu Demarrer)" -ForegroundColor White
        exit 1
    }
}
