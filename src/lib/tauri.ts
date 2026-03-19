import { invoke } from "@tauri-apps/api/core";
import type { Device, MirrorConfig, Profile } from "../types";

// ─── ADB ───────────────────────────────────────────────────────────────────

export const listDevices = (): Promise<Device[]> => invoke("list_devices");

export const connectWireless = (ip: string, port: number): Promise<string> =>
  invoke("connect_wireless", { ip, port });

export const disconnectDevice = (serial: string): Promise<void> =>
  invoke("disconnect_device", { serial });

export const enableTcpip = (serial: string, port: number): Promise<void> =>
  invoke("enable_tcpip", { serial, port });

export const pairDevice = (
  ip: string,
  port: number,
  code: string
): Promise<void> => invoke("pair_device", { ip, port, code });

export const getDeviceIpAddress = (serial: string): Promise<string> =>
  invoke("get_device_ip_address", { serial });

// ─── scrcpy / Mirror ───────────────────────────────────────────────────────

export const startMirror = (config: MirrorConfig): Promise<void> =>
  invoke("start_mirror", { config });

export const stopMirror = (serial: string): Promise<void> =>
  invoke("stop_mirror", { serial });

export const isMirroring = (serial: string): Promise<boolean> =>
  invoke("is_mirroring", { serial });

export const pushFile = (
  serial: string,
  localPath: string,
  remotePath: string
): Promise<void> =>
  invoke("push_file", { serial, localPath, remotePath });

export const pullFile = (
  serial: string,
  remotePath: string,
  localPath: string
): Promise<void> =>
  invoke("pull_file", { serial, remotePath, localPath });

// ─── Profils ───────────────────────────────────────────────────────────────

export const getProfiles = (): Promise<Profile[]> => invoke("get_profiles");

export const saveProfile = (profile: Profile): Promise<void> =>
  invoke("save_profile", { profile });

export const deleteProfile = (id: string): Promise<void> =>
  invoke("delete_profile", { id });
