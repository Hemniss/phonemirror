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

/// Résultat de la lecture de `profiles.json`.
enum Loaded {
    Profiles(Vec<Profile>),
    /// Le fichier était illisible : il a été renommé à ce chemin.
    SetAside(PathBuf),
}

/// Lit `profiles.json`. Un fichier absent donne une liste vide. Un fichier
/// illisible (JSON invalide, y compris vide) n'est jamais supprimé : il est
/// renommé `profiles.corrompu-<horodatage Unix>.json` dans le même dossier.
/// Une erreur d'entrée-sortie n'est pas une corruption : rien n'est renommé.
fn read_or_set_aside(path: &Path) -> Result<Loaded, String> {
    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Ok(Loaded::Profiles(Vec::new()))
        }
        Err(e) => return Err(format!("Lecture de {} impossible : {e}", path.display())),
    };
    match serde_json::from_slice(&bytes) {
        Ok(profiles) => Ok(Loaded::Profiles(profiles)),
        Err(_) => set_aside(path).map(Loaded::SetAside),
    }
}

fn set_aside(path: &Path) -> Result<PathBuf, String> {
    let dir = path.parent().unwrap_or_else(|| Path::new("."));
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let mut target = dir.join(format!("profiles.corrompu-{stamp}.json"));
    let mut n = 1;
    while target.exists() {
        target = dir.join(format!("profiles.corrompu-{stamp}-{n}.json"));
        n += 1;
    }
    fs::rename(path, &target).map_err(|e| {
        format!(
            "Le fichier des profils {} est illisible et n'a pas pu être mis de côté : {e}",
            path.display()
        )
    })?;
    Ok(target)
}

/// Lecture pour l'affichage : signale une fois la mise de côté d'un fichier illisible.
fn load_profiles_at(path: &Path) -> Result<Vec<Profile>, String> {
    match read_or_set_aside(path)? {
        Loaded::Profiles(profiles) => Ok(profiles),
        Loaded::SetAside(target) => Err(format!(
            "Le fichier des profils était illisible. Il a été mis de côté sous {} \
             et la liste des profils repart de zéro.",
            target.display()
        )),
    }
}

/// Lecture avant modification : un fichier illisible est mis de côté et la
/// liste repart de zéro, sans faire échouer l'opération.
fn load_for_update(path: &Path) -> Result<Vec<Profile>, String> {
    match read_or_set_aside(path)? {
        Loaded::Profiles(profiles) => Ok(profiles),
        Loaded::SetAside(_) => Ok(Vec::new()),
    }
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
    let mut profiles = load_for_update(path)?;
    if let Some(pos) = profiles.iter().position(|p| p.id == profile.id) {
        profiles[pos] = profile;
    } else {
        profiles.push(profile);
    }
    write_profiles_at(path, &profiles)
}

fn delete_profile_at(path: &Path, id: &str) -> Result<(), String> {
    let mut profiles = load_for_update(path)?;
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

    fn quarantined(dir: &TestDir) -> Vec<PathBuf> {
        dir.entries()
            .into_iter()
            .filter(|n| n.starts_with("profiles.corrompu-") && n.ends_with(".json"))
            .map(|n| dir.0.join(n))
            .collect()
    }

    #[test]
    fn lecture_corrompue_met_de_cote_puis_liste_vide() {
        let dir = TestDir::new("corrompu-lecture");
        let path = dir.file();
        fs::write(&path, "{ pas du json").unwrap();
        let err = load_profiles_at(&path).unwrap_err();
        let q = quarantined(&dir);
        assert_eq!(q.len(), 1);
        assert!(err.contains(&q[0].display().to_string()), "{err}");
        assert_eq!(fs::read(&q[0]).unwrap(), b"{ pas du json");
        assert!(load_profiles_at(&path).unwrap().is_empty());
        assert_eq!(quarantined(&dir).len(), 1);
    }

    #[test]
    fn enregistrement_sur_fichier_corrompu_reussit() {
        let dir = TestDir::new("corrompu-save");
        let path = dir.file();
        fs::write(&path, "{ pas du json").unwrap();
        save_profile_at(&path, profile("a", "Jeu")).unwrap();
        assert_eq!(names(&path), vec!["a:Jeu"]);
        let q = quarantined(&dir);
        assert_eq!(q.len(), 1);
        assert_eq!(fs::read(&q[0]).unwrap(), b"{ pas du json");
    }

    #[test]
    fn suppression_sur_fichier_corrompu_reussit() {
        let dir = TestDir::new("corrompu-delete");
        let path = dir.file();
        fs::write(&path, "{ pas du json").unwrap();
        delete_profile_at(&path, "a").unwrap();
        assert!(load_profiles_at(&path).unwrap().is_empty());
        assert_eq!(quarantined(&dir).len(), 1);
    }

    #[test]
    fn fichier_vide_traite_comme_corrompu() {
        let dir = TestDir::new("vide");
        let path = dir.file();
        fs::write(&path, "").unwrap();
        assert!(load_profiles_at(&path).is_err());
        let q = quarantined(&dir);
        assert_eq!(q.len(), 1);
        assert_eq!(fs::read(&q[0]).unwrap().len(), 0);
        assert!(load_profiles_at(&path).unwrap().is_empty());
    }

    #[test]
    fn fichier_absent_liste_vide_sans_mise_de_cote() {
        let dir = TestDir::new("absent");
        let path = dir.file();
        assert!(load_profiles_at(&path).unwrap().is_empty());
        assert!(dir.entries().is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn erreur_entree_sortie_cite_le_chemin_sans_renommer() {
        // Un dossier à la place du fichier : la lecture échoue sans être une corruption.
        let dir = TestDir::new("es");
        let path = dir.file();
        fs::create_dir(&path).unwrap();
        let err = load_profiles_at(&path).unwrap_err();
        assert!(err.contains(&path.display().to_string()), "{err}");
        assert!(quarantined(&dir).is_empty());
        assert!(path.is_dir());
    }

    #[test]
    fn relit_un_profil_sans_video_buffer() {
        let dir = TestDir::new("compat");
        let path = dir.file();
        fs::write(
            &path,
            r#"[{"id":"a","name":"Jeu","device_serial":null,"max_fps":60,"max_size":1080,"bitrate":8,
  "enable_audio":true,"always_on_top":false,"show_touches":false,"created_at":"2026-08-22T20:00:00Z"}]"#,
        )
        .unwrap();
        let profiles = load_profiles_at(&path).unwrap();
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "Jeu");
        assert_eq!(profiles[0].max_fps, 60);
        assert_eq!(profiles[0].video_buffer, 0);
    }
}
