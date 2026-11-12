import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function Titlebar() {
  const win = getCurrentWindow();

  const handleDrag = (e: React.MouseEvent) => {
    // Prevent drag when clicking on buttons (no-drag elements)
    if ((e.target as HTMLElement).closest(".no-drag")) return;
    e.preventDefault();
    win.startDragging();
  };

  // Bande posée sur le décor : la marque vit dans la barre latérale,
  // il ne reste ici que la zone de glisser et les contrôles de fenêtre.
  return (
    <div onMouseDown={handleDrag} className="pm-titlebar">
      <div className="flex items-center gap-1 no-drag">
        <button onClick={() => win.minimize()} className="pm-winbtn" aria-label="Réduire">
          <Minus size={14} aria-hidden="true" />
        </button>
        <button onClick={() => win.toggleMaximize()} className="pm-winbtn" aria-label="Agrandir">
          <Square size={11} aria-hidden="true" />
        </button>
        <button onClick={() => win.close()} className="pm-winbtn pm-close" aria-label="Fermer">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
