//! Table des processus scrcpy en cours, indexée par serial d'appareil.
//!
//! Indépendante de Tauri pour être testable sans téléphone : on lui passe une
//! `std::process::Command` déjà construite. Le verrou n'est jamais gardé
//! pendant une attente asynchrone : `start_mirror` appelle `spawn`, attend,
//! puis appelle `confirm`.

use std::collections::HashMap;
use std::io::Read;
use std::process::{Child, Command};
use std::sync::Mutex;

#[derive(Default)]
pub struct MirrorTable(Mutex<HashMap<String, Child>>);

impl MirrorTable {
    fn lock(&self) -> std::sync::MutexGuard<'_, HashMap<String, Child>> {
        // Un panic pendant que le verrou est tenu ne doit pas rendre la table
        // inutilisable : les données (des `Child`) restent cohérentes.
        self.0.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Lance `cmd` pour `serial` et l'inscrit aussitôt, avant toute attente.
    /// Un processus déjà inscrit pour ce serial est remplacé : tué et attendu
    /// avant le lancement du nouveau. Retourne le PID à passer à `confirm`.
    pub fn spawn(&self, serial: &str, cmd: &mut Command) -> Result<u32, String> {
        let mut procs = self.lock();
        if let Some(old) = procs.remove(serial) {
            terminate(old);
        }
        let child = cmd
            .spawn()
            .map_err(|e| format!("Impossible de démarrer scrcpy: {e}"))?;
        let pid = child.id();
        procs.insert(serial.to_string(), child);
        Ok(pid)
    }

    /// À appeler après la fenêtre d'observation qui suit `spawn`.
    ///
    /// - processus déjà terminé : retiré de la table, erreur avec stderr ;
    /// - entrée absente ou autre PID (arrêt ou remplacement pendant
    ///   l'attente) : rien n'est réinscrit, `Ok(())` ;
    /// - processus vivant : il reste inscrit.
    pub fn confirm(&self, serial: &str, pid: u32) -> Result<(), String> {
        let mut procs = self.lock();
        let exited = match procs.get_mut(serial) {
            Some(child) if child.id() == pid => match child.try_wait() {
                Ok(Some(status)) => Some(status),
                _ => None,
            },
            _ => return Ok(()),
        };
        match exited {
            Some(status) => {
                let mut child = procs.remove(serial).expect("entrée vérifiée ci-dessus");
                // La lecture de stderr se fait hors du verrou.
                drop(procs);
                Err(failure_message(&mut child, status))
            }
            None => Ok(()),
        }
    }

    /// Arrête le processus de `serial`, s'il existe, et attend sa fin.
    pub fn stop(&self, serial: &str) {
        let child = self.lock().remove(serial);
        if let Some(child) = child {
            terminate(child);
        }
    }

    /// Arrête et attend tous les processus inscrits (fermeture de l'app).
    pub fn stop_all(&self) {
        let children: Vec<Child> = self.lock().drain().map(|(_, c)| c).collect();
        for child in children {
            terminate(child);
        }
    }

    /// Indique si `serial` a un processus vivant ; retire l'entrée sinon.
    pub fn is_running(&self, serial: &str) -> bool {
        let mut procs = self.lock();
        let running = match procs.get_mut(serial) {
            Some(child) => matches!(child.try_wait(), Ok(None)),
            None => return false,
        };
        if !running {
            procs.remove(serial);
        }
        running
    }
}

/// Tue puis attend le processus, pour qu'il ne reste ni orphelin ni zombie.
/// L'erreur de `kill` (processus déjà terminé) est ignorée : `wait` suffit
/// alors à le récupérer.
fn terminate(mut child: Child) {
    let _ = child.kill();
    let _ = child.wait();
}

fn failure_message(child: &mut Child, status: std::process::ExitStatus) -> String {
    let mut stderr_msg = String::new();
    if let Some(mut stderr) = child.stderr.take() {
        let _ = stderr.read_to_string(&mut stderr_msg);
    }
    let detail = stderr_msg.trim();
    if detail.is_empty() {
        format!("scrcpy a échoué (code {:?})", status.code())
    } else {
        format!("scrcpy: {detail}")
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    fn sleeper() -> Command {
        let mut cmd = Command::new("sleep");
        cmd.arg("30");
        cmd
    }

    fn pid_alive(pid: u32) -> bool {
        Command::new("kill")
            .args(["-0", &pid.to_string()])
            .stderr(std::process::Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    /// Tue les PID restants si une assertion a échoué, pour ne laisser aucun `sleep`.
    struct Reaper(Vec<u32>);
    impl Drop for Reaper {
        fn drop(&mut self) {
            for pid in &self.0 {
                let _ = Command::new("kill").args(["-9", &pid.to_string()]).status();
            }
        }
    }

    #[test]
    fn second_start_replaces_first() {
        let table = MirrorTable::default();
        let first_pid = table.spawn("dev", &mut sleeper()).unwrap();
        let mut reaper = Reaper(vec![first_pid]);
        table.confirm("dev", first_pid).unwrap();

        let second_pid = table.spawn("dev", &mut sleeper()).unwrap();
        reaper.0.push(second_pid);
        table.confirm("dev", second_pid).unwrap();

        assert!(!pid_alive(first_pid), "le premier scrcpy est resté orphelin");
        assert!(table.is_running("dev"));
        table.stop("dev");
    }

    #[test]
    fn stop_during_startup_window_wins() {
        let table = MirrorTable::default();
        let pid = table.spawn("dev", &mut sleeper()).unwrap();
        let _reaper = Reaper(vec![pid]);

        // Arrêt demandé pendant les 600 ms d'observation.
        table.stop("dev");
        table.confirm("dev", pid).unwrap();

        assert!(!table.is_running("dev"), "le processus a été réinscrit après l'arrêt");
        assert!(!pid_alive(pid), "le processus tourne encore après l'arrêt");
    }

    fn ps_stat(pid: u32) -> String {
        let out = Command::new("ps")
            .args(["-o", "stat=", "-p", &pid.to_string()])
            .output()
            .expect("ps indisponible");
        String::from_utf8_lossy(&out.stdout).trim().to_string()
    }

    #[test]
    fn stop_leaves_no_zombie() {
        let table = MirrorTable::default();
        let pid = table.spawn("dev", &mut sleeper()).unwrap();
        let _reaper = Reaper(vec![pid]);
        table.confirm("dev", pid).unwrap();

        table.stop("dev");

        assert_eq!(ps_stat(pid), "", "processus encore présent (zombie ?) après l'arrêt");
        // Un second arrêt sur une entrée absente ne doit pas échouer.
        table.stop("dev");
    }

    #[test]
    fn stop_all_terminates_every_process() {
        let table = MirrorTable::default();
        let mut pids = Vec::new();
        for serial in ["a", "b", "c"] {
            pids.push(table.spawn(serial, &mut sleeper()).unwrap());
        }
        let _reaper = Reaper(pids.clone());

        table.stop_all();

        for pid in pids {
            assert_eq!(ps_stat(pid), "", "PID {pid} encore présent après stop_all");
        }
        for serial in ["a", "b", "c"] {
            assert!(!table.is_running(serial));
        }
    }
}
