#!/usr/bin/env bash
# Tests de `run.sh install` sous macOS. Tout se passe dans un dossier temporaire :
# faux bundle, faux `uname` (le test tourne aussi sous Linux), et le dossier
# des applications est détourné par PHONEMIRROR_APPS_DIR.
# Usage : bash scripts/tests/run-install.test.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Garde-fou : sans cette variable, run.sh écrirait dans le vrai /Applications.
if ! grep -q 'PHONEMIRROR_APPS_DIR' "$ROOT/run.sh"; then
    echo "❌ run.sh ignore PHONEMIRROR_APPS_DIR : test interrompu avant toute copie"
    exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASSED=0
FAILED=0
check() {
    local label="$1"; shift
    if "$@"; then
        echo "  ✔ $label"; PASSED=$((PASSED + 1))
    else
        echo "  ✘ $label"; FAILED=$((FAILED + 1))
    fi
}

mkdir -p "$WORK/repo" "$WORK/bin" "$WORK/Apps"
cp "$ROOT/run.sh" "$WORK/repo/run.sh"
printf '#!/bin/sh\necho Darwin\n' > "$WORK/bin/uname"
chmod +x "$WORK/bin/uname"

SRC="$WORK/repo/src-tauri/target/release/bundle/macos/PhoneMirror.app"
DEST="$WORK/Apps/PhoneMirror.app"
mkdir -p "$SRC/Contents"

install_app() {
    PATH="$WORK/bin:$PATH" PHONEMIRROR_APPS_DIR="$WORK/Apps" \
        bash "$WORK/repo/run.sh" install >"$WORK/out.log" 2>&1
}
installed_version() { [ "$(cat "$DEST/Contents/version" 2>/dev/null)" = "$1" ]; }
absent() { [ ! -e "$1" ]; }
only_the_app() { [ "$(ls -A "$WORK/Apps")" = "PhoneMirror.app" ]; }

echo "1. Première installation"
echo v1 > "$SRC/Contents/version"
echo old > "$SRC/Contents/fichier-retire"
check "code 0" install_app
check "version 1 installée" installed_version v1

echo "2. Réinstallation par-dessus une copie existante"
echo v2 > "$SRC/Contents/version"
rm "$SRC/Contents/fichier-retire"
check "code 0" install_app
check "la version installée est la nouvelle" installed_version v2
check "aucune app imbriquée dans l'app" absent "$DEST/PhoneMirror.app"
check "aucun fichier de l'ancienne version" absent "$DEST/Contents/fichier-retire"
check "aucun dossier temporaire laissé" only_the_app

echo "3. Copie impossible : l'ancienne app reste en place"
printf '#!/bin/sh\nexit 1\n' > "$WORK/bin/cp"
chmod +x "$WORK/bin/cp"
echo v3 > "$SRC/Contents/version"
install_fails() { ! install_app; }
check "code non nul" install_fails
check "l'ancienne version est intacte" installed_version v2
rm "$WORK/bin/cp"

echo ""
echo "Résultat : $PASSED réussis, $FAILED échoués"
[ "$FAILED" -eq 0 ]
