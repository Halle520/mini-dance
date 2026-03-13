import { FORMATION_COLS, FORMATION_ROWS } from "./constants";

export type FormationPosition = { name: string; x: number; y: number };

/** New format: array of {name, x, y} with x/y as percentages 0–100 */
export type FormationData = { positions: FormationPosition[] };

/** Legacy grid format */
type LegacyFormation = { cols: number; rows: number; slots: (string | null)[] };

function isLegacy(raw: unknown): raw is LegacyFormation {
  return (
    !!raw &&
    typeof raw === "object" &&
    "cols" in raw &&
    "rows" in raw &&
    "slots" in raw
  );
}

function isNewFormat(raw: unknown): raw is FormationData {
  return (
    !!raw &&
    typeof raw === "object" &&
    "positions" in raw &&
    Array.isArray((raw as FormationData).positions)
  );
}

/** Convert legacy grid → free positions (evenly spaced) */
function legacyToPositions(legacy: LegacyFormation): FormationPosition[] {
  const { cols, rows, slots } = legacy;
  const positions: FormationPosition[] = [];
  for (let i = 0; i < slots.length; i++) {
    const name = slots[i];
    if (!name) continue;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = cols <= 1 ? 50 : (col / (cols - 1)) * 100;
    const y = rows <= 1 ? 50 : (row / (rows - 1)) * 100;
    positions.push({ name, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  }
  return positions;
}

/** Parse any stored value into positions array */
export function parseFormation(raw: unknown): FormationData {
  if (isNewFormat(raw)) {
    return {
      positions: raw.positions
        .filter((p) => p && typeof p.name === "string" && p.name)
        .map((p) => ({
          name: p.name,
          x: Math.max(0, Math.min(100, Number(p.x) || 50)),
          y: Math.max(0, Math.min(100, Number(p.y) || 50)),
        })),
    };
  }
  if (isLegacy(raw)) {
    return { positions: legacyToPositions(raw) };
  }
  if (Array.isArray(raw)) {
    // Old array-only format
    const slots = raw as (string | null)[];
    return {
      positions: legacyToPositions({
        cols: FORMATION_COLS,
        rows: FORMATION_ROWS,
        slots,
      }),
    };
  }
  return { positions: [] };
}
