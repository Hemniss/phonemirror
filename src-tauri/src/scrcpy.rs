use crate::adb::get_adb_path;
use crate::bounds::{check_opt_range, BITRATE_MBPS, MAX_FPS, MAX_SIZE, VIDEO_BUFFER_MS};
use serde::{Deserialize, Serialize};
use crate::mirror_table::MirrorTable;
use crate::process;
use std::process::Stdio;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

/// Gestion des processus scrcpy en cours d'exécution.
pub type ScrcpyProcesses = MirrorTable;

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
    /// Masque la barre de titre de la fenêtre scrcpy.
    /// `serde(default)` : les réglages persistés avant l'ajout de ce champ
    /// ne le contiennent pas et échoueraient à la désérialisation.
    #[serde(default)]
    pub borderless: bool,
    pub show_touches: bool,
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

    // Chercher dans le PATH (fonctionne quand lancé depuis un terminal)
    if let Ok(p) = which::which("scrcpy") {
        return Ok(p);
    }

    // Sur macOS, les .app lancées depuis le Finder n'héritent pas du PATH shell.
    // Chercher explicitement dans les emplacements Homebrew (Apple Silicon puis Intel).
    #[cfg(target_os = "macos")]
    for candidate in &["/opt/homebrew/bin/scrcpy", "/usr/local/bin/scrcpy"] {
        let p = std::path::Path::new(candidate);
        if p.exists() {
            return Ok(p.to_path_buf());
        }
    }

    #[cfg(target_os = "windows")]
    const HINT: &str = "L'installation de PhoneMirror semble incomplète : réinstallez l'application.";
    #[cfg(target_os = "macos")]
    const HINT: &str = "Installez-le via Homebrew : brew install scrcpy";
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    const HINT: &str = "Installez-le : sudo apt install scrcpy";

    Err(format!("scrcpy introuvable. {HINT}"))
}

/// Construit les arguments de scrcpy pour une configuration. Fonction pure.
/// Refuse une configuration hors bornes avant de lancer scrcpy.
fn validate_config(config: &MirrorConfig) -> Result<(), String> {
    check_opt_range("FPS maximum", config.max_fps, MAX_FPS)?;
    check_opt_range("Résolution", config.max_size, MAX_SIZE)?;
    check_opt_range("Débit (Mb/s)", config.bitrate, BITRATE_MBPS)?;
    check_opt_range("Tampon d'affichage (ms)", config.video_buffer, VIDEO_BUFFER_MS)
}

pub fn build_scrcpy_args(config: &MirrorConfig) -> Vec<String> {
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
    #[cfg(target_os = "macos")]
    args.push("--render-driver=metal".to_string());

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

    if config.borderless {
        args.push("--window-borderless".to_string());
    }

    if config.show_touches {
        args.push("--show-touches".to_string());
    }

    if let Some(title) = &config.window_title {
        args.push("--window-title".to_string());
        args.push(title.clone());
    } else {
        args.push("--window-title".to_string());
        args.push("PhoneMirror".to_string());
    }

    args
}

/// Démarre le mirroring d'un appareil avec la configuration donnée.
#[tauri::command]
pub async fn start_mirror(
    app: AppHandle,
    processes: State<'_, ScrcpyProcesses>,
    config: MirrorConfig,
) -> Result<(), String> {
    validate_config(&config)?;
    let scrcpy = get_scrcpy_path(&app)?;

    let args = build_scrcpy_args(&config);

    let adb = get_adb_path(&app)?;

    let mut cmd = process::command(&scrcpy);
    cmd.args(&args)
        // Indiquer explicitement le chemin de adb à scrcpy via sa variable d'env dédiée
        .env("ADB", &adb)
        .stderr(Stdio::piped());

    // Sur macOS uniquement : enrichir le PATH pour que scrcpy trouve adb depuis un .app
    // lancé par le Finder. Le séparateur `:` est propre aux systèmes UNIX.
    #[cfg(target_os = "macos")]
    {
        let current = std::env::var("PATH").unwrap_or_default();
        let extra = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin";
        let enriched = if current.is_empty() {
            extra.to_string()
        } else {
            format!("{extra}:{current}")
        };
        cmd.env("PATH", enriched);
    }

    // Inscrit avant l'attente : un stop_mirror pendant les 600 ms trouve le processus.
    let pid = processes.spawn(&config.serial, &mut cmd)?;

    // Attendre 600 ms puis vérifier si scrcpy a déjà planté (flag invalide, device inaccessible, etc.)
    // Le verrou de la table n'est pas tenu pendant cette attente.
    tokio::time::sleep(Duration::from_millis(600)).await;
    processes.confirm(&config.serial, pid)
}

/// Arrête le mirroring d'un appareil.
#[tauri::command]
pub async fn stop_mirror(
    processes: State<'_, ScrcpyProcesses>,
    serial: String,
) -> Result<(), String> {
    processes.stop(&serial);
    Ok(())
}

/// Vérifie si un appareil est actuellement en cours de mirroring.
#[tauri::command]
pub async fn is_mirroring(
    processes: State<'_, ScrcpyProcesses>,
    serial: String,
) -> Result<bool, String> {
    Ok(processes.is_running(&serial))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> MirrorConfig {
        MirrorConfig {
            serial: "R58M12345".into(),
            max_fps: None,
            max_size: None,
            bitrate: None,
            video_buffer: None,
            enable_audio: false,
            always_on_top: false,
            fullscreen: false,
            borderless: false,
            show_touches: false,
            window_title: None,
        }
    }

    /// Configuration où toutes les options sont actives.
    fn full() -> MirrorConfig {
        MirrorConfig {
            max_fps: Some(60),
            max_size: Some(1920),
            bitrate: Some(8),
            video_buffer: Some(50),
            enable_audio: true,
            always_on_top: true,
            fullscreen: true,
            borderless: true,
            show_touches: true,
            window_title: Some("Mon téléphone".into()),
            ..base()
        }
    }

    #[test]
    fn config_hors_bornes_refusee() {
        assert!(validate_config(&base()).is_ok());
        assert!(validate_config(&full()).is_ok());
        assert!(validate_config(&MirrorConfig { bitrate: Some(64), ..base() }).is_err());
        assert!(validate_config(&MirrorConfig { max_fps: Some(0), ..base() }).is_err());
        assert!(validate_config(&MirrorConfig { max_size: Some(10_000), ..base() }).is_err());
        assert!(validate_config(&MirrorConfig { video_buffer: Some(500), ..base() }).is_err());
    }

    fn has(args: &[String], needle: &[&str]) -> bool {
        args.windows(needle.len())
            .any(|w| w.iter().zip(needle).all(|(a, b)| a == b))
    }

    #[test]
    fn serial_always_first() {
        assert_eq!(&build_scrcpy_args(&base())[..2], ["-s", "R58M12345"]);
    }

    #[test]
    fn max_fps() {
        assert!(!build_scrcpy_args(&base()).contains(&"--max-fps".into()));
        let c = MirrorConfig { max_fps: Some(60), ..base() };
        assert!(has(&build_scrcpy_args(&c), &["--max-fps", "60"]));
    }

    #[test]
    fn max_size() {
        assert!(!build_scrcpy_args(&base()).contains(&"-m".into()));
        let c = MirrorConfig { max_size: Some(1920), ..base() };
        assert!(has(&build_scrcpy_args(&c), &["-m", "1920"]));
    }

    #[test]
    fn bitrate() {
        assert!(!build_scrcpy_args(&base()).contains(&"-b".into()));
        let c = MirrorConfig { bitrate: Some(8), ..base() };
        assert!(has(&build_scrcpy_args(&c), &["-b", "8M"]));
    }

    #[test]
    fn video_buffer() {
        let off = build_scrcpy_args(&base());
        assert!(!off.iter().any(|a| a.starts_with("--video-buffer")));
        let c = MirrorConfig { video_buffer: Some(50), ..base() };
        assert!(build_scrcpy_args(&c).contains(&"--video-buffer=50".into()));
    }

    #[test]
    fn audio() {
        let off = build_scrcpy_args(&base());
        assert!(off.contains(&"--no-audio".into()));
        assert!(!off.contains(&"--audio-source=output".into()));
        let on = build_scrcpy_args(&MirrorConfig { enable_audio: true, ..base() });
        assert!(on.contains(&"--audio-source=output".into()));
        assert!(!on.contains(&"--no-audio".into()));
    }

    #[test]
    fn boolean_flags() {
        let off = build_scrcpy_args(&base());
        let on = build_scrcpy_args(&MirrorConfig {
            always_on_top: true,
            fullscreen: true,
            borderless: true,
            show_touches: true,
            ..base()
        });
        for flag in ["--always-on-top", "--fullscreen", "--window-borderless", "--show-touches"] {
            assert!(!off.contains(&flag.into()), "{flag} présent sans être demandé");
            assert!(on.contains(&flag.into()), "{flag} absent alors que demandé");
        }
    }

    #[test]
    fn window_title() {
        assert!(has(&build_scrcpy_args(&base()), &["--window-title", "PhoneMirror"]));
        let c = MirrorConfig { window_title: Some("Pixel".into()), ..base() };
        assert!(has(&build_scrcpy_args(&c), &["--window-title", "Pixel"]));
    }

    #[test]
    fn render_driver_per_platform() {
        let args = build_scrcpy_args(&base());
        let drivers: Vec<_> = args.iter().filter(|a| a.starts_with("--render-driver=")).collect();
        #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
        assert_eq!(drivers.len(), 1);
        #[cfg(target_os = "macos")]
        assert_eq!(drivers[0], "--render-driver=metal");
        #[cfg(target_os = "windows")]
        assert_eq!(drivers[0], "--render-driver=direct3d");
        #[cfg(target_os = "linux")]
        assert_eq!(drivers[0], "--render-driver=opengl");
    }

    /// Fait valider toutes les options par le scrcpy embarqué : `--version`
    /// s'exécute après l'analyse des arguments, sans téléphone.
    #[test]
    fn bundled_scrcpy_accepts_all_options() {
        #[cfg(target_os = "windows")]
        let rel = "resources/scrcpy/scrcpy.exe";
        #[cfg(not(target_os = "windows"))]
        let rel = "resources/scrcpy/scrcpy";
        let bin = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(rel);
        if !bin.exists() {
            eprintln!("test ignoré : binaire scrcpy absent ({})", bin.display());
            return;
        }
        let out = std::process::Command::new(&bin)
            .args(build_scrcpy_args(&full()))
            .arg("--version")
            .output()
            .expect("lancement de scrcpy impossible");
        assert!(
            out.status.success(),
            "scrcpy refuse les arguments (code {:?}) : {}",
            out.status.code(),
            String::from_utf8_lossy(&out.stderr)
        );
    }
}
