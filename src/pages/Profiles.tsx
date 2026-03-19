import {
  Plus,
  Bookmark,
  Trash2,
  Edit2,
  X,
  Save,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { getProfiles, saveProfile, deleteProfile } from "../lib/tauri";
import type { Profile } from "../types";

const DEFAULT_PROFILE: Omit<Profile, "id" | "created_at"> = {
  name: "Nouveau profil",
  device_serial: null,
  max_fps: 60,
  max_size: 1080,
  bitrate: 8,
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900">
            Profils
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurations sauvegardées pour le mirroring
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            bg-brand-600 hover:bg-brand-500 text-white transition-colors
          "
        >
          <Plus size={15} />
          Nouveau profil
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {error && (
          <p className="text-xs text-red-400 mb-4 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

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
          <div className="space-y-3 mt-4">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onEdit={() => setEditing(profile)}
                onDelete={() => handleDelete(profile.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function ProfileCard({
  profile,
  onEdit,
  onDelete,
}: {
  profile: Profile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="
        flex items-center justify-between p-4 rounded-xl border
        bg-slate-900 dark:bg-slate-900 light:bg-white
        border-slate-800 dark:border-slate-800 light:border-slate-200
        hover:border-brand-600/30 transition-all group animate-fade-in
      "
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-600/10 flex items-center justify-center">
          <Bookmark size={18} className="text-brand-400" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-slate-200 dark:text-slate-200 light:text-slate-900">
            {profile.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Chip label={`${profile.max_fps} fps`} />
            <Chip label={`${profile.max_size}p`} />
            <Chip label={`${profile.bitrate} Mb/s`} />
            {profile.enable_audio && <Chip label="Audio" color="green" />}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton onClick={onEdit} icon={<Edit2 size={14} />} label="Modifier" />
        <IconButton
          onClick={onDelete}
          icon={<Trash2 size={14} />}
          label="Supprimer"
          danger
        />
      </div>
    </div>
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
    <div className="rounded-xl border border-brand-600/30 bg-slate-900 dark:bg-slate-900 light:bg-white p-5 space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-900">
          {profile.id ? "Modifier le profil" : "Nouveau profil"}
        </h3>
        <button
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-300 p-1 rounded-md hover:bg-slate-800 transition-colors"
        >
          <X size={16} />
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
        />
        <NumField
          label="Résolution (px)"
          value={profile.max_size}
          min={480}
          max={2160}
          onChange={(v) => set("max_size", v)}
        />
        <NumField
          label="Débit (Mb/s)"
          value={profile.bitrate}
          min={1}
          max={64}
          onChange={(v) => set("bitrate", v)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Toggle
          label="Audio activé"
          value={profile.enable_audio}
          onChange={(v) => set("enable_audio", v)}
        />
        <Toggle
          label="Toujours au premier plan"
          value={profile.always_on_top}
          onChange={(v) => set("always_on_top", v)}
        />
        <Toggle
          label="Afficher les touches"
          value={profile.show_touches}
          onChange={(v) => set("show_touches", v)}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={() => onSave(profile)}
          disabled={loading || !profile.name.trim()}
          className="
            flex-1 py-2 rounded-lg text-sm font-medium
            bg-brand-600 hover:bg-brand-500 text-white
            disabled:opacity-50 transition-colors
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={14} />
          )}
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputCls}
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate-300 dark:text-slate-300 light:text-slate-700">
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-brand-600" : "bg-slate-700"}`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

function Chip({
  label,
  color = "slate",
}: {
  label: string;
  color?: "slate" | "green";
}) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
        color === "green"
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-slate-800 text-slate-500 dark:bg-slate-800 light:bg-slate-100 light:text-slate-500"
      }`}
    >
      {label}
    </span>
  );
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
    <button
      onClick={onClick}
      title={label}
      className={`
        w-8 h-8 flex items-center justify-center rounded-lg transition-colors
        ${danger
          ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10"
          : "text-slate-500 hover:text-slate-200 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100"
        }
      `}
    >
      {icon}
    </button>
  );
}

function EmptyProfiles({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-slate-800 dark:bg-slate-800 light:bg-slate-100 flex items-center justify-center">
        <Bookmark size={36} className="text-slate-600" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">
          Aucun profil
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Créez des profils pour réutiliser vos configurations préférées
        </p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors"
      >
        <Plus size={15} />
        Créer mon premier profil
      </button>
    </div>
  );
}

const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";
const inputCls = `
  w-full px-3 py-2 rounded-lg text-sm
  bg-slate-800 dark:bg-slate-800 light:bg-slate-100
  border border-slate-700 dark:border-slate-700 light:border-slate-300
  text-slate-200 dark:text-slate-200 light:text-slate-900
  focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30
  transition-colors
`;
