import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAppStore } from "./store";
import { getProfiles, isMirroring, listDevices } from "./lib/tauri";

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
});
