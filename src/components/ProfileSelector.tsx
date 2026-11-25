import { Bookmark, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store";
import { startMirror, stopMirror } from "../lib/tauri";
import type { Device } from "../types";

interface Props {
  device: Device;
  /** Reçoit le message d'erreur à afficher sur la carte (null pour l'effacer) */
  onError: (message: string | null) => void;
}

export default function ProfileSelector({ device, onError }: Props) {
  const { profiles, mirroringSerials, setMirroring, defaultSettings } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const relevantProfiles = profiles.filter(
    (p) => !p.device_serial || p.device_serial === device.serial
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const applyProfile = async (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    setOpen(false);

    onError(null);
    try {
      // Un miroir tourne déjà : l'arrêter d'abord, sinon le premier scrcpy
      // reste ouvert et n'est plus suivi par l'interface.
      if (mirroringSerials.includes(device.serial)) {
        await stopMirror(device.serial);
        setMirroring(device.serial, false);
      }

      await startMirror({
        serial: device.serial,
        max_fps: profile.max_fps,
        max_size: profile.max_size,
        bitrate: profile.bitrate,
        video_buffer: profile.video_buffer,
        enable_audio: profile.enable_audio,
        always_on_top: profile.always_on_top,
        fullscreen: false,
        // Les profils ne couvrent pas ce réglage : on suit la préférence globale.
        borderless: defaultSettings.borderless,
        show_touches: profile.show_touches,
        rotation: null,
        record_path: null,
        window_title: `${device.model} — ${profile.name}`,
      });
      setMirroring(device.serial, true);
    } catch (err) {
      onError(String(err));
    }
  };

  if (relevantProfiles.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="og-btn og-s"
        aria-expanded={open}
      >
        <Bookmark size={12} aria-hidden="true" />
        Profils
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={open ? "rotate-180 transition-transform duration-200 ease-og-out" : "transition-transform duration-200 ease-og-out"}
        />
      </button>

      {open && (
        <div className="pm-menu og-dialog">
          {relevantProfiles.map((p) => (
            <button key={p.id} onClick={() => applyProfile(p.id)}>
              {p.name}
              <small>
                {p.max_fps} fps · {p.max_size}p · {p.bitrate} Mb/s
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
