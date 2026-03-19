mod adb;
mod profiles;
mod scrcpy;

use scrcpy::ScrcpyProcesses;
use std::collections::HashMap;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ScrcpyProcesses(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            // ADB
            adb::list_devices,
            adb::connect_wireless,
            adb::disconnect_device,
            adb::enable_tcpip,
            adb::pair_device,
            adb::get_device_ip_address,
            // scrcpy / mirror
            scrcpy::start_mirror,
            scrcpy::stop_mirror,
            scrcpy::is_mirroring,
            scrcpy::push_file,
            scrcpy::pull_file,
            // Profils
            profiles::get_profiles,
            profiles::save_profile,
            profiles::delete_profile,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de PhoneMirror");
}
