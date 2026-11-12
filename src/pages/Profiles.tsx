import {
  Plus,
  Bookmark,
  Trash2,
  Edit2,
  X,
  Save,
} from "lucide-react";
import Tooltip from "../components/Tooltip";
import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { getProfiles, saveProfile, deleteProfile } from "../lib/tauri";
import { delay } from "../lib/motion";
import type { Profile } from "../types";

const DEFAULT_PROFILE: Omit<Profile, "id" | "created_at"> = {
  name: "Nouveau profil",
  device_serial: null,
  max_fps: 60,
  max_size: 1080,
  bitrate: 8,
  video_buffer: 0,
  enable_audio: true,
  always_on_top: false,
  show_touches: false,
};

export default function Profiles() {
  const { profiles, setProfiles, devices } = useAppStore();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .catch((err) => setError(String(err)));
  }, [setProfiles]);

  const handleCreate = () => {
    const now = new Date().toISOString();
    setEditing({
      id: crypto.randomUUID(),
      created_at: now,
      ...DEFAULT_PROFILE,
    });
  };

  const handleSave = async (profile: Profile) => {
    setLoading(true);
    setError(null);
    try {
      await saveProfile(profile);
      const updated = await getProfiles();
      setProfiles(updated);
      setEditing(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteProfile(id);
      const updated = await getProfiles();
      setProfiles(updated);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pm-page">
      <div className="pm-page-h">
        <div>
          <h1 className="og-rise">Profils</h1>
          <p className="og-rise" style={delay(40)}>Configurations sauvegardées pour le mirroring</p>
        </div>
        <button onClick={handleCreate} className="og-btn og-btn-ink og-rise" style={delay(80)}>
          <Plus size={15} aria-hidden="true" />
          Nouveau profil
        </button>
      </div>

      <div className="pm-scroll">
        {error && <p className="pm-note pm-err break-all mb-4">{error}</p>}

        {/* Formulaire d'édition */}
        {editing && (
          <ProfileForm
            profile={editing}
            devices={devices}
            loading={loading}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            onChange={setEditing}
          />
        )}

        {/* Liste des profils */}
        {profiles.length === 0 && !editing ? (
          <EmptyProfiles onCreate={handleCreate} />
        ) : (
          <div className="og-glass og-card og-rise mt-4" style={delay(150)}>
            <div className="og-card-h">
              <div>
                <h2>Mes profils</h2>
                <p className="og-num">
                  {profiles.length} profil{profiles.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <ul className="og-list">
              {profiles.map((profile, i) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  index={i}
                  onEdit={() => setEditing(profile)}
                  onDelete={() => handleDelete(profile.id)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function ProfileCard({
  profile,
  index,
  onEdit,
  onDelete,
}: {
  profile: Profile;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className="og-row og-fadein group"
      style={index < 12 ? delay(160 + index * 20) : undefined}
    >
      <div className="og-ic" style={{ width: 36, height: 36 }}>
        <Bookmark size={16} aria-hidden="true" />
      </div>
      <div className="og-t">
        <b>{profile.name}</b>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Chip label={`${profile.max_fps} fps`} />
          <Chip label={`${profile.max_size}p`} />
          <Chip label={`${profile.bitrate} Mb/s`} />
          {profile.enable_audio && <Chip label="Audio" />}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
        <IconButton onClick={onEdit} icon={<Edit2 size={15} aria-hidden="true" />} label="Modifier" />
        <IconButton onClick={onDelete} icon={<Trash2 size={15} aria-hidden="true" />} label="Supprimer" danger />
      </div>
    </li>
  );
}

function ProfileForm({
  profile,
  devices,
  loading,
  onSave,
  onCancel,
  onChange,
}: {
  profile: Profile;
  devices: { serial: string; model: string }[];
  loading: boolean;
  onSave: (p: Profile) => void;
  onCancel: () => void;
  onChange: (p: Profile) => void;
}) {
  const set = (key: keyof Profile, value: unknown) =>
    onChange({ ...profile, [key]: value });

  return (
    <div className="og-glass og-card space-y-5" style={{ animation: "og-rise 260ms var(--og-ease-out) both" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-fg">
          {profile.id ? "Modifier le profil" : "Nouveau profil"}
        </h3>
        <button onClick={onCancel} className="pm-iconbtn" aria-label="Fermer">
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Nom du profil</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
            placeholder="Ex: Streaming Twitch, Qualité maximale…"
          />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Appareil associé (optionnel)</label>
          <select
            value={profile.device_serial ?? ""}
            onChange={(e) => set("device_serial", e.target.value || null)}
            className={inputCls}
          >
            <option value="">Tous les appareils</option>
            {devices.map((d) => (
              <option key={d.serial} value={d.serial}>
                {d.model} ({d.serial})
              </option>
            ))}
          </select>
        </div>

        <NumField
          label="FPS maximum"
          value={profile.max_fps}
          min={15}
          max={120}
          onChange={(v) => set("max_fps", v)}
          tooltip="Images par seconde. 30 fps consomme moins de ressources. 60 fps est fluide pour la navigation et les jeux. Au-delà de 60, l'amélioration est subtile."
        />
        <NumField
          label="Résolution (px)"
          value={profile.max_size}
          min={480}
          max={2160}
          onChange={(v) => set("max_size", v)}
          tooltip="Résolution maximale en pixels (côté le plus long). 720 = rapide et léger. 1080 = qualité standard. 1440+ = très net mais plus gourmand."
        />
        <NumField
          label="Débit (Mb/s)"
          value={profile.bitrate}
          min={1}
          max={64}
          onChange={(v) => set("bitrate", v)}
          tooltip="Quantité de données vidéo par seconde. Sur USB : 8-16 Mb/s. Sur WiFi : 4-8 Mb/s. Plus élevé = meilleure qualité mais plus de bande passante."
        />
        <NumField
          label="Tampon d'affichage (ms)"
          value={profile.video_buffer}
          min={0}
          max={200}
          onChange={(v) => set("video_buffer", v)}
          tooltip="Délai avant d'afficher chaque image. 0 ms = latence minimale, idéal pour les jeux. 50-100 ms lisse les saccades sur WiFi instable. Sur USB, gardez 0."
        />
      </div>

      <div className="flex flex-col gap-1">
        <Toggle
          label="Audio activé"
          value={profile.enable_audio}
          onChange={(v) => set("enable_audio", v)}
          tooltip="Transmet le son du téléphone vers le PC. Nécessite Android 11+. Désactiver réduit légèrement la latence."
        />
        <Toggle
          label="Toujours au premier plan"
          value={profile.always_on_top}
          onChange={(v) => set("always_on_top", v)}
          tooltip="La fenêtre scrcpy reste visible par-dessus les autres applications. Pratique pour surveiller le téléphone en travaillant."
        />
        <Toggle
          label="Afficher les touches"
          value={profile.show_touches}
          onChange={(v) => set("show_touches", v)}
          tooltip="Affiche des cercles visuels à chaque toucher. Utile pour les démonstrations ou enregistrements d'écran."
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="og-btn flex-1">
          Annuler
        </button>
        <button
          onClick={() => onSave(profile)}
          disabled={loading || !profile.name.trim()}
          className="og-btn og-btn-ink flex-1"
        >
          {loading ? <span className="pm-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
          Sauvegarder
        </button>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  onChange,
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  tooltip?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className={labelCls.replace(" mb-1.5", "")}>{label}</label>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputCls + " og-num"}
        aria-label={label}
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
  tooltip,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-fg font-medium">
          {label}
        </span>
        {tooltip && <Tooltip content={tooltip} />}
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

function Chip({ label }: { label: string }) {
  return <span className="og-pill og-num" style={{ padding: "1px 7px", fontSize: 11 }}>{label}</span>;
}

function IconButton({
  onClick,
  icon,
  label,
  danger = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={danger ? "pm-iconbtn pm-danger" : "pm-iconbtn"}>
      {icon}
    </button>
  );
}

function EmptyProfiles({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="og-glass og-card og-rise flex flex-col items-center text-center gap-4 py-10" style={delay(150)}>
      <div className="og-ic" style={{ width: 56, height: 56 }}>
        <Bookmark size={26} aria-hidden="true" className="text-fg-2" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-fg">Aucun profil</h3>
        <p className="text-sm text-fg-2 mt-1">
          Créez des profils pour réutiliser vos configurations préférées
        </p>
      </div>
      <button onClick={onCreate} className="og-btn">
        <Plus size={15} aria-hidden="true" />
        Créer mon premier profil
      </button>
    </div>
  );
}

const labelCls = "block text-xs font-semibold text-fg-2 mb-1.5";
const inputCls = "og-input";
