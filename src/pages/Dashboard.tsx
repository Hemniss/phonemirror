import { RefreshCw, Smartphone, Wifi, AlertCircle, Cable } from "lucide-react";
import { useAppStore } from "../store";
import { useDevices } from "../hooks/useDevices";
import DeviceCard from "../components/DeviceCard";
import { useState } from "react";
import ConnectionModal from "../components/ConnectionModal";
import { delay } from "../lib/motion";

export default function Dashboard() {
  const { devices, devicesLoading, globalError } = useAppStore();
  const { refresh } = useDevices();
  const [showConnect, setShowConnect] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  const usbDevices = devices.filter((d) => d.connection_type === "usb");
  const wifiDevices = devices.filter((d) => d.connection_type === "wireless");

  return (
    <div className="pm-page">
      {/* En-tête de page */}
      <div className="pm-page-h">
        <div>
          <h1 className="og-rise">Tableau de bord</h1>
          <p className="og-rise og-num" style={delay(40)}>
            {devices.length === 0
              ? "Aucun appareil détecté"
              : `${devices.length} appareil${devices.length > 1 ? "s" : ""} détecté${devices.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-2 og-rise" style={delay(80)}>
          <button
            onClick={handleRefresh}
            disabled={devicesLoading || refreshing}
            className="og-btn"
          >
            <RefreshCw
              size={15}
              aria-hidden="true"
              className={devicesLoading || refreshing ? "animate-spin" : ""}
            />
            Actualiser
          </button>
          <button onClick={() => setShowConnect(true)} className="og-btn og-btn-ink">
            <Wifi size={15} aria-hidden="true" />
            Connexion WiFi
          </button>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="pm-scroll space-y-6">
        {/* Erreur ADB */}
        {globalError && (
          <div className="og-glass og-card og-rise flex items-start gap-3" style={delay(110)}>
            <AlertCircle size={17} aria-hidden="true" className="text-danger mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-danger">Erreur ADB</p>
              <p className="text-[13px] text-fg-2 mt-0.5 break-all">{globalError}</p>
            </div>
          </div>
        )}

        {/* État vide */}
        {!devicesLoading && devices.length === 0 && !globalError && (
          <EmptyState />
        )}

        {/* Appareils USB */}
        {usbDevices.length > 0 && (
          <section>
            <SectionHeader
              icon={<Cable size={14} aria-hidden="true" />}
              title="Connexion USB"
              count={usbDevices.length}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
              {usbDevices.map((device, i) => (
                <DeviceCard key={device.serial} device={device} onRefresh={refresh} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Appareils WiFi */}
        {wifiDevices.length > 0 && (
          <section>
            <SectionHeader
              icon={<Wifi size={14} aria-hidden="true" />}
              title="Connexion WiFi"
              count={wifiDevices.length}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
              {wifiDevices.map((device, i) => (
                <DeviceCard
                  key={device.serial}
                  device={device}
                  onRefresh={refresh}
                  index={usbDevices.length + i}
                />
              ))}
            </div>
          </section>
        )}

        {/* Chargement initial */}
        {devicesLoading && devices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-fg-2">
            <span className="pm-spin" style={{ width: 28, height: 28 }} aria-hidden="true" />
            <p className="text-sm">Recherche des appareils…</p>
          </div>
        )}
      </div>

      {showConnect && <ConnectionModal onClose={() => setShowConnect(false)} />}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 px-1 og-rise" style={delay(110)}>
      <span className="text-fg-2">{icon}</span>
      <h2 className="og-label">{title}</h2>
      <span className="og-pill og-num">{count}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="og-glass og-card og-rise flex flex-col items-center text-center gap-4 py-10" style={delay(150)}>
      <div className="og-ic" style={{ width: 56, height: 56 }}>
        <Smartphone size={26} aria-hidden="true" className="text-fg-2" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-fg">Aucun appareil connecté</h3>
        <p className="text-sm text-fg-2 mt-1 max-w-xs">
          Branchez votre téléphone en USB ou connectez-vous en WiFi
        </p>
      </div>
      <ol className="og-list text-left max-w-sm w-full">
        {[
          <>Activez le <strong>débogage USB</strong> dans les options développeur</>,
          <>Branchez votre téléphone en USB</>,
          <>Acceptez la demande d&apos;autorisation sur votre téléphone</>,
          <>Ou cliquez sur <strong>Connexion WiFi</strong> pour un accès sans fil</>,
        ].map((step, i) => (
          <li key={i} className="og-row og-fadein text-[13px] text-fg" style={{ minHeight: 44, ...delay(160 + i * 20) }}>
            <span className="og-pill og-num">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
