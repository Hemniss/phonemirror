use serde::{Deserialize, Serialize};
use crate::bounds::{check_pair_code, check_port};
use crate::process;
use std::path::Path;
use std::process::Output;
use std::time::Duration;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub serial: String,
    pub model: String,
    pub product: String,
    pub state: String,
    pub connection_type: String,
    pub android_version: String,
    pub ip_address: Option<String>,
}

/// Retourne le chemin vers l'exécutable ADB.
/// Cherche d'abord dans les ressources bundlées, puis dans le PATH.
pub fn get_adb_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Impossible d'accéder aux ressources: {e}"))?;

    #[cfg(target_os = "windows")]
    let adb_rel = "scrcpy/adb.exe";
    #[cfg(not(target_os = "windows"))]
    let adb_rel = "scrcpy/adb";

    let bundled = resource_dir.join(adb_rel);
    if bundled.exists() {
        return Ok(bundled);
    }

    // Chercher dans le PATH (fonctionne quand lancé depuis un terminal)
    if let Ok(p) = which::which("adb") {
        return Ok(p);
    }

    // Sur macOS, les .app lancées depuis le Finder n'héritent pas du PATH shell.
    // Chercher explicitement dans les emplacements Homebrew (Apple Silicon puis Intel).
    #[cfg(target_os = "macos")]
    for candidate in &[
        "/opt/homebrew/bin/adb",
        "/usr/local/bin/adb",
        "/opt/homebrew/Caskroom/android-platform-tools/latest/adb",
    ] {
        let p = std::path::Path::new(candidate);
        if p.exists() {
            return Ok(p.to_path_buf());
        }
    }

    #[cfg(target_os = "windows")]
    const HINT: &str = "L'installation de PhoneMirror semble incomplète : réinstallez l'application.";
    #[cfg(target_os = "macos")]
    const HINT: &str = "Installez-le via Homebrew : brew install android-platform-tools";
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    const HINT: &str = "Installez-le : sudo apt install android-tools-adb";

    Err(format!("ADB introuvable. {HINT}"))
}

/// Délai de `adb devices`.
const DEVICES_TIMEOUT: Duration = Duration::from_secs(5);
/// Délai du `shell` qui lit les informations d'un appareil.
const SHELL_TIMEOUT: Duration = Duration::from_secs(3);
/// Délai de `connect`, `pair`, `tcpip` et `disconnect`.
const NETWORK_TIMEOUT: Duration = Duration::from_secs(8);

/// Lance `adb <args>` avec un délai maximal.
fn run_adb(adb: &Path, args: &[&str], timeout: Duration) -> Result<Output, String> {
    process::output_with_timeout(process::command(adb).args(args), timeout)
}

/// Exécute un travail bloquant hors du runtime async.
async fn blocking<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("Tâche ADB interrompue : {e}"))?
}

/// Liste les appareils Android connectés (USB + WiFi).
#[tauri::command]
pub async fn list_devices(app: AppHandle) -> Result<Vec<Device>, String> {
    let adb = get_adb_path(&app)?;
    blocking(move || list_devices_with(&adb)).await
}

/// Lignes utiles de `adb devices -l` : `(serial, état)`.
/// Ignore l'en-tête, les lignes vides et les messages `* daemon …`.
fn parse_devices(stdout: &str) -> Vec<(String, String)> {
    stdout
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('*') && !l.starts_with("List of devices"))
        .filter_map(|l| {
            let mut parts = l.split_whitespace();
            Some((parts.next()?.to_string(), parts.next()?.to_string()))
        })
        .collect()
}

/// Type de connexion déduit du serial : `hôte:port` (TCP) ou nom de service
/// mDNS (`adb-XXXX._adb-tls-connect._tcp`, Android 11+, sans `:`).
fn connection_type(serial: &str) -> &'static str {
    if serial.contains(':') || serial.contains("._tcp") {
        "wireless"
    } else {
        "usb"
    }
}

fn list_devices_with(adb: &Path) -> Result<Vec<Device>, String> {
    let output = run_adb(adb, &["devices", "-l"], DEVICES_TIMEOUT)
        .map_err(|e| format!("Erreur ADB : {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    // Un `shell` par appareil, en parallèle : un appareil lent ne retarde pas
    // les autres au-delà de SHELL_TIMEOUT.
    let devices = std::thread::scope(|scope| {
        let handles: Vec<_> = parse_devices(&stdout)
            .into_iter()
            .map(|(serial, state)| scope.spawn(move || build_device(adb, serial, state)))
            .collect();
        handles
            .into_iter()
            .filter_map(|h| h.join().ok())
            .collect()
    });
    Ok(devices)
}

fn build_device(adb: &Path, serial: String, state: String) -> Device {
    let connection_type = connection_type(&serial).to_string();

    if state != "device" {
        // Appareil offline ou non autorisé
        return Device {
            ip_address: extract_ip_from_serial(&serial),
            serial,
            model: "Appareil inconnu".to_string(),
            product: String::new(),
            state,
            connection_type,
            android_version: String::new(),
        };
    }

    // USB ou serial mDNS : l'IP ne se lit pas dans le serial, on la demande au shell.
    let serial_ip = extract_ip_from_serial(&serial);
    let info = get_device_info(adb, &serial, serial_ip.is_none());
    Device {
        serial,
        model: info.model,
        product: info.product,
        state,
        connection_type,
        android_version: info.android_version,
        ip_address: serial_ip.or(info.ip),
    }
}

#[derive(Debug, PartialEq)]
struct DeviceInfo {
    model: String,
    product: String,
    android_version: String,
    ip: Option<String>,
}

impl DeviceInfo {
    fn unknown() -> Self {
        DeviceInfo {
            model: "Inconnu".to_string(),
            product: String::new(),
            android_version: String::new(),
            ip: None,
        }
    }
}

/// Récupère modèle, produit, version Android et IP en **une seule** commande shell.
/// En cas d'erreur ou de dépassement de SHELL_TIMEOUT : modèle « Inconnu ».
fn get_device_info(adb: &Path, serial: &str, fetch_ip: bool) -> DeviceInfo {
    let cmd = if fetch_ip {
        "printf '%s\\n%s\\n%s\\n' \"$(getprop ro.product.model)\" \"$(getprop ro.product.name)\" \"$(getprop ro.build.version.release)\"; ip -f inet addr show wlan0 2>/dev/null"
    } else {
        "printf '%s\\n%s\\n%s\\n' \"$(getprop ro.product.model)\" \"$(getprop ro.product.name)\" \"$(getprop ro.build.version.release)\""
    };

    match run_adb(adb, &["-s", serial, "shell", cmd], SHELL_TIMEOUT) {
        Ok(output) => parse_device_info(&String::from_utf8_lossy(&output.stdout), fetch_ip),
        Err(_) => DeviceInfo::unknown(),
    }
}

/// Analyse la sortie du `shell` de `get_device_info` : trois lignes (modèle,
/// produit, version), puis éventuellement la sortie de `ip addr show wlan0`.
fn parse_device_info(text: &str, fetch_ip: bool) -> DeviceInfo {
    let mut lines = text.lines();

    let model = lines.next().unwrap_or("").trim().to_string();
    let model = if model.is_empty() { "Inconnu".to_string() } else { model };
    let product = lines.next().unwrap_or("").trim().to_string();
    let android_version = lines.next().unwrap_or("").trim().to_string();

    let ip = if fetch_ip {
        lines
            .map(|l| l.trim())
            .find(|l| l.starts_with("inet "))
            .and_then(|l| l.split_whitespace().nth(1))
            .and_then(|s| s.split('/').next())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
    } else {
        None
    };

    DeviceInfo {
        model,
        product,
        android_version,
        ip,
    }
}

/// IP contenue dans un serial `ip:port` ou `[ipv6]:port`. `None` pour un
/// serial USB ou mDNS.
fn extract_ip_from_serial(serial: &str) -> Option<String> {
    let host = match serial.strip_prefix('[') {
        Some(rest) => rest.split_once(']')?.0,
        None => {
            let (host, port) = serial.rsplit_once(':')?;
            if host.contains(':') || port.parse::<u16>().is_err() {
                return None;
            }
            host
        }
    };
    (!host.is_empty()).then(|| host.to_string())
}

/// Connecte un appareil en WiFi via ADB.
#[tauri::command]
pub async fn connect_wireless(app: AppHandle, ip: String, port: u16) -> Result<String, String> {
    let adb = get_adb_path(&app)?;
    blocking(move || connect_with(&adb, &ip, port)).await
}

fn connect_with(adb: &Path, ip: &str, port: u16) -> Result<String, String> {
    check_port(port)?;
    let addr = format!("{ip}:{port}");
    let output = run_adb(adb, &["connect", &addr], NETWORK_TIMEOUT)?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.contains("connected") {
        Ok(addr)
    } else {
        Err(format!("Connexion échouée: {}", stdout.trim()))
    }
}

/// Déconnecte un appareil WiFi.
#[tauri::command]
pub async fn disconnect_device(app: AppHandle, serial: String) -> Result<(), String> {
    let adb = get_adb_path(&app)?;
    blocking(move || disconnect_with(&adb, &serial)).await
}

/// Échec si adb sort en erreur ou écrit une ligne `error: …` (certaines
/// versions d'adb sortent en 0 malgré l'erreur).
fn disconnect_with(adb: &Path, serial: &str) -> Result<(), String> {
    let output = run_adb(adb, &["disconnect", serial], NETWORK_TIMEOUT)?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let message = format!("{} {}", stdout.trim(), stderr.trim());
    let message = message.trim();

    let reports_error = stdout
        .lines()
        .chain(stderr.lines())
        .any(|l| l.trim_start().starts_with("error:"));
    if output.status.success() && !reports_error {
        Ok(())
    } else {
        Err(format!("Déconnexion échouée: {message}"))
    }
}

/// Active le mode TCP/IP sur un appareil USB (préparation connexion WiFi).
#[tauri::command]
pub async fn enable_tcpip(app: AppHandle, serial: String, port: u16) -> Result<(), String> {
    let adb = get_adb_path(&app)?;
    blocking(move || tcpip_with(&adb, &serial, port)).await
}

fn tcpip_with(adb: &Path, serial: &str, port: u16) -> Result<(), String> {
    check_port(port)?;
    let output = run_adb(adb, &["-s", serial, "tcpip", &port.to_string()], NETWORK_TIMEOUT)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

/// Appaire un appareil Android 11+ via WiFi (code QR / code pairing).
#[tauri::command]
pub async fn pair_device(
    app: AppHandle,
    ip: String,
    port: u16,
    code: String,
) -> Result<(), String> {
    let adb = get_adb_path(&app)?;
    blocking(move || pair_with(&adb, &ip, port, &code)).await
}

fn pair_with(adb: &Path, ip: &str, port: u16, code: &str) -> Result<(), String> {
    check_port(port)?;
    check_pair_code(code)?;
    let addr = format!("{ip}:{port}");
    let output = run_adb(adb, &["pair", &addr, code], NETWORK_TIMEOUT)?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.contains("Successfully paired") {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Appairage échoué: {} {}", stdout.trim(), stderr.trim()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// adb ne doit pas être lancé quand le port ou le code est hors bornes :
    /// le faux adb échouerait le test s'il était appelé.
    #[cfg(unix)]
    #[test]
    fn port_ou_code_invalide_refuse_sans_lancer_adb() {
        let fake = FakeAdb::new("echo connected; echo 'Successfully paired'; touch \"$0.called\"");
        assert!(connect_with(&fake.path, "192.168.1.20", 0).is_err());
        assert!(tcpip_with(&fake.path, "R58M12345", 0).is_err());
        assert!(pair_with(&fake.path, "192.168.1.20", 0, "123456").is_err());
        assert!(pair_with(&fake.path, "192.168.1.20", 37000, "-h").is_err());
        assert!(!fake.path.with_extension("called").exists(), "adb lancé malgré une valeur invalide");
        assert!(connect_with(&fake.path, "192.168.1.20", 5555).is_ok());
    }

    /// Faux adb : script shell exécutable dans un dossier temporaire, supprimé au drop.
    #[cfg(unix)]
    struct FakeAdb {
        dir: std::path::PathBuf,
        path: std::path::PathBuf,
    }

    #[cfg(unix)]
    impl FakeAdb {
        fn new(body: &str) -> Self {
            use std::io::Write;
            use std::process::{Command, Stdio};
            use std::sync::atomic::{AtomicUsize, Ordering};
            static N: AtomicUsize = AtomicUsize::new(0);
            let dir = std::env::temp_dir().join(format!(
                "pm-fake-adb-{}-{}",
                std::process::id(),
                N.fetch_add(1, Ordering::SeqCst)
            ));
            std::fs::create_dir_all(&dir).unwrap();
            let path = dir.join("adb");
            // Le script est écrit par un processus à part. Si le processus des
            // tests l'ouvrait lui-même en écriture, un lancement fait au même
            // moment par un autre test hériterait un instant du descripteur, et
            // Linux refuserait d'exécuter le script (« Text file busy »).
            let mut writer = Command::new("/bin/sh")
                .args(["-c", "cat > \"$0\" && chmod 755 \"$0\""])
                .arg(&path)
                .stdin(Stdio::piped())
                .spawn()
                .unwrap();
            let script = format!("#!/bin/sh\n{body}\n");
            writer.stdin.take().unwrap().write_all(script.as_bytes()).unwrap();
            assert!(writer.wait().unwrap().success(), "écriture du faux adb impossible");
            FakeAdb { dir, path }
        }
    }

    #[cfg(unix)]
    impl Drop for FakeAdb {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.dir);
        }
    }

    #[cfg(unix)]
    #[test]
    fn network_call_times_out_on_hung_adb() {
        let adb = FakeAdb::new("exec sleep 30");
        let start = std::time::Instant::now();
        let err = connect_with(&adb.path, "1.2.3.4", 5555).unwrap_err();
        assert!(start.elapsed() < NETWORK_TIMEOUT + Duration::from_secs(1));
        assert_eq!(err, "adb n'a pas répondu en 8 s");
    }

    #[cfg(unix)]
    #[test]
    fn slow_shell_leaves_device_listed_as_unknown() {
        let adb = FakeAdb::new(
            r#"case "$1" in
  devices) printf 'List of devices attached\nSLOW device usb:1 model:x\nFAST device usb:2 model:y\n' ;;
  -s) if [ "$2" = SLOW ]; then exec sleep 30; fi
      printf 'Pixel 7\npanther\n14\n' ;;
esac"#,
        );
        let start = std::time::Instant::now();
        let devices = list_devices_with(&adb.path).unwrap();
        assert!(start.elapsed() < SHELL_TIMEOUT + Duration::from_secs(1));
        assert_eq!(devices.len(), 2);
        assert_eq!(devices[0].serial, "SLOW");
        assert_eq!(devices[0].model, "Inconnu");
        assert_eq!(devices[1].serial, "FAST");
        assert_eq!(devices[1].model, "Pixel 7");
        assert_eq!(devices[1].android_version, "14");
    }

    fn pairs(v: &[(&str, &str)]) -> Vec<(String, String)> {
        v.iter().map(|(a, b)| (a.to_string(), b.to_string())).collect()
    }

    #[test]
    fn parse_devices_skips_header_daemon_and_blank_lines() {
        let out = "* daemon not running; starting now at tcp:5037\n\
                   * daemon started successfully\n\
                   List of devices attached\n\
                   R58M12345              device usb:1-1 product:a model:SM_G model:x transport_id:1\n\
                   \n\
                   0123ABC                unauthorized usb:1-2 transport_id:2\n\
                   192.168.1.20:5555      offline transport_id:3\n\
                   adb-R58M12345-AbCdEf._adb-tls-connect._tcp device product:a model:b transport_id:4\n\
                   [fe80::1]:5555         device product:a transport_id:5\n\
                   \n";
        assert_eq!(
            parse_devices(out),
            pairs(&[
                ("R58M12345", "device"),
                ("0123ABC", "unauthorized"),
                ("192.168.1.20:5555", "offline"),
                ("adb-R58M12345-AbCdEf._adb-tls-connect._tcp", "device"),
                ("[fe80::1]:5555", "device"),
            ])
        );
    }

    #[test]
    fn parse_devices_empty_list() {
        assert!(parse_devices("List of devices attached\n\n").is_empty());
        assert!(parse_devices("").is_empty());
    }

    #[test]
    fn parse_device_info_normal_output_with_ip() {
        let text = "Pixel 7\npanther\n14\n\
                    3: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 3000\n    \
                    inet 192.168.1.20/24 brd 192.168.1.255 scope global wlan0\n       \
                    valid_lft forever preferred_lft forever\n";
        assert_eq!(
            parse_device_info(text, true),
            DeviceInfo {
                model: "Pixel 7".into(),
                product: "panther".into(),
                android_version: "14".into(),
                ip: Some("192.168.1.20".into()),
            }
        );
        assert_eq!(parse_device_info(text, false).ip, None);
    }

    #[test]
    fn parse_device_info_empty_fields_give_unknown_model() {
        assert_eq!(parse_device_info("\n\n\n", true), DeviceInfo::unknown());
        assert_eq!(parse_device_info("", false), DeviceInfo::unknown());
    }

    #[test]
    fn parse_device_info_without_wlan0() {
        let info = parse_device_info("Pixel 7\npanther\n14\n", true);
        assert_eq!(info.model, "Pixel 7");
        assert_eq!(info.ip, None);
    }

    #[test]
    fn connection_type_and_ip_from_serial() {
        let mdns = "adb-R58M12345-AbCdEf._adb-tls-connect._tcp";
        assert_eq!(connection_type(mdns), "wireless");
        assert_eq!(extract_ip_from_serial(mdns), None);

        assert_eq!(connection_type("[fe80::1]:5555"), "wireless");
        assert_eq!(extract_ip_from_serial("[fe80::1]:5555").as_deref(), Some("fe80::1"));

        assert_eq!(connection_type("192.168.1.20:5555"), "wireless");
        assert_eq!(
            extract_ip_from_serial("192.168.1.20:5555").as_deref(),
            Some("192.168.1.20")
        );

        assert_eq!(connection_type("R58M12345"), "usb");
        assert_eq!(extract_ip_from_serial("R58M12345"), None);
    }

    #[cfg(unix)]
    #[test]
    fn wireless_devices_get_an_ip() {
        let adb = FakeAdb::new(
            r#"case "$1" in
  devices) printf 'List of devices attached\nadb-R58M12345-AbCdEf._adb-tls-connect._tcp device\n192.168.1.30:5555 device\n' ;;
  -s) printf 'Pixel 7\npanther\n14\n'
      case "$4" in *wlan0*) printf '    inet 192.168.1.20/24 brd 192.168.1.255 scope global wlan0\n' ;; esac ;;
esac"#,
        );
        let devices = list_devices_with(&adb.path).unwrap();
        assert_eq!(devices[0].connection_type, "wireless");
        assert_eq!(devices[0].ip_address.as_deref(), Some("192.168.1.20"));
        assert_eq!(devices[1].connection_type, "wireless");
        assert_eq!(devices[1].ip_address.as_deref(), Some("192.168.1.30"));
    }

    #[cfg(unix)]
    #[test]
    fn disconnect_reports_adb_error() {
        let adb = FakeAdb::new("echo \"error: no such device '$2'\" >&2; exit 1");
        let err = disconnect_with(&adb.path, "1.2.3.4:5555").unwrap_err();
        assert!(err.contains("error: no such device '1.2.3.4:5555'"), "{err}");
    }

    #[cfg(unix)]
    #[test]
    fn disconnect_reports_error_printed_on_stdout_with_status_zero() {
        let adb = FakeAdb::new("echo \"error: no such device '$2'\"; exit 0");
        let err = disconnect_with(&adb.path, "1.2.3.4:5555").unwrap_err();
        assert!(err.contains("error: no such device '1.2.3.4:5555'"), "{err}");
    }

    #[cfg(unix)]
    #[test]
    fn disconnect_succeeds() {
        let adb = FakeAdb::new("echo \"disconnected $2\"; exit 0");
        assert_eq!(disconnect_with(&adb.path, "1.2.3.4:5555"), Ok(()));
    }
}
