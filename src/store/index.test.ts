import { describe, expect, it } from "vitest";
import { useAppStore } from ".";

describe("store", () => {
  it("marque et retire un serial en miroir", () => {
    useAppStore.getState().setMirroring("abc", true);
    expect(useAppStore.getState().mirroringSerials).toEqual(["abc"]);
    useAppStore.getState().setMirroring("abc", false);
    expect(useAppStore.getState().mirroringSerials).toEqual([]);
  });
});
