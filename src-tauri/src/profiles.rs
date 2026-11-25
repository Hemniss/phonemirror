use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub device_serial: Option<String>,
    pub max_fps: u32,
    pub max_size: u32,
    pub bitrate: u32,
    #[serde(default)]
    pub video_buffer: u32,
    pub enable_audio: bool,
    pub always_on_top: bool,
    pub show_touches: bool,
    pub created_at: String,
}

fn get_profiles_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Impossible d'accéder aux données: {e}"))?;
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    Ok(data_dir.join("profiles.json"))
}

fn load_profiles_at(path: &Path) -> Result<Vec<Profile>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn write_profiles_at(path: &Path, profiles: &[Profile]) -> Result<(), String> {
    let content = serde_json::to_string_pretty(profiles).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    let io_err =
        |e: std::io::Error, p: &Path| format!("Écriture de {} impossible : {e}", p.display());
    {
        let mut file = fs::File::create(&tmp).map_err(|e| io_err(e, &tmp))?;
        file.write_all(content.as_bytes())
            .map_err(|e| io_err(e, &tmp))?;
        file.sync_all().map_err(|e| io_err(e, &tmp))?;
    }
    // `fs::rename` remplace la cible existante, sous Unix comme sous Windows.
    fs::rename(&tmp, path).map_err(|e| io_err(e, path))
}

fn save_profile_at(path: &Path, profile: Profile) -> Result<(), String> {
    let mut profiles = load_profiles_at(path)?;
    if let Some(pos) = profiles.iter().position(|p| p.id == profile.id) {
        profiles[pos] = profile;
    } else {
        profiles.push(profile);
    }
    write_profiles_at(path, &profiles)
}

fn delete_profile_at(path: &Path, id: &str) -> Result<(), String> {
    let mut profiles = load_profiles_at(path)?;
    profiles.retain(|p| p.id != id);
    write_profiles_at(path, &profiles)
}

/// Retourne tous les profils sauvegardés.
#[tauri::command]
pub fn get_profiles(app: AppHandle) -> Result<Vec<Profile>, String> {
    load_profiles_at(&get_profiles_path(&app)?)
}

/// Sauvegarde ou met à jour un profil.
#[tauri::command]
pub fn save_profile(app: AppHandle, profile: Profile) -> Result<(), String> {
    save_profile_at(&get_profiles_path(&app)?, profile)
}

/// Supprime un profil par ID.
#[tauri::command]
pub fn delete_profile(app: AppHandle, id: String) -> Result<(), String> {
    delete_profile_at(&get_profiles_path(&app)?, &id)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Dossier temporaire unique, supprimé à la fin du test.
    struct TestDir(PathBuf);

    impl TestDir {
        fn new(name: &str) -> Self {
            let nanos = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let dir = std::env::temp_dir().join(format!(
                "phonemirror-profils-{name}-{}-{nanos}",
                std::process::id()
            ));
            fs::create_dir_all(&dir).unwrap();
            TestDir(dir)
        }
        fn file(&self) -> PathBuf {
            self.0.join("profiles.json")
        }
        fn entries(&self) -> Vec<String> {
            let mut v: Vec<String> = fs::read_dir(&self.0)
                .unwrap()
                .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
                .collect();
            v.sort();
            v
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn profile(id: &str, name: &str) -> Profile {
        Profile {
            id: id.into(),
            name: name.into(),
            device_serial: None,
            max_fps: 60,
            max_size: 1080,
            bitrate: 8,
            video_buffer: 0,
            enable_audio: true,
            always_on_top: false,
            show_touches: false,
            created_at: "2026-11-25T10:00:00Z".into(),
        }
    }

    fn names(path: &Path) -> Vec<String> {
        load_profiles_at(path)
            .unwrap()
            .into_iter()
            .map(|p| format!("{}:{}", p.id, p.name))
            .collect()
    }

    #[test]
    fn enregistre_deux_profils_sans_fichier_tmp_restant() {
        let dir = TestDir::new("deux");
        let path = dir.file();
        save_profile_at(&path, profile("a", "Jeu")).unwrap();
        save_profile_at(&path, profile("b", "Film")).unwrap();
        assert_eq!(names(&path), vec!["a:Jeu", "b:Film"]);
        assert_eq!(dir.entries(), vec!["profiles.json"]);
    }

    #[test]
    fn tmp_perime_ne_bloque_ni_lecture_ni_ecriture() {
        let dir = TestDir::new("tmp");
        let path = dir.file();
        save_profile_at(&path, profile("a", "Jeu")).unwrap();
        fs::write(dir.0.join("profiles.json.tmp"), "[{\"id\":").unwrap();
        assert_eq!(names(&path), vec!["a:Jeu"]);
        save_profile_at(&path, profile("b", "Film")).unwrap();
        assert_eq!(names(&path), vec!["a:Jeu", "b:Film"]);
        assert_eq!(dir.entries(), vec!["profiles.json"]);
    }

    #[test]
    fn mise_a_jour_remplace_et_suppression_absente_ne_change_rien() {
        let dir = TestDir::new("maj");
        let path = dir.file();
        save_profile_at(&path, profile("a", "Jeu")).unwrap();
        save_profile_at(&path, profile("b", "Film")).unwrap();
        save_profile_at(&path, profile("a", "Jeu 2")).unwrap();
        assert_eq!(names(&path), vec!["a:Jeu 2", "b:Film"]);
        delete_profile_at(&path, "zzz").unwrap();
        assert_eq!(names(&path), vec!["a:Jeu 2", "b:Film"]);
        delete_profile_at(&path, "a").unwrap();
        assert_eq!(names(&path), vec!["b:Film"]);
    }
}
