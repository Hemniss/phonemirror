import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "./store";
import { useDevices } from "./hooks/useDevices";
import Sidebar from "./components/Sidebar";
import Titlebar from "./components/Titlebar";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Profiles from "./pages/Profiles";
import { markEntering } from "./lib/motion";
import { getProfiles } from "./lib/tauri";

function ResizeBorders() {
  const win = getCurrentWindow();

  const onResize = (dir: Parameters<typeof win.startResizeDragging>[0]) => (e: React.MouseEvent) => {
    e.preventDefault();
    win.startResizeDragging(dir);
  };

  const edge = "fixed z-[9999] select-none";
  return (
    <>
      <div className={`${edge} top-0 left-1 right-1 h-1 cursor-n-resize`} onMouseDown={onResize("North")} />
      <div className={`${edge} bottom-0 left-1 right-1 h-1 cursor-s-resize`} onMouseDown={onResize("South")} />
      <div className={`${edge} left-0 top-1 bottom-1 w-1 cursor-w-resize`} onMouseDown={onResize("West")} />
      <div className={`${edge} right-0 top-1 bottom-1 w-1 cursor-e-resize`} onMouseDown={onResize("East")} />
      <div className={`${edge} top-0 left-0 w-2 h-2 cursor-nw-resize`} onMouseDown={onResize("NorthWest")} />
      <div className={`${edge} top-0 right-0 w-2 h-2 cursor-ne-resize`} onMouseDown={onResize("NorthEast")} />
      <div className={`${edge} bottom-0 left-0 w-2 h-2 cursor-sw-resize`} onMouseDown={onResize("SouthWest")} />
      <div className={`${edge} bottom-0 right-0 w-2 h-2 cursor-se-resize`} onMouseDown={onResize("SouthEast")} />
    </>
  );
}

export default function App() {
  const { theme, currentPage } = useAppStore();

  // Applique le thème (tokens Orga Glass sous [data-theme])
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Arrivée de la première page, puis plus rien ne rejoue
  useEffect(() => {
    markEntering();
  }, []);

  // Démarre le polling des appareils (seul appel de useDevices)
  useDevices();

  // Charge les profils dès le lancement : sans eux, les cartes n'ont pas de
  // bouton « Profils » tant que la page Profils n'a pas été ouverte. Un échec
  // ne bloque pas le tableau de bord ; la page Profils affiche le sien.
  useEffect(() => {
    getProfiles()
      .then((profiles) => useAppStore.getState().setProfiles(profiles))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Décor : intérieur chaud flouté, dessiné une fois derrière le verre */}
      <div className="og-scene" aria-hidden="true">
        <i className="s-wall" />
        <i className="s-window" />
        <i className="s-lamp" />
        <i className="s-shelf" />
        <i className="s-plant" />
        <i className="s-sofa" />
        <i className="s-rug" />
        <i className="s-floor" />
      </div>
      <ResizeBorders />
      <div className="pm-shell">
        {/* Barre de titre personnalisée */}
        <Titlebar />

        {/* Fenêtre de verre : barre latérale cuivrée + page */}
        <div className="og-window pm-window">
          <Sidebar />
          <main>
            {currentPage === "dashboard" && <Dashboard />}
            {currentPage === "profiles" && <Profiles />}
            {currentPage === "settings" && <Settings />}
          </main>
        </div>
      </div>
    </>
  );
}
