# PhoneMirror

**Streamez votre téléphone Android sur votre PC** — interface graphique moderne pour [scrcpy](https://github.com/Genymobile/scrcpy).

## Fonctionnalités

- **Mirroring** en temps réel (USB & WiFi)
- **Audio** du téléphone sur le PC (Android 11+)
- **Profils** — sauvegardez vos configurations préférées et appliquez-les en un clic
- **Tampon d'affichage** configurable pour réduire la latence
- **Rendu optimisé** — Direct3D sur Windows, OpenGL sur Linux (activé automatiquement)
- **Thème sombre / clair**
- **Connexion WiFi** directe ou par appairage (Android 11+)

## Installation

### Utilisateurs — installeur prêt à l'emploi

Rendez-vous sur la page [**Releases**](https://github.com/Hemniss/phonemirror/releases)
et téléchargez le fichier correspondant à votre système.

| Système | Fichier | Remarque |
|---|---|---|
| Windows | `PhoneMirror_x.y.z_x64-setup.exe` | Aucun droit administrateur requis |
| Linux (Debian/Ubuntu) | `.deb` | `sudo apt install ./PhoneMirror_*.deb` |
| Linux (autre) | `.AppImage` | `chmod +x` puis double-clic |

**scrcpy et adb sont inclus dans l'installeur** : rien d'autre à installer.

Sur Windows, l'application n'étant pas signée par un certificat payant,
SmartScreen affiche un avertissement au premier lancement. Cliquez sur
**Informations complémentaires** puis **Exécuter quand même**.

Il reste à activer le débogage USB sur le téléphone — voir
[Prérequis téléphone Android](#prérequis-téléphone-android) plus bas.

---

## Compiler depuis les sources (développeurs)

Cette section ne concerne que le développement. Pour simplement utiliser
l'application, servez-vous de l'installeur ci-dessus.

### Windows

1. Clic droit sur `install.ps1` → **Exécuter avec PowerShell** (en tant qu'administrateur)
2. Le script installe automatiquement : Node.js, Rust, Visual Studio Build Tools C++, scrcpy, ADB
3. Ensuite, utilisez le script `run.ps1` :

```powershell
.\run.ps1          # Compile et lance l'application (défaut)
.\run.ps1 start    # Lance le binaire déjà compilé
.\run.ps1 dev      # Mode développement avec hot-reload
.\run.ps1 install  # Crée des raccourcis (Bureau + menu Démarrer)
```

> **Note Windows 11** : Désactivez **Smart App Control** avant de compiler
> (Sécurité Windows → Contrôle des applications → Paramètres de contrôle intelligent → Désactivé).
> Ce paramètre bloque les exécutables générés par Cargo pendant la compilation.

### Linux (Ubuntu / Fedora / Arch)

```bash
bash install.sh
source "$HOME/.cargo/env"   # Si Rust vient d'être installé
```

Ensuite, utilisez le script `run.sh` :

```bash
./run.sh          # Compile et lance l'application (défaut)
./run.sh start    # Lance le binaire déjà compilé
./run.sh dev      # Mode développement avec hot-reload
./run.sh install  # Crée un raccourci dans le menu des applications
```

Le script installe automatiquement : les dépendances système WebKit/GTK, Node.js, Rust, scrcpy (version récente depuis GitHub), ADB, et configure les règles udev pour l'accès USB Android. Compatible apt, dnf et pacman.

### Installation manuelle

<details>
<summary>Windows</summary>

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) avec le workload **Développement Desktop en C++**
- [scrcpy](https://github.com/Genymobile/scrcpy) (`winget install Genymobile.scrcpy`)

</details>

<details>
<summary>Linux (Ubuntu/Debian)</summary>

```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf adb
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Installer scrcpy depuis https://github.com/Genymobile/scrcpy/releases (version >= 2.0)
npm install
```

</details>

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
| Tampon d'affichage | Délai en ms avant affichage (`--video-buffer`) — 0 ms pour latence minimale, augmenter sur WiFi instable |
| Audio | Transmet le son du téléphone (Android 11+) |
| Toujours au premier plan | La fenêtre scrcpy reste visible au-dessus des autres |
| Plein écran au démarrage | Lance scrcpy directement en plein écran |
| Afficher les touches | Cercles visuels à chaque toucher (utile pour enregistrements) |

> Le rendu est optimisé automatiquement selon la plateforme : **Direct3D** sur Windows, **OpenGL** sur Linux.

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
│   ├── hooks/             # useDevices (polling ADB, setTimeout récursif non-chevauchant)
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
| Mirror | [scrcpy >= 2.0](https://github.com/Genymobile/scrcpy) |

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
