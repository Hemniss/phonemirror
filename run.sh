#!/usr/bin/env bash
# PhoneMirror — Lancer l'application
# Usage : bash run.sh [dev|build|start|install]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Charger Rust/Cargo si nécessaire
if ! command -v cargo &>/dev/null; then
    source "$HOME/.cargo/env" 2>/dev/null || true
fi

# Trouver le binaire de production (ou le .app sur macOS)
find_binary() {
    local bin="$SCRIPT_DIR/src-tauri/target/release/phonemirror"
    if [ -f "$bin" ] && [ -x "$bin" ]; then
        echo "$bin"
        return 0
    fi
    return 1
}

find_app_bundle() {
    local app="$SCRIPT_DIR/src-tauri/target/release/bundle/macos/PhoneMirror.app"
    if [ -d "$app" ]; then
        echo "$app"
        return 0
    fi
    return 1
}

MODE="${1:-build}"

case "$MODE" in
    dev)
        echo "🚀 Lancement en mode développement..."
        npm run tauri dev
        ;;
    build)
        echo "📦 Build de production..."
        # Sur macOS, la création du DMG pilote le Finder via AppleScript, ce qui
        # expire hors session graphique interactive. CI=true fait sauter cette
        # étape purement cosmétique à create-dmg.
        if [ "$(uname -s)" = "Darwin" ]; then
            export CI=true
        fi
        npm run tauri build
        echo ""
        echo "✅ Build terminé !"
        BIN=$(find_binary) || { echo "❌ Binaire introuvable après le build."; exit 1; }
        echo "🚀 Lancement de PhoneMirror..."
        exec "$BIN"
        ;;
    start)
        if [ "$(uname -s)" = "Darwin" ]; then
            APP=$(find_app_bundle) && { open "$APP"; exit 0; } || true
        fi
        BIN=$(find_binary) || { echo "❌ Binaire introuvable. Lancez d'abord : ./run.sh build"; exit 1; }
        echo "🚀 Lancement de PhoneMirror..."
        exec "$BIN"
        ;;
    install)
        if [ "$(uname -s)" = "Darwin" ]; then
            APP=$(find_app_bundle) || { echo "❌ Bundle .app introuvable. Lancez d'abord : ./run.sh build"; exit 1; }
            echo "📦 Copie de PhoneMirror.app dans /Applications..."
            # PHONEMIRROR_APPS_DIR ne sert qu'aux tests.
            APPS_DIR="${PHONEMIRROR_APPS_DIR:-/Applications}"
            DEST="$APPS_DIR/PhoneMirror.app"
            STAGE="$APPS_DIR/.PhoneMirror.app.nouveau"
            # Copier à côté, puis échanger : `cp` vers une app existante placerait
            # la nouvelle à l'intérieur, et un échec de copie garde l'ancienne.
            rm -rf "$STAGE"
            cp -R "$APP" "$STAGE" || { rm -rf "$STAGE"; echo "❌ Copie impossible : rien n'a été modifié."; exit 1; }
            rm -rf "$DEST"
            mv "$STAGE" "$DEST"
            echo "✅ PhoneMirror installé dans /Applications."
            echo "   Vous pouvez le lancer depuis le Launchpad ou Spotlight."
            exit 0
        fi
        BIN=$(find_binary) || { echo "❌ Binaire introuvable. Lancez d'abord : ./run.sh build"; exit 1; }
        ICON="$SCRIPT_DIR/assets/app-icon.png"
        DESKTOP_FILE="$HOME/.local/share/applications/phonemirror.desktop"
        mkdir -p "$(dirname "$DESKTOP_FILE")"
        cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=PhoneMirror
Comment=Streamez votre téléphone Android sur votre PC
Exec=$BIN
Icon=$ICON
Terminal=false
Type=Application
Categories=Utility;Development;
StartupWMClass=PhoneMirror
EOF
        chmod +x "$DESKTOP_FILE"
        echo "✅ Raccourci créé : $DESKTOP_FILE"
        echo "   PhoneMirror est maintenant dans votre menu d'applications."
        echo "   Vous pouvez le lancer sans terminal !"
        ;;
    *)
        echo "Usage : ./run.sh [dev|build|start|install]"
        echo "  build   — Compile et lance l'application (défaut)"
        echo "  start   — Lance le binaire déjà compilé"
        echo "  dev     — Mode développement avec hot-reload"
        echo "  install — Linux : raccourci dans le menu des applications ; macOS : copie dans /Applications"
        exit 1
        ;;
esac
