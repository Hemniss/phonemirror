import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAppStore } from "./store";
import { getProfiles, isMirroring, listDevices } from "./lib/tauri";
import type { Device, Profile } from "./types";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    startResizeDragging: vi.fn(),
    startDragging: vi.fn(),
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock("./lib/tauri", () => ({
  listDevices: vi.fn(),
  isMirroring: vi.fn(),
  getProfiles: vi.fn(),
  startMirror: vi.fn(),
  stopMirror: vi.fn(),
  disconnectDevice: vi.fn(),
  enableTcpip: vi.fn(),
  connectWireless: vi.fn(),
}));

const mockList = vi.mocked(listDevices);
const mockProfiles = vi.mocked(getProfiles);

const PHONE: Device = {
  serial: "abc",
  model: "Pixel",
  product: "pixel",
  state: "device",
  connection_type: "usb",
  android_version: "14",
  ip_address: null,
};

const PROFILE: Profile = {
  id: "p1",
  name: "Jeu",
  device_serial: null,
  max_fps: 60,
  max_size: 1080,
  bitrate: 8,
  video_buffer: 0,
  enable_audio: true,
  always_on_top: false,
  show_touches: false,
  created_at: "2026-11-25",
};

// Carte de l'appareil de test (la barre latérale a aussi un bouton « Profils »).
const card = () =>
  within(screen.getByRole("heading", { name: "Pixel" }).closest(".og-card") as HTMLElement);

beforeEach(() => {
  vi.useFakeTimers();
  useAppStore.setState({
    currentPage: "dashboard",
    devices: [],
    mirroringSerials: [],
    profiles: [],
    globalError: null,
  });
  mockList.mockResolvedValue([]);
  vi.mocked(isMirroring).mockResolvedValue(true);
  mockProfiles.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("App", () => {
  it("B1 : un seul listDevices par tranche de 2,5 s sur le tableau de bord", async () => {
    render(<App />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mockList).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(10_000));

    expect(mockList).toHaveBeenCalledTimes(5);
  });

  it("D1 : le bouton Profils est sur la carte sans visiter la page Profils", async () => {
    mockList.mockResolvedValue([PHONE]);
    mockProfiles.mockResolvedValue([PROFILE]);
    render(<App />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(card().getByRole("button", { name: /Profils/ })).toBeTruthy();
  });

  it("D1 : un échec de getProfiles ne casse pas le tableau de bord", async () => {
    mockList.mockResolvedValue([PHONE]);
    mockProfiles.mockRejectedValue("profils illisibles");
    render(<App />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(card().getByRole("button", { name: "Miroir" })).toBeTruthy();
    expect(card().queryByRole("button", { name: /Profils/ })).toBeNull();
  });
});
