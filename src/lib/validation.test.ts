import type { Profile } from "../types";
import { describe, expect, it } from "vitest";
import {
  BITRATE_MBPS,
  isValidPairCode,
  parseBoundedInt,
  parsePort,
  profileIsValid,
  rangeError,
} from "./validation";

describe("parsePort", () => {
  it("accepte 1-65535", () => {
    expect(parsePort("1")).toBe(1);
    expect(parsePort(" 5555 ")).toBe(5555);
    expect(parsePort("65535")).toBe(65535);
  });

  it("refuse hors bornes et non entier", () => {
    for (const bad of ["", "0", "65536", "-1", "12abc", "1.5", "1e3", "abc"]) {
      expect(parsePort(bad), bad).toBeNull();
    }
  });
});

describe("parseBoundedInt", () => {
  it("borne inclusive", () => {
    expect(parseBoundedInt("2", BITRATE_MBPS)).toBe(2);
    expect(parseBoundedInt("32", BITRATE_MBPS)).toBe(32);
    expect(parseBoundedInt("33", BITRATE_MBPS)).toBeNull();
  });
});

describe("isValidPairCode", () => {
  it("exige 6 chiffres", () => {
    expect(isValidPairCode("123456")).toBe(true);
    expect(isValidPairCode("12345")).toBe(false);
    expect(isValidPairCode("12345a")).toBe(false);
    expect(isValidPairCode("-12345")).toBe(false);
  });
});

describe("rangeError", () => {
  it("null si valide, message sinon", () => {
    expect(rangeError(8, BITRATE_MBPS)).toBeNull();
    expect(rangeError(64, BITRATE_MBPS)).toMatch(/2 et 32/);
    expect(rangeError(1, BITRATE_MBPS)).not.toBeNull();
    expect(rangeError(NaN, BITRATE_MBPS)).not.toBeNull();
    expect(rangeError(8.5, BITRATE_MBPS)).not.toBeNull();
  });
});

describe("profileIsValid", () => {
  const ok: Profile = {
    id: "a",
    name: "Jeu",
    device_serial: null,
    max_fps: 60,
    max_size: 1080,
    bitrate: 8,
    video_buffer: 0,
    enable_audio: true,
    always_on_top: false,
    show_touches: false,
    created_at: "2026-11-25T10:00:00Z",
  };

  it("accepte un profil dans les bornes", () => {
    expect(profileIsValid(ok)).toBe(true);
  });

  it("refuse un champ hors bornes ou vidé", () => {
    expect(profileIsValid({ ...ok, bitrate: 64 })).toBe(false);
    expect(profileIsValid({ ...ok, max_fps: 0 })).toBe(false);
    expect(profileIsValid({ ...ok, max_size: NaN })).toBe(false);
    expect(profileIsValid({ ...ok, video_buffer: 201 })).toBe(false);
  });
});
