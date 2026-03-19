import { Monitor, Zap, Volume2, Layers, Hand, Sun, Moon, Gauge } from "lucide-react";
import { useAppStore } from "../store";
import Tooltip from "../components/Tooltip";

export default function Settings() {
  const { defaultSettings, updateDefaultSettings, theme, toggleTheme } =
    useAppStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
        <h1 className="text-lg font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900">
          Paramètres
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuration par défaut pour le mirroring
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
        {/* Affichage */}
        <SettingsSection
          icon={<Monitor size={16} />}
          title="Affichage"
          description="Qualité vidéo et résolution"
        >
          <SliderField
            label="Résolution maximale"
            value={defaultSettings.max_size}
            min={480}
            max={2160}
            step={120}
            unit="p"
            presets={[720, 1080, 1440, 2160]}
            onChange={(v) => updateDefaultSettings({ max_size: v })}
            tooltip="Résolution maximale de l'écran du téléphone affichée sur le PC. 720p est suffisant pour contrôler le téléphone et consomme moins de ressources. 1080p donne une image nette. Au-delà, l'amélioration est minime sauf sur très grand écran."
          />
          <SliderField
            label="FPS maximum"
            value={defaultSettings.max_fps}
            min={15}
            max={120}
            step={15}
            unit=" fps"
            presets={[30, 60, 90, 120]}
            onChange={(v) => updateDefaultSettings({ max_fps: v })}
            tooltip="Images par seconde maximum. 30 fps consomme moins de ressources. 60 fps est fluide pour la navigation. Au-delà de 60, l'amélioration est subtile. Limitez aux capacités réelles de l'écran de votre téléphone."
          />
        </SettingsSection>

        {/* Performance */}
        <SettingsSection
          icon={<Gauge size={16} />}
          title="Performance & Latence"
          description="Optimisations pour réduire le délai d'affichage"
        >
          <SliderField
            label="Tampon d'affichage"
            value={defaultSettings.video_buffer}
            min={0}
            max={200}
            step={10}
            unit=" ms"
            presets={[0, 50, 100, 200]}
            onChange={(v) => updateDefaultSettings({ video_buffer: v })}
            tooltip="Délai ajouté avant d'afficher chaque image. 0 ms = latence minimale, idéal pour jouer ou contrôler à distance. 50-100 ms lisse les saccades sur WiFi instable. 200 ms pour les connexions très mauvaises. Sur USB, 0 ms est toujours recommandé."
          />
        </SettingsSection>

        {/* Réseau */}
        <SettingsSection
          icon={<Zap size={16} />}
          title="Réseau"
          description="Débit et compression"
        >
          <SliderField
            label="Débit vidéo"
            value={defaultSettings.bitrate}
            min={2}
            max={32}
            step={2}
            unit=" Mb/s"
            presets={[4, 8, 16, 32]}
            onChange={(v) => updateDefaultSettings({ bitrate: v })}
            tooltip="Quantité de données transmises par seconde. Plus élevé = meilleure qualité. Sur USB : 8-16 Mb/s est idéal. Sur WiFi : réduisez à 4-8 Mb/s si l'image saccade. 4 Mb/s = minimum, 32 Mb/s = qualité maximale."
          />
        </SettingsSection>

        {/* Audio */}
        <SettingsSection
          icon={<Volume2 size={16} />}
          title="Audio"
          description="Transmission du son (Android 11+)"
        >
          <ToggleField
            label="Activer l'audio"
            description="Transmet le son du téléphone vers le PC"
            value={defaultSettings.enable_audio}
            onChange={(v) => updateDefaultSettings({ enable_audio: v })}
            tooltip="Redirige le son du téléphone vers les haut-parleurs du PC. Nécessite Android 11 ou plus. Désactiver réduit légèrement la latence et la charge réseau."
          />
        </SettingsSection>

        {/* Fenêtre */}
        <SettingsSection
          icon={<Layers size={16} />}
          title="Fenêtre de mirroring"
          description="Comportement de la fenêtre scrcpy"
        >
          <ToggleField
            label="Toujours au premier plan"
            description="La fenêtre reste visible au-dessus des autres"
            value={defaultSettings.always_on_top}
            onChange={(v) => updateDefaultSettings({ always_on_top: v })}
            tooltip="La fenêtre scrcpy reste visible par-dessus toutes les autres applications. Pratique si vous travaillez sur le PC en même temps que vous surveillez ou contrôlez le téléphone."
          />
          <ToggleField
            label="Plein écran au démarrage"
            description="Lance scrcpy en mode plein écran"
            value={defaultSettings.fullscreen}
            onChange={(v) => updateDefaultSettings({ fullscreen: v })}
            tooltip="Ouvre la fenêtre scrcpy directement en plein écran. Vous pouvez basculer à tout moment avec la touche F dans la fenêtre de mirroring."
          />
        </SettingsSection>

        {/* Interactions */}
        <SettingsSection
          icon={<Hand size={16} />}
          title="Interactions"
          description="Affichage des touches et interactions"
        >
          <ToggleField
            label="Afficher les touches"
            description="Montre visuellement les touches sur l'écran mirroré"
            value={defaultSettings.show_touches}
            onChange={(v) => updateDefaultSettings({ show_touches: v })}
            tooltip="Affiche des cercles animés sur l'écran à chaque toucher. Utile pour les démonstrations, tutoriels ou enregistrements d'écran pour rendre les interactions visibles."
          />
        </SettingsSection>

        {/* Apparence */}
        <SettingsSection
          icon={theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          title="Apparence"
          description="Thème de l'interface"
        >
          <div className="flex gap-3 px-5 py-4">
            <ThemeButton
              label="Sombre"
              icon={<Moon size={16} />}
              active={theme === "dark"}
              onClick={() => theme === "light" && toggleTheme()}
            />
            <ThemeButton
              label="Clair"
              icon={<Sun size={16} />}
              active={theme === "light"}
              onClick={() => theme === "dark" && toggleTheme()}
            />
          </div>
        </SettingsSection>

        {/* Version */}
        <div className="pt-2 pb-6">
          <p className="text-xs text-slate-600 text-center">
            PhoneMirror v0.1.0 — Propulsé par scrcpy
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Composants de section ─────────────────────────────────────────────────

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/50 dark:bg-slate-900/50 light:bg-slate-50">
        <span className="text-brand-400">{icon}</span>
        <div>
          <h2 className="text-sm font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
            {title}
          </h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="bg-slate-900 dark:bg-slate-900 light:bg-white divide-y divide-slate-800 dark:divide-slate-800 light:divide-slate-100">
        {children}
      </div>
    </section>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  presets,
  onChange,
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  presets?: number[];
  onChange: (v: number) => void;
  tooltip?: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-slate-300 dark:text-slate-300 light:text-slate-700 font-medium">
            {label}
          </label>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        <span className="text-sm font-mono font-semibold text-brand-400">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-brand-500"
      />
      {presets && (
        <div className="flex gap-2 mt-3">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`
                flex-1 py-1 rounded-md text-xs font-medium transition-colors
                ${value === p
                  ? "bg-brand-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-400 dark:bg-slate-800 light:bg-slate-100 light:text-slate-600 light:hover:bg-slate-200"
                }
              `}
            >
              {p}{unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleField({
  label,
  description,
  value,
  onChange,
  tooltip,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-slate-300 dark:text-slate-300 light:text-slate-700 font-medium">
            {label}
          </p>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`
          relative w-11 h-6 rounded-full transition-colors flex-shrink-0
          ${value ? "bg-brand-600" : "bg-slate-700"}
        `}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`
            absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm
            transition-transform duration-200
            ${value ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}

function ThemeButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium
        border transition-all
        ${
          active
            ? "bg-brand-600 text-white border-brand-600"
            : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300 dark:bg-slate-800 light:bg-slate-50 light:border-slate-200 light:text-slate-600"
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}
