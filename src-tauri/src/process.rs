//! Construction des commandes externes (adb, scrcpy).
//!
//! Sous Windows, un binaire GUI qui lance un processus console fait apparaître
//! une fenêtre `cmd` noire. Comme `list_devices` est appelé toutes les 2,5 s,
//! cela produit un clignotement permanent. Le flag `CREATE_NO_WINDOW` supprime
//! cette fenêtre. Toutes les commandes externes doivent passer par ce module.

use std::path::Path;
use std::process::Command;

/// Flag Windows `CREATE_NO_WINDOW` : empêche l'allocation d'une console.
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Crée une `Command` sans fenêtre console visible.
pub fn command(program: &Path) -> Command {
    let cmd = Command::new(program);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = cmd;
        cmd.creation_flags(CREATE_NO_WINDOW);
        return cmd;
    }

    #[cfg(not(target_os = "windows"))]
    cmd
}
