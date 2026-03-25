# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot-reload)
./run.sh dev
# or manually:
npm run tauri dev

# Production build
./run.sh build
# or manually:
npm run tauri build

# Run existing compiled binary
./run.sh start

# Install desktop shortcut (Linux)
./run.sh install
```

Windows equivalents use `.\run.ps1` with the same arguments.

There are no automated tests in this project.

## Architecture

PhoneMirror is a **Tauri 2 desktop app** that wraps **scrcpy** to mirror Android screens. It has a React/TypeScript frontend and a Rust backend.

### Frontend → Backend Communication

The frontend calls Rust functions via Tauri's `invoke()`. All IPC wrappers are centralized in `src/lib/tauri.ts`. The backend registers handlers in `src-tauri/src/lib.rs`.

### Backend Modules (`src-tauri/src/`)

- **adb.rs** — list devices, extract device properties (model, Android version, IP), connect/disconnect/pair over WiFi. Device info is fetched in a **single batched shell command** per device (model + product + version + IP in one `adb shell` call) to keep polling fast.
- **scrcpy.rs** — spawn/kill scrcpy processes; active processes tracked in a `HashMap<String, Child>` keyed by device serial. After spawning, waits 600ms and checks for immediate failure (reads stderr if scrcpy exits early). Render driver is set automatically: `--render-driver=direct3d` on Windows, `--render-driver=opengl` on Linux.
- **profiles.rs** — read/write profiles as JSON in the Tauri app data directory

### Frontend Modules (`src/`)

- **store/index.ts** — Zustand store; persists theme and default settings to localStorage
- **hooks/useDevices.ts** — polls `listDevices()` every 2.5s using a **recursive setTimeout** (not setInterval) so polls never overlap if ADB is slow. `isMirroring` checks run in parallel via `Promise.all`.
- **lib/tauri.ts** — typed wrappers around all `invoke()` calls
- **pages/** — Dashboard (device list), Profiles (CRUD), Settings (defaults)
- **components/DeviceCard.tsx** — main interaction point per device (mirror, profiles, WiFi controls)

### External Dependencies

The app requires **adb** and **scrcpy** to be installed on the host system. The install scripts (`install.sh` / `install.ps1`) handle this, including udev rules on Linux.

### Window

The app uses a custom titlebar (no native decorations) — see `src/components/Titlebar.tsx` and `tauri.conf.json` (`decorations: false`).
