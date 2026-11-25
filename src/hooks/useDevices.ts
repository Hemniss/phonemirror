import { useEffect } from "react";
import { useAppStore } from "../store";
import { listDevices, isMirroring } from "../lib/tauri";

const POLL_INTERVAL = 2500;

/** Rafraîchit une fois la liste des appareils et l'état des miroirs.
 *  Utilisable partout (bouton « Actualiser », après une connexion) sans
 *  démarrer de nouvelle boucle de polling. */
export async function refreshDevices(): Promise<void> {
  const { setDevices, setGlobalError, setMirroring } = useAppStore.getState();
  try {
    const devices = await listDevices();
    setDevices(devices);
    setGlobalError(null);

    // Vérifier en parallèle si les processus scrcpy sont toujours actifs
    const mirroringSerials = useAppStore.getState().mirroringSerials;
    await Promise.all(
      mirroringSerials.map(async (serial) => {
        const still = await isMirroring(serial);
        if (!still) setMirroring(serial, false);
      })
    );
  } catch (err) {
    setGlobalError(String(err));
  }
}

/** Démarre la boucle de polling des appareils. À appeler une seule fois,
 *  dans `App`. setTimeout récursif : deux polls ne se chevauchent jamais,
 *  même si ADB met plus de 2,5 s à répondre. */
export function useDevices() {
  useEffect(() => {
    // Propre à ce montage : un rafraîchissement terminé après le démontage
    // ne reprogramme rien (sinon la boucle survit sans que rien l'arrête).
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      if (cancelled) return;
      timer = setTimeout(async () => {
        await refreshDevices();
        scheduleNext();
      }, POLL_INTERVAL);
    };

    const { setDevicesLoading } = useAppStore.getState();
    setDevicesLoading(true);
    refreshDevices().finally(() => {
      if (!cancelled) setDevicesLoading(false);
      scheduleNext();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);
}
