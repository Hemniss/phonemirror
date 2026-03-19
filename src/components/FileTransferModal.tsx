import { useState } from "react";
import { X, Upload, Download, FolderOpen, AlertCircle, CheckCircle2 } from "lucide-react";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="
          w-full max-w-lg mx-4 rounded-2xl shadow-2xl border animate-slide-up
          bg-slate-900 dark:bg-slate-900 light:bg-white
          border-slate-700 dark:border-slate-700 light:border-slate-200
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-brand-400" />
            <div>
              <h2 className="font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900">
                Transfert de fichiers
              </h2>
              <p className="text-xs text-slate-500">{device.model}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors rounded-md p-1 hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Push : PC → Téléphone */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Upload size={14} className="text-brand-400" />
              <h3 className="text-sm font-medium text-slate-200 dark:text-slate-200 light:text-slate-800">
                Envoyer vers le téléphone
              </h3>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pushLocalPath}
                  placeholder="Fichier local..."
                  className={inputCls + " flex-1 cursor-pointer"}
                  onClick={handleBrowseLocal}
                />
                <button
                  onClick={handleBrowseLocal}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Parcourir
                </button>
              </div>
              <input
                type="text"
                value={pushRemotePath}
                onChange={(e) => setPushRemotePath(e.target.value)}
                placeholder="Destination sur le téléphone"
                className={inputCls}
              />
              <button
                onClick={handlePush}
                disabled={pushLoading || !pushLocalPath}
                className="
                  w-full py-2 rounded-lg text-sm font-medium
                  bg-brand-600 hover:bg-brand-500 text-white
                  disabled:opacity-40 transition-colors
                  flex items-center justify-center gap-2
                "
              >
                {pushLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                Envoyer
              </button>
            </div>
          </section>

          <div className="h-px bg-slate-800 dark:bg-slate-800 light:bg-slate-200" />

          {/* Pull : Téléphone → PC */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Download size={14} className="text-emerald-400" />
              <h3 className="text-sm font-medium text-slate-200 dark:text-slate-200 light:text-slate-800">
                Récupérer depuis le téléphone
              </h3>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={pullRemotePath}
                onChange={(e) => setPullRemotePath(e.target.value)}
                placeholder="Chemin sur le téléphone (ex: /sdcard/DCIM/...)"
                className={inputCls}
              />
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pullLocalPath}
                  placeholder="Destination locale..."
                  className={inputCls + " flex-1 cursor-pointer"}
                  onClick={handleBrowseSave}
                />
                <button
                  onClick={handleBrowseSave}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Parcourir
                </button>
              </div>
              <button
                onClick={handlePull}
                disabled={pullLoading || !pullRemotePath || !pullLocalPath}
                className="
                  w-full py-2 rounded-lg text-sm font-medium
                  bg-emerald-600 hover:bg-emerald-500 text-white
                  disabled:opacity-40 transition-colors
                  flex items-center justify-center gap-2
                "
              >
                {pullLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Télécharger
              </button>
            </div>
          </section>

          {/* Feedback */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-400 break-all">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-400">{success}</p>
            </div>
          )}
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
