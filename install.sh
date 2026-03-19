#!/usr/bin/env bash
# PhoneMirror — Script d'installation des dépendances (Linux)
# Usage : bash install.sh

set -euo pipefail

# ─── Couleurs ─────────────────────────────────────────────────────────────
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

step()  { echo -e "\n${CYAN}>> $1${NC}"; }
ok()    { echo -e "   ${GREEN}[OK]${NC} $1"; }
skip()  { echo -e "   ${YELLOW}[--]${NC} $1"; }
fail()  { echo -e "   ${RED}[!!]${NC} $1"; exit 1; }

echo -e "\n${CYAN}============================================${NC}"
echo -e "${CYAN}   PhoneMirror — Installateur de dependances${NC}"
echo -e "${CYAN}============================================${NC}\n"

# ─── Détection du gestionnaire de paquets ─────────────────────────────────
step "Détection du système..."
if command -v apt-get &>/dev/null; then
    PKG="apt"
elif command -v dnf &>/dev/null; then
    PKG="dnf"
elif command -v pacman &>/dev/null; then
    PKG="pacman"
else
    fail "Gestionnaire de paquets non reconnu (apt/dnf/pacman requis)"
fi
ok "Système détecté : $PKG"

pkg_install() {
    case "$PKG" in
        apt)    sudo apt-get install -y "$@" ;;
        dnf)    sudo dnf install -y "$@" ;;
        pacman) sudo pacman -S --noconfirm "$@" ;;
    esac
}

# ─── Dépendances système pour Tauri ───────────────────────────────────────
step "Installation des dépendances système (Tauri / WebKit)..."
case "$PKG" in
    apt)
        sudo apt-get update -qq
        pkg_install \
            libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev \
            librsvg2-dev patchelf libxdo-dev curl build-essential
        ;;
    dnf)
        pkg_install \
            gtk3-devel webkit2gtk4.1-devel libappindicator-gtk3-devel \
            librsvg2-devel patchelf xdotool curl gcc
        ;;
    pacman)
        pkg_install \
            gtk3 webkit2gtk-4.1 libappindicator-gtk3 librsvg \
            patchelf xdotool curl base-devel
        ;;
esac
ok "Dépendances système installées"

# ─── Node.js ──────────────────────────────────────────────────────────────
step "Vérification de Node.js..."
if command -v node &>/dev/null; then
    skip "Node.js déjà installé ($(node --version))"
else
    echo "   Installation de Node.js via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - 2>/dev/null || \
        pkg_install nodejs
    ok "Node.js installé ($(node --version))"
fi

# ─── Rust ─────────────────────────────────────────────────────────────────
step "Vérification de Rust..."
if command -v cargo &>/dev/null; then
    skip "Rust déjà installé ($(rustc --version))"
else
    echo "   Installation de Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    source "$HOME/.cargo/env"
    ok "Rust installé ($(rustc --version))"
fi

# S'assurer que cargo est dans le PATH pour la suite
if ! command -v cargo &>/dev/null; then
    source "$HOME/.cargo/env" 2>/dev/null || export PATH="$HOME/.cargo/bin:$PATH"
fi

# ─── scrcpy ───────────────────────────────────────────────────────────────
step "Vérification de scrcpy..."
if command -v scrcpy &>/dev/null; then
    skip "scrcpy déjà installé ($(scrcpy --version 2>&1 | head -1))"
else
    echo "   Installation de scrcpy..."
    case "$PKG" in
        apt)    pkg_install scrcpy ;;
        dnf)    pkg_install scrcpy ;;
        pacman) pkg_install scrcpy ;;
    esac
    ok "scrcpy installé"
fi

# ─── ADB ──────────────────────────────────────────────────────────────────
step "Vérification de ADB..."
if command -v adb &>/dev/null; then
    skip "ADB déjà installé ($(adb version 2>&1 | head -1))"
else
    echo "   Installation de ADB (android-tools)..."
    case "$PKG" in
        apt)    pkg_install adb ;;
        dnf)    pkg_install android-tools ;;
        pacman) pkg_install android-tools ;;
    esac
    ok "ADB installé"
fi

# ─── Règle udev pour les appareils Android ────────────────────────────────
step "Configuration des règles udev (accès USB Android)..."
UDEV_RULE='SUBSYSTEM=="usb", ATTR{idVendor}=="*", MODE="0664", GROUP="plugdev"'
UDEV_FILE="/etc/udev/rules.d/51-android.rules"
if [ -f "$UDEV_FILE" ]; then
    skip "Règles udev déjà configurées"
else
    echo "$UDEV_RULE" | sudo tee "$UDEV_FILE" > /dev/null
    sudo chmod a+r "$UDEV_FILE"
    sudo udevadm control --reload-rules 2>/dev/null || true
    sudo usermod -aG plugdev "$USER" 2>/dev/null || true
    ok "Règles udev configurées (reconnectez-vous pour que le groupe plugdev soit actif)"
fi

# ─── npm install ──────────────────────────────────────────────────────────
step "Installation des dépendances npm..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
npm install
ok "Dépendances npm installées"

# ─── Résumé ───────────────────────────────────────────────────────────────
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}   Installation terminée !${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "\nPour lancer l'application en mode dev :"
echo -e "   ${CYAN}npm run tauri dev${NC}"
echo -e "\nPour compiler l'application :"
echo -e "   ${CYAN}npm run tauri build${NC}"
echo -e "\n${YELLOW}Note :${NC} Si vous venez d'installer Rust, rechargez votre terminal :"
echo -e "   ${CYAN}source \$HOME/.cargo/env${NC}"
echo ""
