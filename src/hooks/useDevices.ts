import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "../store";
import { listDevices, isMirroring } from "../lib/tauri";

const POLL_INTERVAL = 2500;

/** Hook qui actualise automatiquement la liste des appareils.
 *  Utilise setTimeout récursif pour éviter les polls qui se chevauchent
 *  si ADB met plus de 2.5s à répondre. */
export function useDevices() {
  const setDevices = useAppStore((s) => s.setDevices);
  const setDevicesLoading = useAppStore((s) => s.setDevicesLoading);
  const setGlobalError = useAppStore((s) => s.setGlobalError);
  const setMirroring = useAppStore((s) => s.setMirroring);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
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
  }, [setDevices, setGlobalError, setMirroring]);

  const scheduleNext = useCallback(() => {
    timerRef.current = setTimeout(async () => {
      await refresh();
      scheduleNext();
    }, POLL_INTERVAL);
  }, [refresh]);

  useEffect(() => {
    setDevicesLoading(true);
    refresh().finally(() => {
      setDevicesLoading(false);
      scheduleNext();
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [refresh, scheduleNext, setDevicesLoading]);

  return { refresh };
}
