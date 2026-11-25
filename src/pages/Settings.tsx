import { Monitor, Zap, Volume2, Layers, Hand, Sun, Moon, Gauge } from "lucide-react";
import { useAppStore } from "../store";
import Tooltip from "../components/Tooltip";
import { delay } from "../lib/motion";
// Version lue dans package.json à la compilation (import nommé : Vite
// n'embarque que ce champ, pas le reste du fichier).
import { version as appVersion } from "../../package.json";

export default function Settings() {
  const { defaultSettings, updateDefaultSettings, theme, toggleTheme } =
    useAppStore();

  return (
    <div className="pm-page">
      <div className="pm-page-h">
        <div>
          <h1 className="og-rise">Paramètres</h1>
          <p className="og-rise" style={delay(40)}>Configuration par défaut pour le mirroring</p>
        </div>
      </div>

      <div className="pm-scroll space-y-4">
        {/* Affichage */}
        <SettingsSection
          index={0}
          icon={<Monitor size={17} aria-hidden="true" />}
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
          index={1}
          icon={<Gauge size={17} aria-hidden="true" />}
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
          index={2}
          icon={<Zap size={17} aria-hidden="true" />}
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
          index={3}
          icon={<Volume2 size={17} aria-hidden="true" />}
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
          index={4}
          icon={<Layers size={17} aria-hidden="true" />}
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
          <ToggleField
            label="Masquer la barre de titre"
            description="Affiche uniquement l'écran du téléphone, sans bandeau"
            value={defaultSettings.borderless}
            onChange={(v) => updateDefaultSettings({ borderless: v })}
            tooltip="Supprime le bandeau et les bordures de la fenêtre de mirroring : seul l'écran du téléphone reste visible. Sans barre de titre, la fenêtre ne peut plus être déplacée à la souris — désactivez cette option si vous avez besoin de la repositionner."
          />
        </SettingsSection>

        {/* Interactions */}
        <SettingsSection
          index={5}
          icon={<Hand size={17} aria-hidden="true" />}
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
          index={6}
          icon={theme === "dark" ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
          title="Apparence"
          description="Thème de l'interface"
        >
          <div className="py-3">
            <div className="og-seg" role="tablist" aria-label="Thème">
              <ThemeButton
                label="Sombre"
                icon={<Moon size={15} aria-hidden="true" />}
                active={theme === "dark"}
                onClick={() => theme === "light" && toggleTheme()}
              />
              <ThemeButton
                label="Clair"
                icon={<Sun size={15} aria-hidden="true" />}
                active={theme === "light"}
                onClick={() => theme === "dark" && toggleTheme()}
              />
            </div>
          </div>
        </SettingsSection>

        {/* Version */}
        <div className="pt-2 pb-6">
          <p className="text-xs text-fg-2 text-center">
            PhoneMirror v{appVersion} — Propulsé par scrcpy
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
  index = 0,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <section className="og-glass og-card og-rise" style={{ paddingTop: 18, paddingBottom: 8, ...delay(110, index) }}>
      <div className="flex items-center gap-3 mb-1">
        <div className="og-ic">{icon}</div>
        <div>
          <h2 className="text-base font-bold text-fg">{title}</h2>
          <p className="text-[13px] text-fg-2">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-line">{children}</div>
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
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-fg font-semibold">{label}</label>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        <span className="text-sm font-bold text-fg og-num">
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
        className="pm-range"
        aria-label={label}
      />
      {presets && (
        <div className="flex gap-2 mt-3">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              aria-pressed={value === p}
              className="og-chip og-num flex-1 justify-center"
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
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-fg font-semibold">{label}</p>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        <p className="text-[13px] text-fg-2 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="pm-switch"
        role="switch"
        aria-checked={value}
        aria-label={label}
      />
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
    <button role="tab" aria-selected={active} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
