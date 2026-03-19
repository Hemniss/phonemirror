import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ResizeDirection } from "@tauri-apps/api/window";
import { useAppStore } from "./store";
import { useDevices } from "./hooks/useDevices";
import Sidebar from "./components/Sidebar";
import Titlebar from "./components/Titlebar";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Profiles from "./pages/Profiles";

function ResizeBorders() {
  const win = getCurrentWindow();

  const onResize = (dir: ResizeDirection) => (e: React.MouseEvent) => {
    e.preventDefault();
    win.startResizeDragging(dir);
  };

  const edge = "fixed z-[9999] select-none";
  return (
    <>
      <div className={`${edge} top-0 left-1 right-1 h-1 cursor-n-resize`} onMouseDown={onResize("north")} />
      <div className={`${edge} bottom-0 left-1 right-1 h-1 cursor-s-resize`} onMouseDown={onResize("south")} />
      <div className={`${edge} left-0 top-1 bottom-1 w-1 cursor-w-resize`} onMouseDown={onResize("west")} />
      <div className={`${edge} right-0 top-1 bottom-1 w-1 cursor-e-resize`} onMouseDown={onResize("east")} />
      <div className={`${edge} top-0 left-0 w-2 h-2 cursor-nw-resize`} onMouseDown={onResize("northWest")} />
      <div className={`${edge} top-0 right-0 w-2 h-2 cursor-ne-resize`} onMouseDown={onResize("northEast")} />
      <div className={`${edge} bottom-0 left-0 w-2 h-2 cursor-sw-resize`} onMouseDown={onResize("southWest")} />
      <div className={`${edge} bottom-0 right-0 w-2 h-2 cursor-se-resize`} onMouseDown={onResize("southEast")} />
    </>
  );
}

export default function App() {
  const { theme, currentPage } = useAppStore();

  // Applique le thème sur le root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  // Démarre le polling des appareils
  useDevices();

  return (
    <div className="flex flex-col h-screen bg-slate-950 dark:bg-slate-950 light:bg-white theme-transition">
      <ResizeBorders />
      {/* Barre de titre personnalisée */}
      <Titlebar />

      {/* Corps principal */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {currentPage === "dashboard" && <Dashboard />}
          {currentPage === "profiles" && <Profiles />}
          {currentPage === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
}
