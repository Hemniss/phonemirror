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

# Empreintes SHA256 de la version par défaut, relevées le 25/11/2026 dans le
# SHA256SUMS.txt de la release v4.1 (et revérifiées). Elles priment sur le
# fichier de sommes téléchargé, qui vient du même endroit que l'archive.
# install.sh installe aussi scrcpy 4.1 sous Linux : garder les deux alignés.
pinned_sha256() {
    case "$1" in
        scrcpy-linux-x86_64-v4.1.tar.gz)  echo "ad56ae8bfeedf41e824945c11dbf55fcb092b3e615b9b486f48a50e30d389635" ;;
        scrcpy-win64-v4.1.zip)            echo "5b12172b3264b2889f4583ee64752ce832e29bc8b1089dca81093459697165db" ;;
        scrcpy-macos-aarch64-v4.1.tar.gz) echo "20fd47c9014dd5e0fa77091f3cb7adbda8445a360c4584aeaa0150b5b3988ff3" ;;
        scrcpy-macos-x86_64-v4.1.tar.gz)  echo "ee2a7223bc8dbdc4f482db1134bcf441178dafb833492b71ca4c22090c58ce72" ;;
        *) echo "" ;;
    esac
}

# Vérifie l'empreinte SHA256 d'une archive avant toute extraction.
# On exécute ces binaires et on les redistribue : tout échec arrête le script.
# Seule SCRCPY_SKIP_CHECKSUM=1 permet de passer outre (jamais en CI).
verify_checksum() {
    local file="$1" name="$2"

    if [ "${SCRCPY_SKIP_CHECKSUM:-}" = "1" ]; then
        echo "⚠️  ATTENTION : SCRCPY_SKIP_CHECKSUM=1 — empreinte SHA256 NON vérifiée pour $name"
        return 0
    fi

    local expected source
    expected="$(pinned_sha256 "$name")"
    source="empreinte épinglée dans le script"
    if [ -z "$expected" ]; then
        local sums="$TMP/SHA256SUMS.txt"
        if ! curl -fsSL -o "$sums" "$BASE_URL/SHA256SUMS.txt" 2>/dev/null; then
            echo "❌ SHA256SUMS.txt indisponible pour v$SCRCPY_VERSION : vérification impossible"
            echo "   (SCRCPY_SKIP_CHECKSUM=1 pour passer outre, à vos risques)"
            exit 1
        fi
        expected="$(grep -F " $name" "$sums" | head -1 | awk '{print $1}' || true)"
        source="SHA256SUMS.txt de la release"
        if [ -z "$expected" ]; then
            echo "❌ Empreinte absente de SHA256SUMS.txt pour $name"
            exit 1
        fi
    fi

    local actual
    if command -v sha256sum >/dev/null 2>&1; then
        actual="$(sha256sum "$file" | awk '{print $1}')"
    elif command -v shasum >/dev/null 2>&1; then
        actual="$(shasum -a 256 "$file" | awk '{print $1}')"
    else
        echo "❌ Aucun outil SHA256 (sha256sum ou shasum) : vérification impossible"
        exit 1
    fi

    if [ "$actual" != "$expected" ]; then
        echo "❌ Empreinte SHA256 invalide pour $name ($source)"
        echo "   attendu : $expected"
        echo "   obtenu  : $actual"
        exit 1
    fi
    echo "🔒 SHA256 vérifiée ($source)"
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

download_macos() {
    # Les archives macOS sont publiées par architecture : arm64 côté uname,
    # aarch64 côté nom de fichier.
    local arch
    case "$ARCH" in
        arm64|aarch64) arch="aarch64" ;;
        x86_64)        arch="x86_64" ;;
        *) echo "❌ Architecture macOS non gérée : $ARCH"; exit 1 ;;
    esac

    local name="scrcpy-macos-${arch}-v${SCRCPY_VERSION}.tar.gz"
    local tarball="$TMP/$name"

    echo "⬇️  Téléchargement macOS : $BASE_URL/$name"
    curl -fsSL -o "$tarball" "$BASE_URL/$name"
    verify_checksum "$tarball" "$name"

    echo "📦 Extraction..."
    tar -xzf "$tarball" -C "$TMP"
    install_from "$TMP/scrcpy-macos-${arch}-v${SCRCPY_VERSION}"
    chmod +x "$DEST/scrcpy" "$DEST/adb" 2>/dev/null || true

    echo "✅ scrcpy macOS ($arch) installé dans $DEST"
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
        download_macos
        ;;
    *)
        echo "❌ OS non reconnu : $OS"
        exit 1
        ;;
esac

echo ""
echo "📋 Contenu de $DEST :"
ls -la "$DEST/"
