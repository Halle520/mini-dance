"use client";

import Link from "next/link";
import { GRID_SIZE } from "@/lib/constants";

type UserGrid = {
  user_name: string;
  grid: (boolean | number)[][];
  row_notes: string[];
};

type Props = {
  user: UserGrid | null;
  currentBeat: number;
  position: number;
  canEdit?: boolean;
  highlight?: boolean;
  onToggleBeat?: () => void;
};

const SCALE_LEVELS = 5; // 0 = off, 1-4 = sizes

function getCellValue(grid: (boolean | number)[][], beat: number): number {
  const row = Math.floor(beat / GRID_SIZE);
  const col = beat % GRID_SIZE;
  const g = Array.isArray(grid) ? grid : [];
  const v = g?.[row]?.[col];
  if (v === true) return 4;
  if (v === false || v == null) return 0;
  return typeof v === "number" ? Math.max(0, Math.min(4, v)) : 0;
}

// size in px for each level — level 4 is big enough to overlap the name
const sizeMap: Record<number, { size: number; opacity: string; bg: string }> = {
  0: { size: 8, opacity: "opacity-0", bg: "bg-transparent" },
  1: { size: 32, opacity: "opacity-70", bg: "bg-red-400" },
  2: { size: 56, opacity: "opacity-80", bg: "bg-red-500" },
  3: {
    size: 80,
    opacity: "opacity-90",
    bg: "bg-red-600 ring-1 ring-red-800/20",
  },
  4: {
    size: 110,
    opacity: "opacity-100",
    bg: "bg-red-700 ring-2 ring-red-900/30",
  },
};

export { SCALE_LEVELS };

export function FormationSlot({
  user,
  currentBeat,
  position,
  canEdit = true,
  highlight,
  onToggleBeat,
}: Props) {
  const level = user ? getCellValue(user.grid, currentBeat) : 0;
  const row = Math.floor(currentBeat / GRID_SIZE);
  const note = user?.row_notes?.[row];
  const s = sizeMap[level];

  const base =
    "relative flex flex-col items-center justify-center rounded-xl py-6 transition overflow-visible";
  const className = highlight
    ? `${base} bg-red-50 hover:bg-red-100`
    : user
      ? `${base} `
      : `${base} `;

  const content = (
    <>
      <span className="truncate px-2 text-center text-base font-semibold text-zinc-800">
        {user?.user_name ?? "—"}
      </span>
      <button
        type="button"
        onClick={(e) => {
          if (onToggleBeat) {
            e.preventDefault();
            e.stopPropagation();
            onToggleBeat();
          }
        }}
        disabled={!onToggleBeat}
        className={`relative mt-2 ${onToggleBeat ? "cursor-pointer" : ""}`}
        style={{ width: 24, height: 24 }}
      >
        {/* Circle that grows from center, can overflow and overlap name */}
        <span
          className={`absolute rounded-full transition-all duration-300 ease-out ${s.opacity} ${s.bg} ${
            onToggleBeat ? "hover:ring-4 hover:ring-red-200" : ""
          }`}
          style={{
            width: s.size,
            height: s.size,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
        {level === 0 && (
          <span
            className="absolute rounded-full border-2 border-zinc-300"
            style={{
              width: 24,
              height: 24,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </button>
      {user && note && (
        <p className="mt-2 max-w-full truncate px-2 text-center text-xs text-zinc-500">
          &ldquo;{note}&rdquo;
        </p>
      )}
    </>
  );

  if (!user) return <div className={className}>{content}</div>;
  if (canEdit && !onToggleBeat) {
    return (
      <Link
        href={`/grid/${encodeURIComponent(user.user_name)}`}
        className={className}
      >
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
