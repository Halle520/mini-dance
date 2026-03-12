"use client";

import { Fragment } from "react";
import { GRID_SIZE } from "@/lib/constants";

type UserGrid = { user_name: string; grid: boolean[][]; row_notes: string[] };

type Props = {
  user: UserGrid;
  currentBeat: number;
};

export function GridPreview({ user, currentBeat }: Props) {
  const grid = Array.isArray(user.grid) ? user.grid : [];
  const notes = Array.isArray(user.row_notes) ? user.row_notes : [];
  const safeGrid = Array.from({ length: GRID_SIZE }, (_, r) =>
    Array.from({ length: GRID_SIZE }, (_, c) => !!grid?.[r]?.[c])
  );
  const safeNotes = Array.from({ length: GRID_SIZE }, (_, i) => notes[i] ?? "");

  return (
    <div className="rounded-xl bg-white p-3 shadow">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-zinc-800">{user.user_name}</span>
        {currentBeat >= 0 && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Beat {currentBeat + 1}
          </span>
        )}
      </div>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: "16px repeat(8, 1fr)",
          gridTemplateRows: "16px repeat(8, 1fr)",
        }}
      >
        <div />
        {Array.from({ length: GRID_SIZE }, (_, i) => (
          <div key={`h-${i}`} className="flex items-center justify-center text-[10px] font-medium text-zinc-500">
            {i + 1}
          </div>
        ))}
        {Array.from({ length: GRID_SIZE }, (_, row) => (
          <Fragment key={row}>
            <div className="flex items-center justify-center text-[10px] font-medium text-zinc-600">
              {row + 1}
            </div>
            {Array.from({ length: GRID_SIZE }, (_, col) => (
              <div
                key={`${row}-${col}`}
                className={`flex aspect-square items-center justify-center rounded transition-colors ${
                  currentBeat === row ? "bg-amber-100 ring-1 ring-amber-400" : "bg-zinc-50"
                }`}
              >
                <span
                  className={`h-2/3 w-2/3 rounded-full ${
                    safeGrid[row][col] ? "bg-red-700" : "border border-zinc-300 bg-transparent"
                  }`}
                />
              </div>
            ))}
          </Fragment>
        ))}
      </div>
      <div className="mt-2 border-t border-zinc-100 pt-2">
        {currentBeat >= 0 && safeNotes[currentBeat] && (
          <p className="text-xs text-zinc-600">&quot;{safeNotes[currentBeat]}&quot;</p>
        )}
      </div>
    </div>
  );
}
