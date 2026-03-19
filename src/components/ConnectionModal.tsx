import { useState } from "react";
import { X, Wifi, Link2, QrCode } from "lucide-react";
import { clsx } from "clsx";
import { connectWireless, pairDevice } from "../lib/tauri";
import { useAppStore } from "../store";

interface Props {
  onClose: () => void;
}

type Mode = "connect" | "pair";

export default function ConnectionModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>("connect");

  // Mode connexion directe
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("5555");

  // Mode appairage (Android 11+)
  const [pairIp, setPairIp] = useState("");
  const [pairPort, setPairPort] = useState("");
  const [pairCode, setPairCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { setGlobalError } = useAppStore();

  const handleConnect = async () => {
    if (!ip.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const addr = await connectWireless(ip.trim(), parseInt(port) || 5555);
      setSuccess(`Connecté à ${addr}`);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePair = async () => {
    if (!pairIp.trim() || !pairPort.trim() || !pairCode.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await pairDevice(pairIp.trim(), parseInt(pairPort), pairCode.trim());
      setSuccess("Appairage réussi ! Vous pouvez maintenant vous connecter.");
      setMode("connect");
      setIp(pairIp);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="
          w-full max-w-md mx-4 rounded-2xl shadow-2xl border animate-slide-up
          bg-slate-900 dark:bg-slate-900 light:bg-white
          border-slate-700 dark:border-slate-700 light:border-slate-200
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
          <div className="flex items-center gap-2">
            <Wifi size={18} className="text-brand-400" />
            <h2 className="font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900">
              Connexion WiFi
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors rounded-md p-1 hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          <TabButton
            active={mode === "connect"}
            onClick={() => setMode("connect")}
            icon={<Link2 size={14} />}
            label="Connexion directe"
          />
          <TabButton
            active={mode === "pair"}
            onClick={() => setMode("pair")}
            icon={<QrCode size={14} />}
            label="Appairage (Android 11+)"
          />
        </div>

        {/* Contenu */}
        <div className="px-6 py-5 space-y-4">
          {mode === "connect" ? (
            <>
              <InfoBox>
                <p className="text-xs text-slate-400">
                  Assurez-vous que votre téléphone est sur le même réseau WiFi.
                  Branchez-le en USB, activez le débogage TCP/IP depuis un
                  appareil USB, puis connectez-vous en WiFi.
                </p>
              </InfoBox>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Adresse IP
                  </label>
                  <input
                    type="text"
                    placeholder="192.168.1.100"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    className="
                      w-full px-3 py-2 rounded-lg text-sm
                      bg-slate-800 dark:bg-slate-800 light:bg-slate-100
                      border border-slate-700 dark:border-slate-700 light:border-slate-300
                      text-slate-200 dark:text-slate-200 light:text-slate-900
                      placeholder:text-slate-600
                      focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30
                      transition-colors
                    "
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Port
                  </label>
                  <input
                    type="text"
                    placeholder="5555"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="
                      w-full px-3 py-2 rounded-lg text-sm
                      bg-slate-800 dark:bg-slate-800 light:bg-slate-100
                      border border-slate-700 dark:border-slate-700 light:border-slate-300
                      text-slate-200 dark:text-slate-200 light:text-slate-900
                      focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30
                      transition-colors
                    "
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <InfoBox>
                <p className="text-xs text-slate-400">
                  Sur Android 11+, allez dans{" "}
                  <strong className="text-slate-300">
                    Paramètres → Options développeur → Débogage WiFi
                  </strong>{" "}
                  et utilisez le code de couplage affiché.
                </p>
              </InfoBox>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    IP d&apos;appairage
                  </label>
                  <input
                    type="text"
                    placeholder="192.168.1.100"
                    value={pairIp}
                    onChange={(e) => setPairIp(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Port
                  </label>
                  <input
                    type="text"
                    placeholder="37000"
                    value={pairPort}
                    onChange={(e) => setPairPort(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Code de couplage (6 chiffres)
                </label>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value)}
                  className={inputCls}
                />
              </div>
            </>
          )}

          {/* Feedback */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
              {success}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="
              flex-1 py-2 rounded-lg text-sm font-medium
              bg-slate-800 hover:bg-slate-700 text-slate-300
              transition-colors
            "
          >
            Annuler
          </button>
          <button
            onClick={mode === "connect" ? handleConnect : handlePair}
            disabled={loading}
            className="
              flex-1 py-2 rounded-lg text-sm font-medium
              bg-brand-600 hover:bg-brand-500 text-white
              disabled:opacity-50 transition-colors
              flex items-center justify-center gap-2
            "
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {mode === "connect" ? "Connecter" : "Appairer"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = `
  w-full px-3 py-2 rounded-lg text-sm
  bg-slate-800 dark:bg-slate-800 light:bg-slate-100
  border border-slate-700 dark:border-slate-700 light:border-slate-300
  text-slate-200 dark:text-slate-200 light:text-slate-900
  placeholder:text-slate-600
  focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30
  transition-colors
`;

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 dark:bg-slate-800/50 light:bg-slate-50 rounded-lg p-3 border border-slate-700/50 dark:border-slate-700/50 light:border-slate-200">
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
        active
          ? "bg-brand-600 text-white"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
