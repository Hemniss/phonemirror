use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub device_serial: Option<String>,
    pub max_fps: u32,
    pub max_size: u32,
    pub bitrate: u32,
    pub enable_audio: bool,
    pub always_on_top: bool,
    pub show_touches: bool,
    pub created_at: String,
}

fn get_profiles_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Impossible d'accéder aux données: {e}"))?;
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    Ok(data_dir.join("profiles.json"))
}

fn load_profiles(app: &AppHandle) -> Result<Vec<Profile>, String> {
    let path = get_profiles_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

/// Retourne tous les profils sauvegardés.
#[tauri::command]
pub fn get_profiles(app: AppHandle) -> Result<Vec<Profile>, String> {
    load_profiles(&app)
}

/// Sauvegarde ou met à jour un profil.
#[tauri::command]
pub fn save_profile(app: AppHandle, profile: Profile) -> Result<(), String> {
    let path = get_profiles_path(&app)?;
    let mut profiles = load_profiles(&app)?;

    if let Some(pos) = profiles.iter().position(|p| p.id == profile.id) {
        profiles[pos] = profile;
    } else {
        profiles.push(profile);
    }

    let content = serde_json::to_string_pretty(&profiles).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

/// Supprime un profil par ID.
#[tauri::command]
pub fn delete_profile(app: AppHandle, id: String) -> Result<(), String> {
    let path = get_profiles_path(&app)?;
    let mut profiles = load_profiles(&app)?;
    profiles.retain(|p| p.id != id);
    let content = serde_json::to_string_pretty(&profiles).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}
