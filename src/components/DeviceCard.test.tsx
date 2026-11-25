import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeviceCard from "./DeviceCard";
import { useAppStore } from "../store";
import {
  connectWireless,
  disconnectDevice,
  enableTcpip,
  startMirror,
  stopMirror,
} from "../lib/tauri";
import type { Device, Profile } from "../types";

vi.mock("../lib/tauri", () => ({
  startMirror: vi.fn(),
  stopMirror: vi.fn(),
  disconnectDevice: vi.fn(),
  enableTcpip: vi.fn(),
  connectWireless: vi.fn(),
}));

const mockStart = vi.mocked(startMirror);
const mockStop = vi.mocked(stopMirror);

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

beforeEach(() => {
  useAppStore.setState({ mirroringSerials: [], profiles: [PROFILE] });
  mockStart.mockResolvedValue(undefined);
  mockStop.mockResolvedValue(undefined);
});

const chooseProfile = async () => {
  fireEvent.click(screen.getByRole("button", { name: /Profils/ }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Jeu/ }));
  });
};

describe("DeviceCard — profils", () => {
  it("A1 : profil choisi pendant un miroir → stopMirror résolu avant startMirror", async () => {
    useAppStore.setState({ mirroringSerials: ["abc"] });
    let resolveStop: () => void = () => {};
    mockStop.mockImplementation(() => new Promise<void>((r) => (resolveStop = r)));
    render(<DeviceCard device={PHONE} onRefresh={() => {}} />);

    await chooseProfile();
    expect(mockStop).toHaveBeenCalledWith("abc");
    expect(mockStart).not.toHaveBeenCalled();

    await act(async () => resolveStop());
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().mirroringSerials).toEqual(["abc"]);
  });
});

describe("DeviceCard — erreurs affichées (B2)", () => {
  it("startMirror rejeté depuis un profil → message sur la carte, pas de miroir", async () => {
    mockStart.mockRejectedValue("scrcpy introuvable");
    render(<DeviceCard device={PHONE} onRefresh={() => {}} />);

    await chooseProfile();

    expect(screen.getByText("scrcpy introuvable")).toBeTruthy();
    expect(useAppStore.getState().mirroringSerials).toEqual([]);
  });

  it("disconnectDevice rejeté → message sur la carte", async () => {
    vi.mocked(disconnectDevice).mockRejectedValue("adb: injoignable");
    const wifi: Device = { ...PHONE, serial: "10.0.0.2:5555", connection_type: "wireless" };
    render(<DeviceCard device={wifi} onRefresh={() => {}} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Déconnecter" }));
    });

    expect(screen.getByText("adb: injoignable")).toBeTruthy();
  });
});

describe("DeviceCard — passage en WiFi (E2)", () => {
  it("après un passage réussi, la note sur le port 5555 est visible", async () => {
    vi.useFakeTimers();
    vi.mocked(enableTcpip).mockResolvedValue(undefined);
    vi.mocked(connectWireless).mockResolvedValue("connected");
    const usb: Device = { ...PHONE, ip_address: "10.0.0.2" };
    render(<DeviceCard device={usb} onRefresh={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Passer en WiFi" }));
    await act(() => vi.advanceTimersByTimeAsync(1500));
    vi.useRealTimers();

    expect(vi.mocked(connectWireless)).toHaveBeenCalledWith("10.0.0.2", 5555);
    expect(
      screen.getByText("Le port 5555 reste ouvert sur le téléphone jusqu'à son redémarrage.")
    ).toBeTruthy();
  });
});
