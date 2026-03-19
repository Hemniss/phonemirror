# PhoneMirror

**Streamez votre téléphone Android sur votre PC** — interface graphique moderne pour [scrcpy](https://github.com/Genymobile/scrcpy).

## Fonctionnalités

- **Mirroring** en temps réel (USB & WiFi)
- **Audio** du téléphone sur le PC (Android 11+)
- **Profils** — sauvegardez vos configurations préférées et appliquez-les en un clic
- **Tampon d'affichage** configurable pour réduire la latence
- **Rendu Direct3D** activé automatiquement sur Windows
- **Thème sombre / clair**
- **Connexion WiFi** directe ou par appairage (Android 11+)

## Installation (Windows)

La méthode la plus simple est d'utiliser le script d'installation fourni :

1. Clic droit sur `install.ps1` → **Exécuter avec PowerShell** (en tant qu'administrateur)
2. Le script installe automatiquement : Node.js, Rust, Visual Studio Build Tools C++, scrcpy, ADB
3. Une fois terminé, lancez l'application :

```powershell
npm run tauri dev
```

> **Note Windows** : Si vous avez Windows 11, désactivez **Smart App Control** avant de compiler
> (Sécurité Windows → Contrôle des applications → Paramètres de contrôle intelligent → Désactivé).
> Ce paramètre bloque les exécutables générés par Cargo pendant la compilation.

### Installation manuelle

Si vous préférez installer manuellement :

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) avec le workload **Développement Desktop en C++**
- [scrcpy](https://github.com/Genymobile/scrcpy) (via `winget install Genymobile.scrcpy`)

```bash
npm install
npm run tauri dev
```

#### Linux uniquement
```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
```

### Prérequis téléphone Android
1. Activer les **Options développeur** (tapper 7 fois sur "Numéro de build")
2. Activer le **Débogage USB**
3. Pour le WiFi Android 11+ : activer le **Débogage WiFi**

## Build de production

```bash
# Pour régénérer les icônes (si vous modifiez assets/app-icon.png) :
npm run tauri icon -- assets/app-icon.png

npm run tauri build
```

Les installeurs se trouvent dans `src-tauri/target/release/bundle/`.

## Utilisation

### Mirroring simple
1. Branchez votre téléphone en USB et acceptez la demande de débogage
2. L'appareil apparaît automatiquement dans le Dashboard
3. Cliquez sur **Miroir** pour lancer le streaming

### Profils
Les profils permettent de sauvegarder des configurations (résolution, FPS, débit, tampon...) et de les réutiliser :
1. Allez dans **Profils** → **Nouveau profil**
2. Configurez les paramètres souhaités
3. Sur le Dashboard, le bouton **Profils** apparaît sur chaque appareil — cliquez dessus pour lancer le mirroring avec ce profil

### Connexion WiFi

**Méthode USB → WiFi (recommandée)**
1. Branchez le téléphone en USB
2. Cliquez sur **Passer en WiFi** sur la carte de l'appareil

**Connexion directe**
1. Cliquez sur l'icône WiFi dans la sidebar
2. Entrez l'IP du téléphone et le port `5555`

**Appairage Android 11+ (sans USB)**
1. Icône WiFi → onglet **Appairage**
2. Sur le téléphone : Paramètres → Options développeur → Débogage WiFi → Appairer avec un code
3. Entrez l'IP, le port et le code à 6 chiffres

## Paramètres disponibles

| Paramètre | Description |
|-----------|-------------|
| Résolution max | Résolution de l'écran mirroré (480p–2160p) |
| FPS maximum | Images par seconde (15–120) |
| Débit vidéo | Bande passante vidéo en Mb/s (2–32) |
| Tampon d'affichage | Délai en ms avant affichage — 0 ms pour latence minimale, augmenter sur WiFi instable |
| Audio | Transmet le son du téléphone (Android 11+) |
| Toujours au premier plan | La fenêtre scrcpy reste visible au-dessus des autres |
| Plein écran au démarrage | Lance scrcpy directement en plein écran |
| Afficher les touches | Cercles visuels à chaque toucher (utile pour enregistrements) |

> Sur Windows, le rendu **Direct3D** est activé automatiquement pour de meilleures performances.

## Architecture

```
phonemirror/
├── src-tauri/           # Backend Rust (Tauri 2)
│   ├── src/
│   │   ├── adb.rs       # Commandes ADB (liste, connexion, IP)
│   │   ├── scrcpy.rs    # Gestion des processus scrcpy + config
│   │   ├── profiles.rs  # Profils JSON persistés
│   │   └── lib.rs       # Entry point Tauri
│   └── tauri.conf.json  # Configuration Tauri (fenêtre, icônes…)
├── src/                 # Frontend React + TypeScript
│   ├── components/
│   │   ├── Titlebar.tsx       # Barre de titre personnalisée
│   │   ├── Sidebar.tsx        # Navigation + toggle thème
│   │   ├── DeviceCard.tsx     # Carte appareil (mirroring, profils, WiFi)
│   │   ├── ProfileSelector.tsx # Dropdown profils sur chaque appareil
│   │   ├── ConnectionModal.tsx # Modal connexion WiFi
│   │   └── Tooltip.tsx        # Bulles d'info sur les paramètres
│   ├── pages/
│   │   ├── Dashboard.tsx  # Liste des appareils connectés
│   │   ├── Profiles.tsx   # Gestion des profils
│   │   └── Settings.tsx   # Paramètres par défaut
│   ├── store/             # État global Zustand
│   ├── hooks/             # useDevices (polling ADB toutes les 2.5s)
│   ├── lib/tauri.ts       # Wrappers invoke Tauri
│   └── types/             # Types TypeScript partagés
└── install.ps1            # Script d'installation Windows (Node, Rust, scrcpy, ADB)
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
| `F` | Plein écran |
| `Ctrl+R` | Rotation |

## Licence

MIT

---

*Propulsé par [scrcpy](https://github.com/Genymobile/scrcpy) de Genymobile — un outil open source remarquable.*
