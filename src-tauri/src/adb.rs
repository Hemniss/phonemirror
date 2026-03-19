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

        let model = get_prop(&adb, &serial, "ro.product.model")
            .unwrap_or_else(|_| "Inconnu".to_string());
        let product = get_prop(&adb, &serial, "ro.product.name").unwrap_or_default();
        let android_version =
            get_prop(&adb, &serial, "ro.build.version.release").unwrap_or_default();

        let ip_address = if connection_type == "usb" {
            get_device_ip(&adb, &serial).ok()
        } else {
            extract_ip_from_serial(&serial)
        };

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

fn get_prop(adb: &std::path::Path, serial: &str, prop: &str) -> Result<String, String> {
    let output = Command::new(adb)
        .args(["-s", serial, "shell", "getprop", prop])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn get_device_ip(adb: &std::path::Path, serial: &str) -> Result<String, String> {
    let output = Command::new(adb)
        .args(["-s", serial, "shell", "ip", "-f", "inet", "addr", "show", "wlan0"])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    for line in stdout.lines() {
        let line = line.trim();
        if line.starts_with("inet ") {
            if let Some(ip) = line.split_whitespace().nth(1).and_then(|s| s.split('/').next()) {
                if !ip.is_empty() {
                    return Ok(ip.to_string());
                }
            }
        }
    }
    Err("IP introuvable".to_string())
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
    get_device_ip(&adb, &serial)
}
