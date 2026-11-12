import { useState } from "react";
import { X, Upload, Download, FolderOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { createPortal } from "react-dom";
import { open, save } from "@tauri-apps/plugin-dialog";
import { pushFile, pullFile } from "../lib/tauri";
import type { Device } from "../types";

interface Props {
  device: Device;
  onClose: () => void;
}

export default function FileTransferModal({ device, onClose }: Props) {
  // Push (PC → téléphone)
  const [pushLocalPath, setPushLocalPath] = useState("");
  const [pushRemotePath, setPushRemotePath] = useState("/sdcard/");
  const [pushLoading, setPushLoading] = useState(false);

  // Pull (téléphone → PC)
  const [pullRemotePath, setPullRemotePath] = useState("/sdcard/");
  const [pullLocalPath, setPullLocalPath] = useState("");
  const [pullLoading, setPullLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const handleBrowseLocal = async () => {
    const selected = await open({
      multiple: false,
      title: "Choisir un fichier à envoyer",
    });
    if (selected && typeof selected === "string") {
      setPushLocalPath(selected);
    }
  };

  const handleBrowseSave = async () => {
    const selected = await save({
      title: "Enregistrer le fichier téléchargé",
    });
    if (selected) {
      setPullLocalPath(selected);
    }
  };

  const handlePush = async () => {
    if (!pushLocalPath || !pushRemotePath) return;
    clearFeedback();
    setPushLoading(true);
    try {
      await pushFile(device.serial, pushLocalPath, pushRemotePath);
      setSuccess("Fichier envoyé avec succès !");
    } catch (err) {
      setError(String(err));
    } finally {
      setPushLoading(false);
    }
  };

  const handlePull = async () => {
    if (!pullRemotePath || !pullLocalPath) return;
    clearFeedback();
    setPullLoading(true);
    try {
      await pullFile(device.serial, pullRemotePath, pullLocalPath);
      setSuccess("Fichier téléchargé avec succès !");
    } catch (err) {
      setError(String(err));
    } finally {
      setPullLoading(false);
    }
  };

  // Rendu dans <body> : voir ConnectionModal (backdrop-filter de la fenêtre).
  return createPortal(
    <div className="pm-backdrop og-root" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="ft-title" className="og-dialog w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="og-ic">
              <FolderOpen size={17} aria-hidden="true" />
            </div>
            <div>
              <h2 id="ft-title" className="text-xl font-bold text-fg">Transfert de fichiers</h2>
              <p className="text-xs text-fg-2">{device.model}</p>
            </div>
          </div>
          <button onClick={onClose} className="pm-iconbtn" aria-label="Fermer">
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Push : PC → Téléphone */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-fg">
              <Upload size={15} aria-hidden="true" />
              <h3 className="text-sm font-semibold">Envoyer vers le téléphone</h3>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pushLocalPath}
                  placeholder="Fichier local..."
                  className="og-input flex-1 cursor-pointer"
                  onClick={handleBrowseLocal}
                />
                <button onClick={handleBrowseLocal} className="og-btn og-s self-center">
                  Parcourir
                </button>
              </div>
              <input
                type="text"
                value={pushRemotePath}
                onChange={(e) => setPushRemotePath(e.target.value)}
                placeholder="Destination sur le téléphone"
                className="og-input"
              />
              <button
                onClick={handlePush}
                disabled={pushLoading || !pushLocalPath}
                className="og-btn og-btn-ink w-full"
              >
                {pushLoading ? <span className="pm-spin" aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}
                Envoyer
              </button>
            </div>
          </section>

          <div className="h-px bg-line" />

          {/* Pull : Téléphone → PC */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-fg">
              <Download size={15} aria-hidden="true" />
              <h3 className="text-sm font-semibold">Récupérer depuis le téléphone</h3>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={pullRemotePath}
                onChange={(e) => setPullRemotePath(e.target.value)}
                placeholder="Chemin sur le téléphone (ex: /sdcard/DCIM/...)"
                className="og-input"
              />
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pullLocalPath}
                  placeholder="Destination locale..."
                  className="og-input flex-1 cursor-pointer"
                  onClick={handleBrowseSave}
                />
                <button onClick={handleBrowseSave} className="og-btn og-s self-center">
                  Parcourir
                </button>
              </div>
              <button
                onClick={handlePull}
                disabled={pullLoading || !pullRemotePath || !pullLocalPath}
                className="og-btn w-full"
              >
                {pullLoading ? <span className="pm-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
                Télécharger
              </button>
            </div>
          </section>

          {/* Retour */}
          {error && (
            <div className="pm-note pm-err">
              <AlertCircle size={15} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
              <p className="break-all">{error}</p>
            </div>
          )}
          {success && (
            <div className="pm-note pm-ok">
              <CheckCircle2 size={15} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
