import {
  Smartphone,
  Usb,
  Wifi,
  Play,
  Square,
  WifiOff,
  AlertCircle,
  Lock,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { useAppStore } from "../store";
import type { Device } from "../types";
import { startMirror, stopMirror, enableTcpip, connectWireless } from "../lib/tauri";
import ProfileSelector from "./ProfileSelector";

interface Props {
  device: Device;
  onRefresh: () => void;
}

const STATE_LABELS: Record<string, string> = {
  device: "Connecté",
  offline: "Hors ligne",
  unauthorized: "Non autorisé",
};

export default function DeviceCard({ device, onRefresh }: Props) {
  const { mirroringSerials, setMirroring, defaultSettings } = useAppStore();
  const isMirroringActive = mirroringSerials.includes(device.serial);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectingWifi, setConnectingWifi] = useState(false);

  const isOnline = device.state === "device";
  const isUnauthorized = device.state === "unauthorized";

  const handleMirror = async () => {
    setError(null);
    setLoading(true);
    try {
      if (isMirroringActive) {
        await stopMirror(device.serial);
        setMirroring(device.serial, false);
      } else {
        await startMirror({
          serial: device.serial,
          max_fps: defaultSettings.max_fps,
          max_size: defaultSettings.max_size,
          bitrate: defaultSettings.bitrate,
          video_buffer: defaultSettings.video_buffer,
          enable_audio: defaultSettings.enable_audio,
          always_on_top: defaultSettings.always_on_top,
          fullscreen: defaultSettings.fullscreen,
          show_touches: defaultSettings.show_touches,
          rotation: null,
          record_path: null,
          window_title: device.model,
        });
        setMirroring(device.serial, true);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWifi = async () => {
    if (!device.ip_address) return;
    setError(null);
    setConnectingWifi(true);
    try {
      await enableTcpip(device.serial, 5555);
      // Attendre 1.5s que le mode TCP/IP soit activé
      await new Promise((r) => setTimeout(r, 1500));
      await connectWireless(device.ip_address, 5555);
      onRefresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setConnectingWifi(false);
    }
  };

  return (
    <div
        className={clsx(
          "rounded-xl border p-4 flex flex-col gap-3 transition-all animate-fade-in",
          "bg-slate-900 dark:bg-slate-900 light:bg-white",
          isOnline
            ? "border-slate-700 dark:border-slate-700 light:border-slate-200 hover:border-brand-600/50"
            : "border-slate-800 dark:border-slate-800 light:border-slate-200 opacity-70"
        )}
      >
        {/* En-tête */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                isOnline ? "bg-brand-600/15" : "bg-slate-800 dark:bg-slate-800 light:bg-slate-100"
              )}
            >
              <Smartphone
                size={20}
                className={isOnline ? "text-brand-400" : "text-slate-500"}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 leading-tight">
                {device.model || "Appareil Android"}
              </h3>
              {device.product && (
                <p className="text-xs text-slate-500 mt-0.5">{device.product}</p>
              )}
            </div>
          </div>

          {/* Badge statut */}
          <StatusBadge state={device.state} />
        </div>

        {/* Infos */}
        <div className="flex flex-wrap gap-2">
          <InfoChip
            icon={
              device.connection_type === "usb" ? (
                <Usb size={12} />
              ) : (
                <Wifi size={12} />
              )
            }
            label={device.connection_type === "usb" ? "USB" : "WiFi"}
          />
          {device.android_version && (
            <InfoChip icon={<Smartphone size={12} />} label={`Android ${device.android_version}`} />
          )}
          {device.ip_address && (
            <InfoChip icon={<Wifi size={12} />} label={device.ip_address} />
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-400 break-all">{error}</p>
          </div>
        )}

        {/* Message non autorisé */}
        {isUnauthorized && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Lock size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              Acceptez la demande de débogage USB sur votre téléphone.
            </p>
          </div>
        )}

        {/* Actions */}
        {isOnline && (
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Mirror */}
            <ActionButton
              onClick={handleMirror}
              loading={loading}
              active={isMirroringActive}
              icon={isMirroringActive ? <Square size={14} /> : <Play size={14} />}
              label={isMirroringActive ? "Arrêter" : "Miroir"}
              variant={isMirroringActive ? "danger" : "primary"}
            />

            {/* Profils */}
            <ProfileSelector device={device} />

            {/* Connexion WiFi (si USB et IP connue) */}
            {device.connection_type === "usb" && device.ip_address && (
              <ActionButton
                onClick={handleConnectWifi}
                loading={connectingWifi}
                icon={<Wifi size={14} />}
                label="Passer en WiFi"
                variant="secondary"
              />
            )}

            {/* Déconnecter WiFi */}
            {device.connection_type === "wireless" && (
              <ActionButton
                onClick={async () => {
                  const { disconnectDevice } = await import("../lib/tauri");
                  await disconnectDevice(device.serial);
                  onRefresh();
                }}
                icon={<WifiOff size={14} />}
                label="Déconnecter"
                variant="ghost"
              />
            )}
          </div>
        )}
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function StatusBadge({ state }: { state: string }) {
  const classes = {
    device: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    offline: "bg-slate-700/50 text-slate-500 border-slate-600/20",
    unauthorized: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  const cls = classes[state as keyof typeof classes] ?? classes.offline;

  return (
    <span
      className={clsx(
        "text-xs font-medium px-2 py-0.5 rounded-full border",
        cls
      )}
    >
      {STATE_LABELS[state] ?? state}
    </span>
  );
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 px-2 py-0.5 rounded-md">
      {icon}
      {label}
    </span>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  active?: boolean;
}

function ActionButton({
  onClick,
  icon,
  label,
  variant = "secondary",
  loading = false,
}: ActionButtonProps) {
  const base =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50";

  const variants = {
    primary:
      "bg-brand-600 hover:bg-brand-500 text-white shadow-sm",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-700",
    danger: "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/20",
    ghost:
      "text-slate-500 hover:text-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={clsx(base, variants[variant])}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}
