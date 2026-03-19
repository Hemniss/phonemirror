import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "../store";
import { listDevices } from "../lib/tauri";

const POLL_INTERVAL = 2500;

/** Hook qui actualise automatiquement la liste des appareils toutes les 2.5s. */
export function useDevices() {
  const setDevices = useAppStore((s) => s.setDevices);
  const setDevicesLoading = useAppStore((s) => s.setDevicesLoading);
  const setGlobalError = useAppStore((s) => s.setGlobalError);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const devices = await listDevices();
      setDevices(devices);
      setGlobalError(null);
    } catch (err) {
      setGlobalError(String(err));
    }
  }, [setDevices, setGlobalError]);

  useEffect(() => {
    setDevicesLoading(true);
    refresh().finally(() => setDevicesLoading(false));

    timerRef.current = setInterval(refresh, POLL_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh, setDevicesLoading]);

  return { refresh };
}
