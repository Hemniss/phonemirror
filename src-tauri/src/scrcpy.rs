use crate::adb::get_adb_path;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

/// Gestion des processus scrcpy en cours d'exécution.
pub struct ScrcpyProcesses(pub Mutex<HashMap<String, Child>>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MirrorConfig {
    pub serial: String,
    pub max_fps: Option<u32>,
    pub max_size: Option<u32>,
    pub bitrate: Option<u32>,
    pub video_buffer: Option<u32>,
    pub enable_audio: bool,
    pub always_on_top: bool,
    pub fullscreen: bool,
    pub show_touches: bool,
    pub rotation: Option<u32>,
    pub record_path: Option<String>,
    pub window_title: Option<String>,
}

/// Retourne le chemin vers l'exécutable scrcpy bundlé.
fn get_scrcpy_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Impossible d'accéder aux ressources: {e}"))?;

    #[cfg(target_os = "windows")]
    let scrcpy_rel = "scrcpy/scrcpy.exe";
    #[cfg(not(target_os = "windows"))]
    let scrcpy_rel = "scrcpy/scrcpy";

    let bundled = resource_dir.join(scrcpy_rel);
    if bundled.exists() {
        return Ok(bundled);
    }

    which::which("scrcpy").map_err(|_| {
        "scrcpy introuvable. Lancez scripts/download-scrcpy.sh pour le télécharger.".to_string()
    })
}

/// Démarre le mirroring d'un appareil avec la configuration donnée.
#[tauri::command]
pub async fn start_mirror(
    app: AppHandle,
    processes: State<'_, ScrcpyProcesses>,
    config: MirrorConfig,
) -> Result<(), String> {
    let scrcpy = get_scrcpy_path(&app)?;

    let mut args: Vec<String> = vec!["-s".to_string(), config.serial.clone()];

    if let Some(fps) = config.max_fps {
        args.push("--max-fps".to_string());
        args.push(fps.to_string());
    }

    if let Some(size) = config.max_size {
        args.push("-m".to_string());
        args.push(size.to_string());
    }

    if let Some(bitrate) = config.bitrate {
        args.push("-b".to_string());
        args.push(format!("{bitrate}M"));
    }

    if let Some(buf) = config.video_buffer {
        args.push(format!("--video-buffer={buf}"));
    }

    // Optimisation du rendu selon la plateforme
    #[cfg(target_os = "windows")]
    args.push("--render-driver=direct3d".to_string());
    #[cfg(target_os = "linux")]
    args.push("--render-driver=opengl".to_string());

    if config.enable_audio {
        args.push("--audio-source=output".to_string());
    } else {
        args.push("--no-audio".to_string());
    }

    if config.always_on_top {
        args.push("--always-on-top".to_string());
    }

    if config.fullscreen {
        args.push("--fullscreen".to_string());
    }

    if config.show_touches {
        args.push("--show-touches".to_string());
    }

    if let Some(rot) = config.rotation {
        args.push("--lock-video-orientation".to_string());
        args.push(rot.to_string());
    }

    if let Some(title) = &config.window_title {
        args.push("--window-title".to_string());
        args.push(title.clone());
    } else {
        args.push("--window-title".to_string());
        args.push("PhoneMirror".to_string());
    }

    if let Some(path) = &config.record_path {
        args.push("-r".to_string());
        args.push(path.clone());
    }

    let mut child = Command::new(&scrcpy)
        .args(&args)
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Impossible de démarrer scrcpy: {e}"))?;

    // Attendre 600 ms puis vérifier si scrcpy a déjà planté (flag invalide, device inaccessible, etc.)
    tokio::time::sleep(Duration::from_millis(600)).await;
    if let Ok(Some(status)) = child.try_wait() {
        let mut stderr_msg = String::new();
        if let Some(mut stderr) = child.stderr.take() {
            let _ = stderr.read_to_string(&mut stderr_msg);
        }
        let detail = stderr_msg.trim();
        return Err(if detail.is_empty() {
            format!("scrcpy a échoué (code {:?})", status.code())
        } else {
            format!("scrcpy: {detail}")
        });
    }

    let mut procs = processes.0.lock().map_err(|e| e.to_string())?;
    procs.insert(config.serial, child);

    Ok(())
}

/// Arrête le mirroring d'un appareil.
#[tauri::command]
pub async fn stop_mirror(
    processes: State<'_, ScrcpyProcesses>,
    serial: String,
) -> Result<(), String> {
    let mut procs = processes.0.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = procs.remove(&serial) {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Vérifie si un appareil est actuellement en cours de mirroring.
#[tauri::command]
pub async fn is_mirroring(
    processes: State<'_, ScrcpyProcesses>,
    serial: String,
) -> Result<bool, String> {
    let mut procs = processes.0.lock().map_err(|e| e.to_string())?;
    if let Some(child) = procs.get_mut(&serial) {
        match child.try_wait() {
            Ok(Some(_)) => {
                procs.remove(&serial);
                Ok(false)
            }
            Ok(None) => Ok(true),
            Err(_) => Ok(false),
        }
    } else {
        Ok(false)
    }
}

/// Envoie un fichier du PC vers l'appareil Android.
#[tauri::command]
pub async fn push_file(
    app: AppHandle,
    serial: String,
    local_path: String,
    remote_path: String,
) -> Result<(), String> {
    let adb = get_adb_path(&app)?;
    let output = Command::new(&adb)
        .args(["-s", &serial, "push", &local_path, &remote_path])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

/// Récupère un fichier de l'appareil Android vers le PC.
#[tauri::command]
pub async fn pull_file(
    app: AppHandle,
    serial: String,
    remote_path: String,
    local_path: String,
) -> Result<(), String> {
    let adb = get_adb_path(&app)?;
    let output = Command::new(&adb)
        .args(["-s", &serial, "pull", &remote_path, &local_path])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}
