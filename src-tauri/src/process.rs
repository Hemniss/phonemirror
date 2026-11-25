//! Construction des commandes externes (adb, scrcpy).
//!
//! Sous Windows, un binaire GUI qui lance un processus console fait apparaître
//! une fenêtre `cmd` noire. Comme `list_devices` est appelé toutes les 2,5 s,
//! cela produit un clignotement permanent. Le flag `CREATE_NO_WINDOW` supprime
//! cette fenêtre. Toutes les commandes externes doivent passer par ce module.

use std::io::Read;
use std::path::Path;
use std::process::{Command, Output, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

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

/// Exécute `cmd` et rend sa sortie, ou une erreur si elle dépasse `timeout`.
///
/// `cmd` doit venir de [`command`] pour garder le flag Windows. stdout et stderr
/// sont lus dans des threads : sans cela, un enfant qui écrit plus que la
/// capacité d'un tube (64 Kio) bloquerait avant de se terminer. À l'échéance,
/// l'enfant est tué puis attendu (pas de zombie), et l'erreur nomme le programme.
pub fn output_with_timeout(cmd: &mut Command, timeout: Duration) -> Result<Output, String> {
    let name = Path::new(cmd.get_program())
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "La commande".to_string());
    let timeout_error = || format!("{name} n'a pas répondu en {} s", timeout.as_secs_f64());

    let mut child = cmd
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Impossible de lancer {name} : {e}"))?;

    let stdout_rx = spawn_reader(child.stdout.take());
    let stderr_rx = spawn_reader(child.stderr.take());
    let deadline = Instant::now() + timeout;

    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if Instant::now() < deadline => thread::sleep(Duration::from_millis(10)),
            Ok(None) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(timeout_error());
            }
            Err(e) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("Erreur en attendant {name} : {e}"));
            }
        }
    };

    // Un petit-enfant (ex. serveur adb démarré à la volée) peut garder les tubes
    // ouverts après la sortie de l'enfant : on n'attend les lecteurs que
    // jusqu'à l'échéance, sans les joindre.
    let collect = |rx: mpsc::Receiver<Vec<u8>>| {
        let left = deadline.saturating_duration_since(Instant::now());
        rx.recv_timeout(left.max(Duration::from_millis(100)))
            .map_err(|_| timeout_error())
    };
    let stdout = collect(stdout_rx)?;
    let stderr = collect(stderr_rx)?;

    Ok(Output {
        status,
        stdout,
        stderr,
    })
}

/// Lit `pipe` jusqu'à la fin dans un thread et envoie le contenu sur le canal.
fn spawn_reader<R: Read + Send + 'static>(pipe: Option<R>) -> mpsc::Receiver<Vec<u8>> {
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(mut pipe) = pipe {
            let _ = pipe.read_to_end(&mut buf);
        }
        let _ = tx.send(buf);
    });
    rx
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    fn sh(script: &str) -> Command {
        let mut cmd = command(Path::new("/bin/sh"));
        cmd.args(["-c", script]);
        cmd
    }

    #[test]
    fn output_with_timeout_returns_output_and_status() {
        let out = output_with_timeout(&mut sh("echo ok; echo err >&2; exit 3"), Duration::from_secs(5))
            .unwrap();
        assert_eq!(out.stdout, b"ok\n");
        assert_eq!(out.stderr, b"err\n");
        assert_eq!(out.status.code(), Some(3));
    }

    #[test]
    fn output_with_timeout_reads_more_than_a_pipe_buffer() {
        let size = 512 * 1024;
        let script = format!("head -c {size} /dev/zero; head -c {size} /dev/zero >&2");
        let out = output_with_timeout(&mut sh(&script), Duration::from_secs(5)).unwrap();
        assert_eq!(out.stdout.len(), size);
        assert_eq!(out.stderr.len(), size);
        assert!(out.status.success());
    }

    #[test]
    fn output_with_timeout_kills_a_hung_child() {
        let pid_file = std::env::temp_dir().join(format!("pm-timeout-{}.pid", std::process::id()));
        let script = format!("echo $$ > '{}'; exec sleep 30", pid_file.display());
        let start = Instant::now();
        let err = output_with_timeout(&mut sh(&script), Duration::from_millis(500)).unwrap_err();
        assert!(start.elapsed() < Duration::from_millis(1500), "{:?}", start.elapsed());
        assert_eq!(err, "sh n'a pas répondu en 0.5 s");

        let pid = std::fs::read_to_string(&pid_file).unwrap();
        let _ = std::fs::remove_file(&pid_file);
        let alive = Command::new("kill")
            .args(["-0", pid.trim()])
            .stderr(Stdio::null())
            .status()
            .unwrap()
            .success();
        assert!(!alive, "le processus {} existe encore", pid.trim());
    }
}
