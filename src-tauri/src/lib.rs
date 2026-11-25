mod adb;
mod ipc_surface;
mod mirror_table;
mod process;
mod profiles;
mod scrcpy;

use scrcpy::ScrcpyProcesses;
use tauri::{Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ScrcpyProcesses::default())
        .invoke_handler(tauri::generate_handler![
            // ADB
            adb::list_devices,
            adb::connect_wireless,
            adb::disconnect_device,
            adb::enable_tcpip,
            adb::pair_device,
            // scrcpy / mirror
            scrcpy::start_mirror,
            scrcpy::stop_mirror,
            scrcpy::is_mirroring,
            // Profils
            profiles::get_profiles,
            profiles::save_profile,
            profiles::delete_profile,
        ])
        .build(tauri::generate_context!())
        .expect("Erreur lors du lancement de PhoneMirror")
        .run(|app, event| {
            // Fermer l'app ne doit pas laisser de fenêtre scrcpy orpheline.
            if let RunEvent::Exit = event {
                app.state::<ScrcpyProcesses>().stop_all();
            }
        });
}
