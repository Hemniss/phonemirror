import { Bookmark, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store";
import { startMirror } from "../lib/tauri";
import type { Device } from "../types";

interface Props {
  device: Device;
}

export default function ProfileSelector({ device }: Props) {
  const { profiles, setMirroring, defaultSettings } = useAppStore();
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
  };

  if (relevantProfiles.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          bg-slate-800 hover:bg-slate-700 text-slate-300
          dark:bg-slate-800 dark:hover:bg-slate-700
          light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-700
          transition-colors
        "
      >
        <Bookmark size={12} />
        Profils
        <ChevronDown size={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <div
          className="
            absolute left-0 top-full mt-1 z-20 min-w-44
            rounded-xl border shadow-xl py-1
            bg-slate-900 dark:bg-slate-900 light:bg-white
            border-slate-700 dark:border-slate-700 light:border-slate-200
            animate-slide-up
          "
        >
          {relevantProfiles.map((p) => (
            <button
              key={p.id}
              onClick={() => applyProfile(p.id)}
              className="
                w-full text-left px-3 py-2 text-xs font-medium
                text-slate-300 hover:text-white hover:bg-slate-800
                dark:hover:bg-slate-800 light:text-slate-700 light:hover:bg-slate-100
                transition-colors
              "
            >
              {p.name}
              <span className="block text-slate-500 font-normal text-[10px]">
                {p.max_fps}fps · {p.max_size}p · {p.bitrate}Mb/s
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
