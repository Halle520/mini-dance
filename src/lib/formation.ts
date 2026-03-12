import { FORMATION_COLS, FORMATION_ROWS } from "./constants";

export type FormationData = { cols: number; rows: number; slots: (string | null)[] };

export function parseFormation(raw: unknown): FormationData {
  if (raw && typeof raw === "object" && "cols" in raw && "rows" in raw && "slots" in raw) {
    const { cols, rows, slots } = raw as FormationData;
    const c = Math.max(1, Math.min(20, Number(cols) || FORMATION_COLS));
    const r = Math.max(1, Math.min(20, Number(rows) || FORMATION_ROWS));
    const arr = Array.isArray(slots) ? slots : [];
    const s = Array.from({ length: c * r }, (_, i) =>
      typeof arr[i] === "string" && arr[i] ? arr[i] : null
    );
    return { cols: c, rows: r, slots: s };
  }
  if (Array.isArray(raw)) {
    const size = FORMATION_COLS * FORMATION_ROWS;
    const s = Array.from({ length: size }, (_, i) =>
      typeof raw[i] === "string" && raw[i] ? raw[i] : null
    );
    return { cols: FORMATION_COLS, rows: FORMATION_ROWS, slots: s };
  }
  return {
    cols: FORMATION_COLS,
    rows: FORMATION_ROWS,
    slots: Array(FORMATION_COLS * FORMATION_ROWS).fill(null),
  };
}
