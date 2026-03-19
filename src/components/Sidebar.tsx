import { LayoutDashboard, Bookmark, Settings, Sun, Moon, Wifi } from "lucide-react";
import { clsx } from "clsx";
import { useAppStore } from "../store";
import type { Page } from "../types";
import { useState } from "react";
import ConnectionModal from "./ConnectionModal";

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard size={18} /> },
  { id: "profiles", label: "Profils", icon: <Bookmark size={18} /> },
  { id: "settings", label: "Paramètres", icon: <Settings size={18} /> },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, theme, toggleTheme, devices } = useAppStore();
  const [showConnect, setShowConnect] = useState(false);

  const onlineCount = devices.filter((d) => d.state === "device").length;

  return (
    <>
      <aside
        className="
          w-56 flex-shrink-0 flex flex-col
          bg-slate-900 dark:bg-slate-900 light:bg-white
          border-r border-slate-800 dark:border-slate-800 light:border-slate-200
        "
      >
        {/* Statut appareils */}
        <div className="px-4 py-3 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "w-2 h-2 rounded-full",
                onlineCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
              )}
            />
            <span className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
              {onlineCount === 0
                ? "Aucun appareil connecté"
                : `${onlineCount} appareil${onlineCount > 1 ? "s" : ""} connecté${onlineCount > 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                currentPage === item.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 dark:hover:bg-slate-800 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-100"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bas de sidebar */}
        <div className="px-2 py-3 space-y-2 border-t border-slate-800 dark:border-slate-800 light:border-slate-200">
          {/* Bouton connexion WiFi */}
          <button
            onClick={() => setShowConnect(true)}
            className="
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              bg-brand-600/10 hover:bg-brand-600/20
              text-brand-400 hover:text-brand-300
              border border-brand-600/20 hover:border-brand-600/40
              transition-all
            "
          >
            <Wifi size={18} />
            Connexion WiFi
          </button>

          {/* Toggle thème */}
          <button
            onClick={toggleTheme}
            className="
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              text-slate-400 hover:text-slate-200
              hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100
              transition-colors
            "
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </button>
        </div>
      </aside>

      {showConnect && <ConnectionModal onClose={() => setShowConnect(false)} />}
    </>
  );
}
