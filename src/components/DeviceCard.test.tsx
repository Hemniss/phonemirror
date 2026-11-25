import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeviceCard from "./DeviceCard";
import { useAppStore } from "../store";
import { startMirror, stopMirror } from "../lib/tauri";
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
