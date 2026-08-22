#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/download-scrcpy.sh
# Télécharge et extrait scrcpy dans src-tauri/resources/scrcpy/, d'où Tauri
# l'embarque dans l'installeur (voir bundle.resources dans tauri.conf.json).
# Usage : bash scripts/download-scrcpy.sh [version]
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRCPY_VERSION="${1:-4.1}"
BASE_URL="https://github.com/Genymobile/scrcpy/releases/download/v${SCRCPY_VERSION}"
DEST="src-tauri/resources/scrcpy"
TMP=".scrcpy-download"

OS="$(uname -s)"
ARCH="$(uname -m)"

echo "🔍 OS: $OS | Arch: $ARCH | scrcpy v$SCRCPY_VERSION"

rm -rf "$TMP"
mkdir -p "$TMP" "$DEST"
trap 'rm -rf "$TMP"' EXIT

# ─── Utilitaires ─────────────────────────────────────────────────────────────

# Convertit un chemin POSIX en chemin Windows quand on tourne sous Git Bash.
to_native_path() {
    if command -v cygpath >/dev/null 2>&1; then
        cygpath -w "$1"
    else
        printf '%s' "$1"
    fi
}

# Vérifie l'empreinte SHA256 d'un fichier contre le SHA256SUMS.txt de la release.
# On exécute ces binaires et on les redistribue : l'intégrité doit être vérifiée.
verify_checksum() {
    local file="$1" name="$2"

    local sums="$TMP/SHA256SUMS.txt"
    if ! curl -fsSL -o "$sums" "$BASE_URL/SHA256SUMS.txt" 2>/dev/null; then
        echo "⚠️  SHA256SUMS.txt indisponible — vérification ignorée"
        return 0
    fi

    local expected
    expected="$(grep -F " $name" "$sums" | head -1 | awk '{print $1}')"
    if [ -z "$expected" ]; then
        echo "⚠️  Empreinte absente pour $name — vérification ignorée"
        return 0
    fi

    local actual
    if command -v sha256sum >/dev/null 2>&1; then
        actual="$(sha256sum "$file" | awk '{print $1}')"
    elif command -v shasum >/dev/null 2>&1; then
        actual="$(shasum -a 256 "$file" | awk '{print $1}')"
    else
        echo "⚠️  Aucun outil SHA256 — vérification ignorée"
        return 0
    fi

    if [ "$actual" != "$expected" ]; then
        echo "❌ Empreinte SHA256 invalide pour $name"
        echo "   attendu : $expected"
        echo "   obtenu  : $actual"
        exit 1
    fi
    echo "🔒 SHA256 vérifiée"
}

# Extrait une archive ZIP sans dépendre d'unzip (absent de Git for Windows).
extract_zip() {
    local zip="$1" dir="$2"
    mkdir -p "$dir"

    if command -v unzip >/dev/null 2>&1; then
        unzip -q -o "$zip" -d "$dir"
    elif command -v powershell.exe >/dev/null 2>&1; then
        powershell.exe -NoProfile -NonInteractive -Command \
            "Expand-Archive -LiteralPath '$(to_native_path "$zip")' -DestinationPath '$(to_native_path "$dir")' -Force"
    else
        echo "❌ Aucun outil d'extraction ZIP (unzip ou PowerShell requis)"
        exit 1
    fi
}

# Copie le contenu du dossier extrait (un seul sous-dossier racine) vers $DEST.
install_from() {
    local root="$1"
    if [ ! -d "$root" ]; then
        root="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)"
    fi
    [ -d "$root" ] || { echo "❌ Dossier extrait introuvable"; exit 1; }

    rm -rf "${DEST:?}"/*
    cp -r "$root"/. "$DEST/"
}

# ─── Cibles ──────────────────────────────────────────────────────────────────

download_windows() {
    local name="scrcpy-win64-v${SCRCPY_VERSION}.zip"
    local zip="$TMP/$name"

    echo "⬇️  Téléchargement Windows : $BASE_URL/$name"
    curl -fsSL -o "$zip" "$BASE_URL/$name"
    verify_checksum "$zip" "$name"

    echo "📦 Extraction..."
    extract_zip "$zip" "$TMP/extract"
    install_from "$TMP/extract/scrcpy-win64-v${SCRCPY_VERSION}"

    echo "✅ scrcpy Windows installé dans $DEST"
}

download_linux() {
    local name="scrcpy-linux-x86_64-v${SCRCPY_VERSION}.tar.gz"
    local tarball="$TMP/$name"

    echo "⬇️  Téléchargement Linux : $BASE_URL/$name"
    curl -fsSL -o "$tarball" "$BASE_URL/$name"
    verify_checksum "$tarball" "$name"

    echo "📦 Extraction..."
    tar -xzf "$tarball" -C "$TMP"
    install_from "$TMP/scrcpy-linux-x86_64-v${SCRCPY_VERSION}"
    chmod +x "$DEST/scrcpy" "$DEST/adb" 2>/dev/null || true

    echo "✅ scrcpy Linux installé dans $DEST"
}

# ─── Détection de plateforme ─────────────────────────────────────────────────

case "$OS" in
    Linux*)
        # Le workflow peut demander un bundle Windows depuis un runner Linux.
        if [ "${TAURI_TARGET:-}" = "x86_64-pc-windows-msvc" ]; then
            download_windows
        else
            download_linux
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        download_windows
        ;;
    Darwin*)
        # Pas d'embarquement sur macOS : l'app utilise scrcpy du PATH (Homebrew).
        if command -v scrcpy >/dev/null 2>&1; then
            echo "✅ scrcpy trouvé dans le PATH : $(command -v scrcpy)"
        else
            echo "⚠️  scrcpy introuvable. Installez-le : brew install scrcpy"
        fi
        # Tauri échoue si le dossier de ressources déclaré est vide : on y laisse
        # un marqueur pour que le build macOS local aboutisse malgré tout.
        printf '%s\n' \
            "scrcpy n'est pas embarqué dans les builds macOS." \
            "Installez-le : brew install scrcpy android-platform-tools" \
            > "$DEST/README.txt"
        exit 0
        ;;
    *)
        echo "❌ OS non reconnu : $OS"
        exit 1
        ;;
esac

echo ""
echo "📋 Contenu de $DEST :"
ls -la "$DEST/"
