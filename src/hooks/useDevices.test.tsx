import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDevices } from "./useDevices";
import { useAppStore } from "../store";
import { isMirroring, listDevices } from "../lib/tauri";
import type { Device } from "../types";

vi.mock("../lib/tauri", () => ({
  listDevices: vi.fn(),
  isMirroring: vi.fn(),
}));

const mockList = vi.mocked(listDevices);
const mockIsMirroring = vi.mocked(isMirroring);

const PHONE: Device = {
  serial: "abc",
  model: "Pixel",
  product: "pixel",
  state: "device",
  connection_type: "usb",
  android_version: "14",
  ip_address: null,
};

beforeEach(() => {
  vi.useFakeTimers();
  useAppStore.setState({ devices: [], mirroringSerials: [], globalError: null });
  mockList.mockResolvedValue([]);
  mockIsMirroring.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDevices — boucle de polling (B1)", () => {
  it("démonté pendant un listDevices en cours : plus aucun appel ensuite", async () => {
    let resolveFirst: (d: Device[]) => void = () => {};
    mockList.mockImplementationOnce(
      () => new Promise<Device[]>((r) => (resolveFirst = r))
    );
    const { unmount } = renderHook(() => useDevices());
    expect(mockList).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => resolveFirst([]));
    await act(() => vi.advanceTimersByTimeAsync(10_000));

    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("sous React.StrictMode : une seule boucle", async () => {
    renderHook(() => useDevices(), { wrapper: StrictMode });
    await act(() => vi.advanceTimersByTimeAsync(0));
    const atMount = mockList.mock.calls.length;

    await act(() => vi.advanceTimersByTimeAsync(10_000));

    expect(mockList.mock.calls.length - atMount).toBe(4);
  });
});

describe("useDevices — erreur adb (B3)", () => {
  it("listDevices rejeté : liste vidée, erreur affichée, puis rétablie au poll suivant", async () => {
    useAppStore.setState({ devices: [PHONE] });
    mockList.mockRejectedValueOnce("adb introuvable");
    renderHook(() => useDevices());
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(useAppStore.getState().devices).toEqual([]);
    expect(useAppStore.getState().globalError).toBe("adb introuvable");

    mockList.mockResolvedValue([PHONE]);
    await act(() => vi.advanceTimersByTimeAsync(2500));

    expect(useAppStore.getState().devices).toEqual([PHONE]);
    expect(useAppStore.getState().globalError).toBeNull();
  });

  it("listDevices rejeté : les miroirs en cours sont quand même vérifiés", async () => {
    useAppStore.setState({ mirroringSerials: ["abc"] });
    mockList.mockRejectedValue("adb introuvable");
    mockIsMirroring.mockResolvedValue(false);
    renderHook(() => useDevices());
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(mockIsMirroring).toHaveBeenCalledWith("abc");
    expect(useAppStore.getState().mirroringSerials).toEqual([]);
  });
});
