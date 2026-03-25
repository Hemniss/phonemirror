use serde::{Deserialize, Serialize};
use std::process::Command;
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

    which::which("adb").map_err(|_| {
        "ADB introuvable. Lancez le script scripts/download-scrcpy.sh pour télécharger scrcpy."
            .to_string()
    })
}

/// Liste les appareils Android connectés (USB + WiFi).
#[tauri::command]
pub async fn list_devices(app: AppHandle) -> Result<Vec<Device>, String> {
    let adb = get_adb_path(&app)?;

    let output = Command::new(&adb)
        .args(["devices", "-l"])
        .output()
        .map_err(|e| format!("Erreur ADB: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let mut devices = Vec::new();

    for line in stdout.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() || line.starts_with('*') {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let serial = parts[0].to_string();
        let state = parts[1].to_string();
        let connection_type = if serial.contains(':') {
            "wireless"
        } else {
            "usb"
        }
        .to_string();

        if state != "device" {
            // Appareil offline ou non autorisé
            devices.push(Device {
                serial: serial.clone(),
                model: "Appareil inconnu".to_string(),
                product: String::new(),
                state,
                connection_type,
                android_version: String::new(),
                ip_address: extract_ip_from_serial(&serial),
            });
            continue;
        }

        let (model, product, android_version, ip_address) =
            get_device_info(&adb, &serial, connection_type == "usb");

        devices.push(Device {
            serial,
            model,
            product,
            state,
            connection_type,
            android_version,
            ip_address,
        });
    }

    Ok(devices)
}

/// Récupère modèle, produit, version Android et IP en **une seule** commande shell.
/// Remplace les anciens appels séquentiels à get_prop × 3 + get_device_ip.
fn get_device_info(
    adb: &std::path::Path,
    serial: &str,
    fetch_ip: bool,
) -> (String, String, String, Option<String>) {
    let cmd = if fetch_ip {
        "printf '%s\\n%s\\n%s\\n' \"$(getprop ro.product.model)\" \"$(getprop ro.product.name)\" \"$(getprop ro.build.version.release)\"; ip -f inet addr show wlan0 2>/dev/null"
    } else {
        "printf '%s\\n%s\\n%s\\n' \"$(getprop ro.product.model)\" \"$(getprop ro.product.name)\" \"$(getprop ro.build.version.release)\""
    };

    let Ok(output) = Command::new(adb).args(["-s", serial, "shell", cmd]).output() else {
        return ("Inconnu".to_string(), String::new(), String::new(), None);
    };

    let text = String::from_utf8_lossy(&output.stdout);
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

    (model, product, android_version, ip)
}

fn extract_ip_from_serial(serial: &str) -> Option<String> {
    if serial.contains(':') {
        serial.split(':').next().map(|s| s.to_string())
    } else {
        None
    }
}

/// Connecte un appareil en WiFi via ADB.
#[tauri::command]
pub async fn connect_wireless(app: AppHandle, ip: String, port: u16) -> Result<String, String> {
    let adb = get_adb_path(&app)?;
    let addr = format!("{ip}:{port}");

    let output = Command::new(&adb)
        .args(["connect", &addr])
        .output()
        .map_err(|e| e.to_string())?;

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
    Command::new(&adb)
        .args(["disconnect", &serial])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Active le mode TCP/IP sur un appareil USB (préparation connexion WiFi).
#[tauri::command]
pub async fn enable_tcpip(app: AppHandle, serial: String, port: u16) -> Result<(), String> {
    let adb = get_adb_path(&app)?;
    let output = Command::new(&adb)
        .args(["-s", &serial, "tcpip", &port.to_string()])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(stderr);
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
    let addr = format!("{ip}:{port}");

    let output = Command::new(&adb)
        .args(["pair", &addr, &code])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.contains("Successfully paired") {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Appairage échoué: {} {}", stdout.trim(), stderr.trim()))
    }
}

/// Retourne l'adresse IP WiFi d'un appareil USB.
#[tauri::command]
pub async fn get_device_ip_address(app: AppHandle, serial: String) -> Result<String, String> {
    let adb = get_adb_path(&app)?;
    let (_, _, _, ip) = get_device_info(&adb, &serial, true);
    ip.ok_or_else(|| "IP introuvable".to_string())
}
