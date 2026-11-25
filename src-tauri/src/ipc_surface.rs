//! Garde-fou sur la surface IPC exposée au webview.
//!
//! Chaque commande enregistrée dans `generate_handler!` peut être appelée par
//! n'importe quel script du webview. Le test ci-dessous fige la liste : toute
//! nouvelle commande doit y être ajoutée volontairement, après avoir vérifié
//! qu'elle ne donne pas accès à des fichiers ou des processus arbitraires.

#[cfg(test)]
mod tests {
    /// Liste blanche des commandes IPC. Toute nouvelle commande doit être
    /// ajoutée ici volontairement, jamais par simple mise à jour du test.
    const ALLOWED: &[&str] = &[
        "adb::list_devices",
        "adb::connect_wireless",
        "adb::disconnect_device",
        "adb::enable_tcpip",
        "adb::pair_device",
        "adb::get_device_ip_address",
        "scrcpy::start_mirror",
        "scrcpy::stop_mirror",
        "scrcpy::is_mirroring",
        "profiles::get_profiles",
        "profiles::save_profile",
        "profiles::delete_profile",
    ];

    fn registered_commands() -> Vec<String> {
        let src = include_str!("lib.rs");
        let start = src
            .find("generate_handler![")
            .expect("bloc generate_handler! introuvable dans lib.rs");
        let rest = &src[start + "generate_handler![".len()..];
        let end = rest.find(']').expect("fin du bloc generate_handler! introuvable");
        rest[..end]
            .lines()
            .map(|l| l.split("//").next().unwrap_or("").trim())
            .flat_map(|l| l.split(','))
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect()
    }

    #[test]
    fn ipc_commands_match_allowlist() {
        let registered = registered_commands();
        assert_eq!(registered, ALLOWED, "commandes IPC hors liste blanche");
    }
}
