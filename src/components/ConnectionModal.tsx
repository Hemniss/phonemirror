import { useState } from "react";
import { X, Wifi, Link2, QrCode } from "lucide-react";
import { createPortal } from "react-dom";
import { connectWireless, pairDevice } from "../lib/tauri";

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

  // Rendu dans <body> : la fenêtre de verre porte un backdrop-filter, qui
  // ferait de tout `position: fixed` descendant un enfant de la fenêtre.
  return createPortal(
    <div className="pm-backdrop og-root" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wifi-title"
        className="og-dialog w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="og-ic">
              <Wifi size={17} aria-hidden="true" />
            </div>
            <h2 id="wifi-title" className="text-xl font-bold text-fg">
              Connexion WiFi
            </h2>
          </div>
          <button onClick={onClose} className="pm-iconbtn" aria-label="Fermer">
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        {/* Onglets */}
        <div className="px-6 pt-1">
          <div className="og-seg" role="tablist">
            <TabButton
              active={mode === "connect"}
              onClick={() => setMode("connect")}
              icon={<Link2 size={14} aria-hidden="true" />}
              label="Connexion directe"
            />
            <TabButton
              active={mode === "pair"}
              onClick={() => setMode("pair")}
              icon={<QrCode size={14} aria-hidden="true" />}
              label="Appairage (Android 11+)"
            />
          </div>
        </div>

        {/* Contenu */}
        <div className="px-6 py-5 space-y-4">
          {mode === "connect" ? (
            <>
              <p className="pm-note">
                Assurez-vous que votre téléphone est sur le même réseau WiFi.
                Branchez-le en USB, activez le débogage TCP/IP depuis un
                appareil USB, puis connectez-vous en WiFi.
              </p>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="wifi-ip" className={labelCls}>Adresse IP</label>
                  <input
                    id="wifi-ip"
                    type="text"
                    placeholder="192.168.1.100"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    className="og-input og-num"
                  />
                </div>
                <div className="w-24">
                  <label htmlFor="wifi-port" className={labelCls}>Port</label>
                  <input
                    id="wifi-port"
                    type="text"
                    placeholder="5555"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="og-input og-num"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="pm-note">
                <span>
                  Sur Android 11+, allez dans{" "}
                  <strong className="text-fg">
                    Paramètres → Options développeur → Débogage WiFi
                  </strong>{" "}
                  et utilisez le code de couplage affiché.
                </span>
              </p>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="pair-ip" className={labelCls}>IP d&apos;appairage</label>
                  <input
                    id="pair-ip"
                    type="text"
                    placeholder="192.168.1.100"
                    value={pairIp}
                    onChange={(e) => setPairIp(e.target.value)}
                    className="og-input og-num"
                  />
                </div>
                <div className="w-24">
                  <label htmlFor="pair-port" className={labelCls}>Port</label>
                  <input
                    id="pair-port"
                    type="text"
                    placeholder="37000"
                    value={pairPort}
                    onChange={(e) => setPairPort(e.target.value)}
                    className="og-input og-num"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pair-code" className={labelCls}>Code de couplage (6 chiffres)</label>
                <input
                  id="pair-code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value)}
                  className="og-input og-num"
                />
              </div>
            </>
          )}

          {/* Retour */}
          {error && <p className="pm-note pm-err break-all">{error}</p>}
          {success && <p className="pm-note pm-ok">{success}</p>}
        </div>

        {/* Pied */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="og-btn flex-1">
            Annuler
          </button>
          <button
            onClick={mode === "connect" ? handleConnect : handlePair}
            disabled={loading}
            className="og-btn og-btn-ink flex-1"
          >
            {loading && <span className="pm-spin" aria-hidden="true" />}
            {mode === "connect" ? "Connecter" : "Appairer"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const labelCls = "block text-xs font-semibold text-fg-2 mb-1.5";

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
    <button role="tab" aria-selected={active} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
