// Bornes des saisies, reprises de `src-tauri/src/bounds.rs` (qui fait foi :
// le backend refuse de toute façon une valeur hors bornes).

import type { Profile } from "../types";

export type Bounds = { min: number; max: number };

export const PORT: Bounds = { min: 1, max: 65535 };
export const MAX_FPS: Bounds = { min: 15, max: 120 };
export const MAX_SIZE: Bounds = { min: 480, max: 2160 };
export const BITRATE_MBPS: Bounds = { min: 2, max: 32 };
export const VIDEO_BUFFER_MS: Bounds = { min: 0, max: 200 };

/** Entier décimal dans les bornes, sinon null. Refuse "", "12abc", "1.5", "1e3". */
export function parseBoundedInt(raw: string, { min, max }: Bounds): number | null {
  const s = raw.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

export const parsePort = (raw: string) => parseBoundedInt(raw, PORT);

export const PORT_ERROR = `Port invalide : entier entre ${PORT.min} et ${PORT.max}.`;

export const isValidPairCode = (raw: string) => /^\d{6}$/.test(raw.trim());

/** Message d'erreur pour un champ numérique, ou null s'il est valide. */
export function rangeError(value: number, { min, max }: Bounds): string | null {
  return Number.isInteger(value) && value >= min && value <= max
    ? null
    : `Entier entre ${min} et ${max} attendu.`;
}

/** Bornes des champs numériques d'un profil (identiques au backend). */
export const PROFILE_BOUNDS = {
  max_fps: MAX_FPS,
  max_size: MAX_SIZE,
  bitrate: BITRATE_MBPS,
  video_buffer: VIDEO_BUFFER_MS,
} as const;

export function profileIsValid(p: Profile): boolean {
  return (Object.keys(PROFILE_BOUNDS) as (keyof typeof PROFILE_BOUNDS)[]).every(
    (k) => rangeError(p[k], PROFILE_BOUNDS[k]) === null
  );
}
