"use client";

import Link from "next/link";
import { GRID_SIZE } from "@/lib/constants";

type UserGrid = { user_name: string; grid: boolean[][]; row_notes: string[] };

type Props = {
  user: UserGrid | null;
  currentBeat: number;
  position: number;
  canEdit?: boolean;
  highlight?: boolean;
};

function getCellAtBeat(grid: boolean[][], beat: number): boolean {
  const row = Math.floor(beat / GRID_SIZE);
  const col = beat % GRID_SIZE;
  const g = Array.isArray(grid) ? grid : [];
  return !!g?.[row]?.[col];
}

export function FormationSlot({ user, currentBeat, position, canEdit = true, highlight }: Props) {
  const isOn = user ? getCellAtBeat(user.grid, currentBeat) : false;
  const row = Math.floor(currentBeat / GRID_SIZE);
  const note = user?.row_notes?.[row];

  const base = "flex flex-col items-center justify-center rounded-xl border-2 py-6 shadow transition";
  const className = highlight
    ? `${base} border-red-500 bg-red-50 hover:border-red-600 hover:bg-red-100`
    : user
      ? `${base} border-dashed border-zinc-200 bg-white hover:border-red-300 hover:shadow-md`
      : `${base} border-dashed border-zinc-100 bg-zinc-50`;

  const content = (
    <>
      <span className="mb-2 text-sm font-medium text-zinc-600">Pos {position}</span>
      <span className="mb-3 truncate px-2 text-center text-base font-semibold text-zinc-800">
        {user?.user_name ?? "—"}
      </span>
      <span
        className={`h-10 w-10 rounded-full transition ${
          isOn ? "bg-red-700 ring-2 ring-red-900/30" : "border-2 border-zinc-300 bg-transparent"
        }`}
      />
      {user && note && (
        <p className="mt-2 max-w-full truncate px-2 text-center text-xs text-zinc-500">&ldquo;{note}&rdquo;</p>
      )}
    </>
  );

  if (!user) return <div className={className}>{content}</div>;
  if (canEdit) {
    return (
      <Link href={`/grid/${encodeURIComponent(user.user_name)}`} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
