import { Minus, Square, X, Smartphone } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function Titlebar() {
  const win = getCurrentWindow();

  return (
    <div
      className="
        flex items-center justify-between h-10 px-4 flex-shrink-0
        bg-slate-950 dark:bg-slate-950 light:bg-white
        border-b border-slate-800 dark:border-slate-800 light:border-slate-200
        drag-region
      "
    >
      {/* Logo + nom */}
      <div className="flex items-center gap-2 no-drag">
        <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center">
          <Smartphone size={13} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
          PhoneMirror
        </span>
      </div>

      {/* Contrôles fenêtre */}
      <div className="flex items-center no-drag">
        <button
          onClick={() => win.minimize()}
          className="
            w-8 h-8 flex items-center justify-center rounded
            text-slate-400 hover:text-slate-200 hover:bg-slate-800
            dark:hover:bg-slate-800 light:hover:bg-slate-200
            transition-colors
          "
          aria-label="Réduire"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="
            w-8 h-8 flex items-center justify-center rounded
            text-slate-400 hover:text-slate-200 hover:bg-slate-800
            dark:hover:bg-slate-800 light:hover:bg-slate-200
            transition-colors
          "
          aria-label="Agrandir"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => win.close()}
          className="
            w-8 h-8 flex items-center justify-center rounded
            text-slate-400 hover:text-white hover:bg-red-600
            transition-colors
          "
          aria-label="Fermer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
