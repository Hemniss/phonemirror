import { LayoutDashboard, Bookmark, Settings, Sun, Moon, Wifi } from "lucide-react";
import { useAppStore } from "../store";
import type { Page } from "../types";
import { useState } from "react";
import ConnectionModal from "./ConnectionModal";
import { withPageTransition } from "../lib/motion";

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard size={17} aria-hidden="true" /> },
  { id: "profiles", label: "Profils", icon: <Bookmark size={17} aria-hidden="true" /> },
  { id: "settings", label: "Paramètres", icon: <Settings size={17} aria-hidden="true" /> },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, theme, toggleTheme, devices } = useAppStore();
  const [showConnect, setShowConnect] = useState(false);

  const onlineCount = devices.filter((d) => d.state === "device").length;

  const go = (page: Page) => {
    if (page === currentPage) return;
    withPageTransition(() => setCurrentPage(page));
  };

  return (
    <>
      <aside className="og-side">
        {/* Marque */}
        <div className="og-brand">
          <b aria-hidden="true" />
          PhoneMirror
        </div>

        {/* Navigation */}
        <nav className="og-nav" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              aria-current={currentPage === item.id ? "page" : undefined}
            >
              <i className="og-ind" aria-hidden="true" />
              {item.icon}
              <span>{item.label}</span>
              {item.id === "dashboard" && onlineCount > 0 && (
                <span className="og-badge og-num" aria-label={`${onlineCount} connecté${onlineCount > 1 ? "s" : ""}`}>
                  {onlineCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bas de barre */}
        <div className="mt-auto flex flex-col gap-1 pt-3">
          <p className="px-3 pb-2 text-xs text-white/85">
            {onlineCount === 0
              ? "Aucun appareil connecté"
              : `${onlineCount} appareil${onlineCount > 1 ? "s" : ""} connecté${onlineCount > 1 ? "s" : ""}`}
          </p>
          <button onClick={() => setShowConnect(true)} className="pm-side-btn">
            <Wifi size={17} aria-hidden="true" />
            Connexion WiFi
          </button>
          <button onClick={toggleTheme} className="pm-side-btn">
            {theme === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </button>
        </div>
      </aside>

      {showConnect && <ConnectionModal onClose={() => setShowConnect(false)} />}
    </>
  );
}
