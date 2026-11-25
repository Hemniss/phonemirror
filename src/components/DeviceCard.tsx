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
import {
  startMirror,
  stopMirror,
  enableTcpip,
  connectWireless,
  disconnectDevice,
} from "../lib/tauri";
import ProfileSelector from "./ProfileSelector";
import { delay } from "../lib/motion";

interface Props {
  device: Device;
  onRefresh: () => void;
  /** Rang dans la cascade d'arrivée */
  index?: number;
}

const STATE_LABELS: Record<string, string> = {
  device: "Connecté",
  offline: "Hors ligne",
  unauthorized: "Non autorisé",
};

export default function DeviceCard({ device, onRefresh, index = 0 }: Props) {
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
          borderless: defaultSettings.borderless,
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

  const handleDisconnect = async () => {
    setError(null);
    try {
      await disconnectDevice(device.serial);
      onRefresh();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div
      className={clsx("og-glass og-card og-rise flex flex-col gap-4", !isOnline && !isUnauthorized && "opacity-80")}
      style={{ padding: "var(--space-5)", ...delay(150, index) }}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="og-ic">
            <Smartphone size={17} aria-hidden="true" className={isOnline ? "text-fg" : "text-fg-3"} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-fg leading-tight truncate">
              {device.model || "Appareil Android"}
            </h3>
            {device.product && (
              <p className="text-xs text-fg-2 mt-0.5 truncate">{device.product}</p>
            )}
          </div>
        </div>

        {/* Pastille d'état */}
        <StatusPill state={device.state} mirroring={isMirroringActive} />
      </div>

      {/* Infos */}
      <div className="flex flex-wrap gap-1.5">
        <InfoChip
          icon={device.connection_type === "usb" ? <Usb size={12} aria-hidden="true" /> : <Wifi size={12} aria-hidden="true" />}
          label={device.connection_type === "usb" ? "USB" : "WiFi"}
        />
        {device.android_version && (
          <InfoChip icon={<Smartphone size={12} aria-hidden="true" />} label={`Android ${device.android_version}`} />
        )}
        {device.ip_address && (
          <InfoChip icon={<Wifi size={12} aria-hidden="true" />} label={device.ip_address} />
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="pm-note pm-err">
          <AlertCircle size={15} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
          <p className="break-all">{error}</p>
        </div>
      )}

      {/* Message non autorisé */}
      {isUnauthorized && (
        <div className="pm-note pm-warn">
          <Lock size={15} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
          <p>Acceptez la demande de débogage USB sur votre téléphone.</p>
        </div>
      )}

      {/* Actions */}
      {isOnline && (
        <div className="flex flex-wrap gap-2">
          {/* Mirror */}
          <ActionButton
            onClick={handleMirror}
            loading={loading}
            active={isMirroringActive}
            icon={isMirroringActive ? <Square size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            label={isMirroringActive ? "Arrêter" : "Miroir"}
            variant={isMirroringActive ? "danger" : "primary"}
          />

          {/* Profils */}
          <ProfileSelector device={device} onError={setError} />

          {/* Connexion WiFi (si USB et IP connue) */}
          {device.connection_type === "usb" && device.ip_address && (
            <ActionButton
              onClick={handleConnectWifi}
              loading={connectingWifi}
              icon={<Wifi size={14} aria-hidden="true" />}
              label="Passer en WiFi"
              variant="secondary"
            />
          )}

          {/* Déconnecter WiFi */}
          {device.connection_type === "wireless" && (
            <ActionButton
              onClick={handleDisconnect}
              icon={<WifiOff size={14} aria-hidden="true" />}
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

// Une pastille = un état : en diffusion (hot, la seule surface qui crie),
// connecté (point olive), non autorisé (accent), hors ligne (pointillés).
function StatusPill({ state, mirroring }: { state: string; mirroring: boolean }) {
  if (state === "device" && mirroring) {
    return (
      <span className="og-pill og-late">
        <span className="pm-dot" aria-hidden="true" />
        En diffusion
      </span>
    );
  }
  const cls: Record<string, string> = {
    device: "pm-ok",
    unauthorized: "og-time",
    offline: "og-wait",
  };
  return (
    <span className={clsx("og-pill", cls[state] ?? "pm-err")}>
      <span className="pm-dot" aria-hidden="true" />
      {STATE_LABELS[state] ?? state}
    </span>
  );
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="og-pill og-num font-medium">
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
  // Encre pour l'action principale de la carte, verre pour le reste.
  const variants = {
    primary: "og-btn-ink",
    secondary: "",
    danger: "og-btn-danger",
    ghost: "",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={clsx("og-btn og-s", variants[variant])}
    >
      {loading ? <span className="pm-spin" aria-hidden="true" /> : icon}
      {label}
    </button>
  );
}
