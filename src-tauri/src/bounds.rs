//! Bornes des valeurs saisies dans le webview avant leur passage à adb ou scrcpy.
//!
//! Les mêmes plages sont reprises côté frontend (`src/lib/validation.ts`) ;
//! la vérification ici reste la seule qui compte, le webview pouvant appeler
//! les commandes IPC directement.

pub const MAX_FPS: (u32, u32) = (15, 120);
pub const MAX_SIZE: (u32, u32) = (480, 2160);
pub const BITRATE_MBPS: (u32, u32) = (2, 32);
pub const VIDEO_BUFFER_MS: (u32, u32) = (0, 200);

/// Port TCP utilisable : 1-65535 (`u16` exclut déjà les valeurs au-delà).
pub fn check_port(port: u16) -> Result<(), String> {
    if port == 0 {
        return Err("Port invalide : attendu un entier entre 1 et 65535".into());
    }
    Ok(())
}

/// Code d'appairage Android : exactement 6 chiffres. Interdit aussi un
/// argument commençant par `-`, qu'adb lirait comme une option.
pub fn check_pair_code(code: &str) -> Result<(), String> {
    if code.len() == 6 && code.bytes().all(|b| b.is_ascii_digit()) {
        Ok(())
    } else {
        Err("Code d'appairage invalide : attendu 6 chiffres".into())
    }
}

pub fn check_range(label: &str, value: u32, (min, max): (u32, u32)) -> Result<(), String> {
    if (min..=max).contains(&value) {
        Ok(())
    } else {
        Err(format!("{label} hors bornes : {value} (attendu {min}-{max})"))
    }
}

/// Variante pour les champs facultatifs : `None` laisse scrcpy choisir.
pub fn check_opt_range(label: &str, value: Option<u32>, bounds: (u32, u32)) -> Result<(), String> {
    value.map_or(Ok(()), |v| check_range(label, v, bounds))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn port_zero_refuse_bornes_acceptees() {
        assert!(check_port(0).is_err());
        assert!(check_port(1).is_ok());
        assert!(check_port(65535).is_ok());
    }

    #[test]
    fn code_appairage_six_chiffres_seulement() {
        assert!(check_pair_code("123456").is_ok());
        for bad in ["", "12345", "1234567", "12345a", "-12345", " 23456"] {
            assert!(check_pair_code(bad).is_err(), "{bad:?} accepté");
        }
    }

    #[test]
    fn plage_inclusive() {
        assert!(check_range("Débit", 2, BITRATE_MBPS).is_ok());
        assert!(check_range("Débit", 32, BITRATE_MBPS).is_ok());
        assert!(check_range("Débit", 1, BITRATE_MBPS).is_err());
        assert!(check_range("Débit", 33, BITRATE_MBPS).is_err());
        assert!(check_opt_range("Débit", None, BITRATE_MBPS).is_ok());
        assert!(check_opt_range("Débit", Some(64), BITRATE_MBPS).is_err());
    }
}
