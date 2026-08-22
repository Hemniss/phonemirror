#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/download-scrcpy.sh
# Télécharge et extrait scrcpy dans src-tauri/resources/scrcpy/
# Usage: bash scripts/download-scrcpy.sh [version]
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRCPY_VERSION="${1:-3.1}"
DEST="src-tauri/resources/scrcpy"

# Détection OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "🔍 OS: $OS | Arch: $ARCH | scrcpy v$SCRCPY_VERSION"

mkdir -p "$DEST"

download_windows() {
    local url="https://github.com/Genymobile/scrcpy/releases/download/v${SCRCPY_VERSION}/scrcpy-win64-v${SCRCPY_VERSION}.zip"
    local zip_path="/tmp/scrcpy-win64.zip"

    echo "⬇️  Téléchargement Windows: $url"
    curl -fsSL -o "$zip_path" "$url"

    echo "📦 Extraction..."
    unzip -q -o "$zip_path" -d /tmp/scrcpy-win64-extract

    local extracted_dir="/tmp/scrcpy-win64-extract/scrcpy-win64-v${SCRCPY_VERSION}"
    if [ ! -d "$extracted_dir" ]; then
        extracted_dir=$(find /tmp/scrcpy-win64-extract -mindepth 1 -maxdepth 1 -type d | head -1)
    fi

    cp -r "$extracted_dir"/. "$DEST/"

    rm -f "$zip_path"
    rm -rf /tmp/scrcpy-win64-extract
    echo "✅ scrcpy Windows installé dans $DEST"
}

download_linux() {
    local url="https://github.com/Genymobile/scrcpy/releases/download/v${SCRCPY_VERSION}/scrcpy-linux-v${SCRCPY_VERSION}.tar.gz"
    local tar_path="/tmp/scrcpy-linux.tar.gz"

    echo "⬇️  Téléchargement Linux: $url"
    curl -fsSL -o "$tar_path" "$url"

    echo "📦 Extraction..."
    tar -xzf "$tar_path" -C /tmp/

    local extracted_dir="/tmp/scrcpy-linux-v${SCRCPY_VERSION}"
    if [ ! -d "$extracted_dir" ]; then
        extracted_dir=$(find /tmp -maxdepth 1 -name "scrcpy-*" -type d | head -1)
    fi

    cp -r "$extracted_dir"/. "$DEST/"
    chmod +x "$DEST/scrcpy" "$DEST/adb" 2>/dev/null || true

    rm -f "$tar_path"
    rm -rf "$extracted_dir"
    echo "✅ scrcpy Linux installé dans $DEST"
}

# Logique de détection
case "$OS" in
    Linux*)
        # Vérifier si on est dans un contexte cross-compile Windows
        if [ "${TAURI_TARGET:-}" = "x86_64-pc-windows-msvc" ]; then
            download_windows
        else
            download_linux
        fi
        ;;
    Darwin*)
        # macOS — pas de release binaire officielle, on s'appuie sur le PATH (Homebrew)
        if command -v scrcpy &>/dev/null; then
            echo "✅ scrcpy trouvé dans PATH: $(which scrcpy)"
        else
            echo "⚠️  scrcpy introuvable. Installez-le via Homebrew :"
            echo "   brew install scrcpy"
        fi
        echo "   Le build utilisera scrcpy du PATH système."
        exit 0
        ;;
    MINGW*|MSYS*|CYGWIN*)
        download_windows
        ;;
    *)
        echo "❌ OS non reconnu: $OS"
        exit 1
        ;;
esac

echo ""
echo "📋 Contenu de $DEST:"
ls -la "$DEST/" 2>/dev/null || echo "   (dossier vide ou inexistant)"
