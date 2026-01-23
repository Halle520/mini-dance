"use client";

import { Fragment } from "react";
import { GRID_SIZE } from "@/lib/constants";

export type GridState = boolean[][];

type GridEditorProps = {
  name: string;
  grid: GridState;
  rowNotes: string[];
  onToggle: (row: number, col: number) => void;
  onNoteChange: (row: number, value: string) => void;
  onExport: () => void;
  onLogout: () => void;
  isExporting: boolean;
  backHref?: string;
  backLabel?: string;
};

export function GridEditor({
  name,
  grid,
  rowNotes,
  onToggle,
  onNoteChange,
  onExport,
  onLogout,
  isExporting,
  backHref,
  backLabel,
}: GridEditorProps) {
  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {backHref && backLabel && (
              <a
                href={backHref}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
              >
                {backLabel}
              </a>
            )}
            <button
              onClick={onExport}
              disabled={isExporting}
              className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:opacity-60"
            >
              {isExporting ? "Exporting…" : "Export as image"}
            </button>
            <button
              onClick={onLogout}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-800"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="overflow-auto rounded-xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-center text-lg font-semibold text-zinc-800">Lịch bung dù của {name}</h2>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "28px repeat(8, minmax(36px, 1fr)) minmax(120px, 1fr)",
              gridTemplateRows: "28px repeat(8, minmax(36px, 1fr))",
            }}
          >
            <div />
            {Array.from({ length: GRID_SIZE }, (_, i) => (
              <div key={`h-${i}`} className="flex items-center justify-center text-xl font-bold text-zinc-500">
                {i + 1}
              </div>
            ))}
            <div className="flex items-center justify-center text-sm font-medium text-zinc-500">Note</div>
            {Array.from({ length: GRID_SIZE }, (_, row) => (
              <Fragment key={row}>
                <div
                  key={`v-${row}`}
                  className="flex items-center justify-center text-xl font-bold text-zinc-600"
                >
                  {row + 1}
                </div>
                {Array.from({ length: GRID_SIZE }, (_, col) => (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    onClick={() => onToggle(row, col)}
                    className="flex aspect-square min-w-[36px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
                    aria-label={`Beat ${row + 1}-${col + 1} ${grid[row][col] ? "on" : "off"}`}
                  >
                    <span
                      className={`h-3/4 w-3/4 rounded-full transition-all ${
                        grid[row][col]
                          ? "bg-red-700 ring-2 ring-red-900/30"
                          : "border-2 border-zinc-300 bg-transparent"
                      }`}
                    />
                  </button>
                ))}
                <input
                  type="text"
                  value={rowNotes[row]}
                  onChange={(e) => onNoteChange(row, e.target.value)}
                  placeholder={`Row ${row + 1}`}
                  className="w-full min-w-0 rounded border border-zinc-200 px-2 py-1 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
                />
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
