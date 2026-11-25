#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/tests/install.test.sh
# Contrôles statiques de install.sh (il ne peut tourner que sous Linux, avec
# sudo) : syntaxe, version de scrcpy fixée et vérifiée, règle udev restreinte.
# L'exécution réelle reste à faire sur une machine Linux.
# Usage : bash scripts/tests/install.test.sh   (code non nul si échec)
# ─────────────────────────────────────────────────────────────────────────────

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FILE="$ROOT/install.sh"
FAILED=0
PASSED=0

check() {
    local label="$1"; shift
    if "$@"; then PASSED=$((PASSED + 1)); echo "  ✔ $label"
    else FAILED=$((FAILED + 1)); echo "  ✘ $label"; fi
}
absent()  { ! grep -qF -- "$1" "$FILE"; }
present() { grep -qF -- "$1" "$FILE"; }

# Le premier sudo du bloc scrcpy doit venir après la vérification d'empreinte.
checksum_before_sudo() {
    local block check_line sudo_line
    block="$(awk '/^# ─── scrcpy/,/^# ─── ADB/' "$FILE")"
    check_line="$(printf '%s\n' "$block" | grep -n 'SCRCPY_SHA256' | grep -v '^[0-9]*:SCRCPY_SHA256=' | head -1 | cut -d: -f1)"
    sudo_line="$(printf '%s\n' "$block" | grep -n 'sudo ' | head -1 | cut -d: -f1)"
    [ -n "$check_line" ] && [ -n "$sudo_line" ] && [ "$check_line" -lt "$sudo_line" ]
}

echo "install.sh"
check "syntaxe valide (bash -n)" bash -n "$FILE"
check "ne lit plus releases/latest" absent "releases/latest"
check "plus de règle udev ouverte à tout idVendor" absent 'idVendor}=="*"'
check "scrcpy fixé à 4.1" present 'SCRCPY_VERSION="4.1"'
check "empreinte Linux 4.1 présente" present "ad56ae8bfeedf41e824945c11dbf55fcb092b3e615b9b486f48a50e30d389635"
check "règle udev limitée à l'interface adb ff/42/01" present 'ENV{ID_USB_INTERFACES}=="*:ff4201:*"'
check "empreinte vérifiée avant le premier sudo du bloc scrcpy" checksum_before_sudo

echo ""
echo "Résultat : $PASSED réussis, $FAILED échoués"
[ "$FAILED" -eq 0 ]
