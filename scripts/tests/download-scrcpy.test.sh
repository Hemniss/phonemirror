#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/tests/download-scrcpy.test.sh
# Tests de la vérification d'empreinte de scripts/download-scrcpy.sh.
# Aucun accès réseau : un faux `curl` sert des fichiers locaux et un faux
# `uname` force la cible Linux x86_64, quel que soit l'OS qui lance le test.
# Usage : bash scripts/tests/download-scrcpy.test.sh   (code non nul si échec)
# ─────────────────────────────────────────────────────────────────────────────

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/scripts/download-scrcpy.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

FAILED=0
PASSED=0

sha256_of() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | awk '{print $1}'
    else
        shasum -a 256 "$1" | awk '{print $1}'
    fi
}

# ─── Faux outils ─────────────────────────────────────────────────────────────
BIN="$WORK/bin"
mkdir -p "$BIN"

# Faux curl : sert $FAKE_SERVE/<nom de fichier de l'URL>, code 22 s'il manque.
cat > "$BIN/curl" <<'EOF'
#!/usr/bin/env bash
out="" url=""
while [ $# -gt 0 ]; do
    case "$1" in
        -o) out="$2"; shift 2 ;;
        -*) shift ;;
        *)  url="$1"; shift ;;
    esac
done
src="$FAKE_SERVE/${url##*/}"
[ -f "$src" ] || exit 22
cp "$src" "$out"
EOF
cat > "$BIN/uname" <<'EOF'
#!/usr/bin/env bash
case "${1:-}" in
    -m) echo x86_64 ;;
    *)  echo Linux ;;
esac
EOF
chmod +x "$BIN/curl" "$BIN/uname"

# Fabrique une fausse archive scrcpy pour une version donnée dans $1.
make_archive() {
    local serve="$1" version="$2"
    local name="scrcpy-linux-x86_64-v${version}"
    local build="$WORK/build-$$-$RANDOM"
    mkdir -p "$build/$name"
    echo "fake scrcpy $version" > "$build/$name/scrcpy"
    echo "fake adb" > "$build/$name/adb"
    tar -czf "$serve/$name.tar.gz" -C "$build" "$name"
    rm -rf "$build"
}

# Prépare un cas : dossier de travail avec un DEST déjà rempli (marqueur).
# Variables posées : CASE_DIR, SERVE
new_case() {
    CASE_DIR="$WORK/case-$1"
    SERVE="$CASE_DIR/serve"
    mkdir -p "$CASE_DIR/src-tauri/resources/scrcpy" "$SERVE"
    echo "ancien" > "$CASE_DIR/src-tauri/resources/scrcpy/marqueur"
}

# Lance le script ; pose RC et OUT.
run_script() {
    OUT="$(cd "$CASE_DIR" && env PATH="$BIN:$PATH" FAKE_SERVE="$SERVE" "$@" bash "$SCRIPT" "${VERSION_ARG[@]}" 2>&1)"
    RC=$?
}

pass() { PASSED=$((PASSED + 1)); echo "  ✔ $1"; }
fail() { FAILED=$((FAILED + 1)); echo "  ✘ $1"; echo "$OUT" | sed 's/^/      | /'; }

expect_fail_untouched() {
    local label="$1"
    if [ "$RC" -ne 0 ]; then pass "$label : code non nul ($RC)"; else fail "$label : code 0 attendu non nul"; fi
    if [ -f "$CASE_DIR/src-tauri/resources/scrcpy/marqueur" ] \
        && [ ! -f "$CASE_DIR/src-tauri/resources/scrcpy/scrcpy" ]; then
        pass "$label : destination intacte"
    else
        fail "$label : destination modifiée"
    fi
}

expect_message() {
    local label="$1" pattern="$2"
    if printf '%s' "$OUT" | grep -qi -- "$pattern"; then
        pass "$label : message « $pattern »"
    else
        fail "$label : message « $pattern » absent"
    fi
}

# ─── Cas ─────────────────────────────────────────────────────────────────────

echo "1. SHA256SUMS.txt indisponible, version non épinglée"
new_case sums-absent
make_archive "$SERVE" 9.9
VERSION_ARG=(9.9); run_script
expect_fail_untouched "sums indisponible"
expect_message "sums indisponible" "SHA256SUMS.txt"

echo "2. Empreinte différente"
new_case mismatch
make_archive "$SERVE" 9.9
echo "0000000000000000000000000000000000000000000000000000000000000000  scrcpy-linux-x86_64-v9.9.tar.gz" > "$SERVE/SHA256SUMS.txt"
VERSION_ARG=(9.9); run_script
expect_fail_untouched "empreinte différente"
expect_message "empreinte différente" "invalide"

echo "3. Empreinte absente du fichier de sommes"
new_case missing
make_archive "$SERVE" 9.9
echo "1111111111111111111111111111111111111111111111111111111111111111  scrcpy-win64-v9.9.zip" > "$SERVE/SHA256SUMS.txt"
VERSION_ARG=(9.9); run_script
expect_fail_untouched "empreinte absente"
expect_message "empreinte absente" "absente"

echo "4. Empreinte juste (version non épinglée)"
new_case ok
make_archive "$SERVE" 9.9
echo "$(sha256_of "$SERVE/scrcpy-linux-x86_64-v9.9.tar.gz")  scrcpy-linux-x86_64-v9.9.tar.gz" > "$SERVE/SHA256SUMS.txt"
VERSION_ARG=(9.9); run_script
if [ "$RC" -eq 0 ]; then pass "empreinte juste : code 0"; else fail "empreinte juste : code $RC"; fi
if [ -f "$CASE_DIR/src-tauri/resources/scrcpy/scrcpy" ] && [ -f "$CASE_DIR/src-tauri/resources/scrcpy/adb" ]; then
    pass "empreinte juste : fichiers installés"
else
    fail "empreinte juste : fichiers absents"
fi

echo "5. Version 4.1 : l'empreinte épinglée prime sur SHA256SUMS.txt"
new_case pinned
make_archive "$SERVE" 4.1
echo "$(sha256_of "$SERVE/scrcpy-linux-x86_64-v4.1.tar.gz")  scrcpy-linux-x86_64-v4.1.tar.gz" > "$SERVE/SHA256SUMS.txt"
VERSION_ARG=(4.1); run_script
expect_fail_untouched "4.1 épinglée"
expect_message "4.1 épinglée" "invalide"

echo "6. SCRCPY_SKIP_CHECKSUM=1"
new_case skip
make_archive "$SERVE" 9.9
VERSION_ARG=(9.9); run_script SCRCPY_SKIP_CHECKSUM=1
if [ "$RC" -eq 0 ]; then pass "skip : code 0"; else fail "skip : code $RC"; fi
expect_message "skip" "SCRCPY_SKIP_CHECKSUM"

echo ""
echo "Résultat : $PASSED réussis, $FAILED échoués"
[ "$FAILED" -eq 0 ]
