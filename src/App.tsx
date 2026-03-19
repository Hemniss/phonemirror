import { useEffect } from "react";
import { useAppStore } from "./store";
import { useDevices } from "./hooks/useDevices";
import Sidebar from "./components/Sidebar";
import Titlebar from "./components/Titlebar";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Profiles from "./pages/Profiles";

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
    <div className="flex flex-col h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-100 theme-transition">
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
