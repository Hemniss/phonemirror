export interface Device {
  serial: string;
  model: string;
  product: string;
  /** "device" | "offline" | "unauthorized" */
  state: string;
  /** "usb" | "wireless" */
  connection_type: string;
  android_version: string;
  ip_address: string | null;
}

export interface MirrorConfig {
  serial: string;
  max_fps: number | null;
  max_size: number | null;
  bitrate: number | null;
  enable_audio: boolean;
  always_on_top: boolean;
  fullscreen: boolean;
  show_touches: boolean;
  rotation: number | null;
  record_path: string | null;
  window_title: string | null;
}

export interface Profile {
  id: string;
  name: string;
  device_serial: string | null;
  max_fps: number;
  max_size: number;
  bitrate: number;
  enable_audio: boolean;
  always_on_top: boolean;
  show_touches: boolean;
  created_at: string;
}

export type Page = "dashboard" | "profiles" | "settings";
export type Theme = "dark" | "light";

export interface DefaultSettings {
  max_fps: number;
  max_size: number;
  bitrate: number;
  enable_audio: boolean;
  always_on_top: boolean;
  show_touches: boolean;
  fullscreen: boolean;
}
