import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Device, Page, Profile, Theme, DefaultSettings } from "../types";

interface AppState {
  // Navigation
  currentPage: Page;
  setCurrentPage: (page: Page) => void;

  // Thème
  theme: Theme;
  toggleTheme: () => void;

  // Appareils
  devices: Device[];
  setDevices: (devices: Device[]) => void;

  // Serials actuellement en train d'être mirrirés
  mirroringSerials: string[];
  setMirroring: (serial: string, active: boolean) => void;

  // Enregistrement en cours
  recordingSerials: string[];
  setRecording: (serial: string, active: boolean) => void;

  // Paramètres par défaut
  defaultSettings: DefaultSettings;
  updateDefaultSettings: (settings: Partial<DefaultSettings>) => void;

  // Profils
  profiles: Profile[];
  setProfiles: (profiles: Profile[]) => void;

  // État de chargement des appareils
  devicesLoading: boolean;
  setDevicesLoading: (loading: boolean) => void;

  // Erreur globale
  globalError: string | null;
  setGlobalError: (error: string | null) => void;
}

const DEFAULT_SETTINGS: DefaultSettings = {
  max_fps: 60,
  max_size: 1080,
  bitrate: 8,
  video_buffer: 0,
  enable_audio: true,
  always_on_top: false,
  show_touches: false,
  fullscreen: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPage: "dashboard",
      setCurrentPage: (page) => set({ currentPage: page }),

      theme: "dark",
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      devices: [],
      setDevices: (devices) => set({ devices }),

      mirroringSerials: [],
      setMirroring: (serial, active) =>
        set((state) => ({
          mirroringSerials: active
            ? [...state.mirroringSerials.filter((s) => s !== serial), serial]
            : state.mirroringSerials.filter((s) => s !== serial),
        })),

      recordingSerials: [],
      setRecording: (serial, active) =>
        set((state) => ({
          recordingSerials: active
            ? [...state.recordingSerials.filter((s) => s !== serial), serial]
            : state.recordingSerials.filter((s) => s !== serial),
        })),

      defaultSettings: DEFAULT_SETTINGS,
      updateDefaultSettings: (settings) =>
        set((state) => ({
          defaultSettings: { ...state.defaultSettings, ...settings },
        })),

      profiles: [],
      setProfiles: (profiles) => set({ profiles }),

      devicesLoading: false,
      setDevicesLoading: (loading) => set({ devicesLoading: loading }),

      globalError: null,
      setGlobalError: (error) => set({ globalError: error }),
    }),
    {
      name: "phonemirror-storage",
      // Persiste uniquement le thème et les paramètres par défaut
      partialize: (state) => ({
        theme: state.theme,
        defaultSettings: state.defaultSettings,
      }),
    }
  )
);
