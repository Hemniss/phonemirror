import { RefreshCw, Smartphone, Wifi, AlertCircle, Cable } from "lucide-react";
import { useAppStore } from "../store";
import { useDevices } from "../hooks/useDevices";
import DeviceCard from "../components/DeviceCard";
import { useState } from "react";
import ConnectionModal from "../components/ConnectionModal";

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
    <div className="flex flex-col h-full">
      {/* Header de page */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900">
            Tableau de bord
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {devices.length === 0
              ? "Aucun appareil détecté"
              : `${devices.length} appareil${devices.length > 1 ? "s" : ""} détecté${devices.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConnect(true)}
            className="
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              bg-brand-600 hover:bg-brand-500 text-white transition-colors
            "
          >
            <Wifi size={15} />
            Connexion WiFi
          </button>
          <button
            onClick={handleRefresh}
            disabled={devicesLoading || refreshing}
            className="
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              bg-slate-800 hover:bg-slate-700 text-slate-300
              dark:bg-slate-800 dark:hover:bg-slate-700
              light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-700
              disabled:opacity-50 transition-colors
            "
          >
            <RefreshCw
              size={15}
              className={devicesLoading || refreshing ? "animate-spin" : ""}
            />
            Actualiser
          </button>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
        {/* Erreur ADB */}
        {globalError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Erreur ADB</p>
              <p className="text-xs text-red-400/80 mt-0.5">{globalError}</p>
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
              icon={<Cable size={14} />}
              title="Connexion USB"
              count={usbDevices.length}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
              {usbDevices.map((device) => (
                <DeviceCard key={device.serial} device={device} onRefresh={refresh} />
              ))}
            </div>
          </section>
        )}

        {/* Appareils WiFi */}
        {wifiDevices.length > 0 && (
          <section>
            <SectionHeader
              icon={<Wifi size={14} />}
              title="Connexion WiFi"
              count={wifiDevices.length}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
              {wifiDevices.map((device) => (
                <DeviceCard key={device.serial} device={device} onRefresh={refresh} />
              ))}
            </div>
          </section>
        )}

        {/* Chargement initial */}
        {devicesLoading && devices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Recherche des appareils…</p>
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
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <h2 className="text-sm font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">
        {title}
      </h2>
      <span className="text-xs text-slate-500 bg-slate-800 dark:bg-slate-800 light:bg-slate-100 px-1.5 py-0.5 rounded-md">
        {count}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-slate-800 dark:bg-slate-800 light:bg-slate-100 flex items-center justify-center">
        <Smartphone size={36} className="text-slate-600" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">
          Aucun appareil connecté
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">
          Branchez votre téléphone en USB ou connectez-vous en WiFi
        </p>
      </div>
      <div className="flex flex-col gap-2 text-xs text-slate-500 bg-slate-900 dark:bg-slate-900 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-xl p-4 max-w-sm">
        <p className="font-medium text-slate-400 mb-1">Pour commencer :</p>
        <p>① Activez le <strong className="text-slate-300">débogage USB</strong> dans les options développeur</p>
        <p>② Branchez votre téléphone en USB</p>
        <p>③ Acceptez la demande d&apos;autorisation sur votre téléphone</p>
        <p>④ Ou cliquez sur <strong className="text-slate-300">Connexion WiFi</strong> pour un accès sans fil</p>
      </div>
    </div>
  );
}
