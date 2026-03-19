# PhoneMirror

**Streamez votre téléphone Android sur votre PC** — interface graphique moderne pour [scrcpy](https://github.com/Genymobile/scrcpy).

![PhoneMirror Dashboard](docs/screenshot.png)

## Fonctionnalités

- **Mirroring** en temps réel (USB & WiFi)
- **Enregistrement** de l'écran du téléphone
- **Audio** du téléphone sur le PC (Android 11+)
- **Transfert de fichiers** bidirectionnel (PC ↔ téléphone)
- **Profils** — sauvegardez vos configurations préférées
- **Thème sombre / clair**
- **Cross-platform** — Windows & Linux

## Prérequis

### Téléphone Android
1. Activer les **Options développeur** (tapper 7 fois sur "Numéro de build")
2. Activer le **Débogage USB**
3. Pour le WiFi Android 11+ : activer le **Débogage WiFi**

### PC
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (dernière version stable)
- Tauri CLI : `npm install -g @tauri-apps/cli`

#### Linux uniquement
```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
```

## Installation & Développement

```bash
# 1. Cloner le repo
git clone https://github.com/hemniss/phonemirror.git
cd phonemirror

# 2. Télécharger scrcpy (binaires bundlés)
bash scripts/download-scrcpy.sh

# 3. Installer les dépendances frontend
npm install

# 4. Lancer en mode développement
npm run tauri dev
```

## Build de production

```bash
# Générer les icônes d'abord (requis une seule fois)
# Créez un fichier icon.png (1024x1024) puis :
npx @tauri-apps/cli icon icon.png

# Build
npm run tauri build
```

Les installeurs se trouvent dans `src-tauri/target/release/bundle/`.

## Connexion WiFi

### Méthode USB → WiFi (recommandée)
1. Branchez le téléphone en USB
2. Dans PhoneMirror, cliquez sur **Miroir** sur la carte de votre appareil
3. Puis cliquez sur **Passer en WiFi** — l'app active automatiquement le mode TCP/IP

### Connexion directe
1. Cliquez sur **Connexion WiFi** dans la sidebar
2. Entrez l'IP du téléphone (visible dans Paramètres → À propos → Statut WiFi)
3. Port : `5555` (par défaut)

### Appairage Android 11+ (sans USB)
1. Cliquez sur **Connexion WiFi** → onglet **Appairage**
2. Sur votre téléphone : Paramètres → Options développeur → Débogage WiFi → Appairer avec un code
3. Entrez l'IP, le port et le code à 6 chiffres affichés sur le téléphone

## Architecture

```
phonemirror/
├── src-tauri/           # Backend Rust (Tauri 2)
│   ├── src/
│   │   ├── adb.rs       # Commandes ADB (liste, connexion, IP)
│   │   ├── scrcpy.rs    # Gestion des processus scrcpy
│   │   ├── profiles.rs  # Profils JSON persistés
│   │   └── lib.rs       # Entry point Tauri
│   └── resources/
│       └── scrcpy/      # Binaires scrcpy bundlés (généré par le script)
├── src/                 # Frontend React + TypeScript
│   ├── components/      # Composants réutilisables
│   ├── pages/           # Dashboard, Profiles, Settings
│   ├── store/           # État global Zustand
│   ├── hooks/           # useDevices (polling ADB)
│   ├── lib/tauri.ts     # Wrappers invoke Tauri
│   └── types/           # Types TypeScript partagés
└── scripts/
    └── download-scrcpy.sh  # Télécharge les binaires scrcpy
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| GUI Framework | [Tauri 2](https://tauri.app/) (Rust) |
| Frontend | [React 18](https://react.dev/) + TypeScript |
| Bundler | [Vite 5](https://vitejs.dev/) |
| Styles | [Tailwind CSS 3](https://tailwindcss.com/) |
| État | [Zustand 4](https://zustand-demo.pmnd.rs/) |
| Icônes | [Lucide React](https://lucide.dev/) |
| Mirror | [scrcpy 3.x](https://github.com/Genymobile/scrcpy) |

## Raccourcis scrcpy (dans la fenêtre de mirroring)

| Raccourci | Action |
|-----------|--------|
| `Ctrl+H` | Bouton Home |
| `Ctrl+B` | Bouton Retour |
| `Ctrl+M` | Bouton Menu |
| `Ctrl+↑/↓` | Volume +/- |
| `Ctrl+P` | Écran ON/OFF |
| `Ctrl+N` | Notifications |
| `Ctrl+F` | Plein écran |
| `Ctrl+R` | Rotation |

## Contribution

Les PRs sont les bienvenues ! Ouvrez une issue en premier pour discuter des changements majeurs.

```bash
git checkout -b feature/ma-fonctionnalite
# ... vos modifications ...
git commit -m "feat: ma nouvelle fonctionnalité"
git push origin feature/ma-fonctionnalite
```

## Licence

MIT — voir [LICENSE](LICENSE)

---

*Propulsé par [scrcpy](https://github.com/Genymobile/scrcpy) de Genymobile — un outil open source remarquable.*
