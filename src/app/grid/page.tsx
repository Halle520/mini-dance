"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FormationSlot } from "@/components/FormationSlot";
import { GRID_SIZE } from "@/lib/constants";
import { useRouter } from "next/navigation";

const BEATS_TOTAL = GRID_SIZE * GRID_SIZE;

type UserGrid = { user_name: string; grid: boolean[][]; row_notes: string[] };
type OverviewData = {
  cols: number;
  rows: number;
  slots: (string | null)[];
  users: Record<string, { grid: boolean[][]; row_notes: string[] }>;
};

export default function GridPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [bpm, setBpm] = useState(90);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advanceBeat = useCallback(() => {
    setCurrentBeat((b) => {
      const next = b + 1;
      if (next >= BEATS_TOTAL) {
        setPlaying(false);
        return BEATS_TOTAL - 1;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth").then((r) => r.json()),
      fetch("/api/formation/overview").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([auth, data]) => {
        const user = auth?.name;
        if (!user) {
          router.replace("/");
          return;
        }
        setCurrentUser(user);
        if (
          data &&
          typeof data === "object" &&
          "cols" in data &&
          "rows" in data &&
          "slots" in data
        ) {
          setOverview(data as OverviewData);
        } else {
          setOverview({ cols: 10, rows: 3, slots: [], users: {} });
        }
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!playing) return;
    const ms = 60000 / bpm / 4;
    intervalRef.current = setInterval(advanceBeat, ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, bpm, advanceBeat]);

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(
      () => (window.location.href = "/"),
    );
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        Loading…
      </div>
    );
  if (!currentUser) return null;
  const { cols, slots, users } = overview ?? {
    cols: 10,
    rows: 3,
    slots: [],
    users: {},
  };
  const norm = (x: string | null) => (x ?? "").trim().toLowerCase();
  const isMe = (name: string | null) => norm(name) === norm(currentUser);
  const mySlotIdx = slots.findIndex((s) => isMe(s));

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-zinc-800">
            Formation overview
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!playing && currentBeat >= BEATS_TOTAL - 1)
                    setCurrentBeat(0);
                  setPlaying((p) => !p);
                }}
                className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => {
                  setPlaying(false);
                  setCurrentBeat(0);
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Reset
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600">BPM</label>
              <input
                type="range"
                min={60}
                max={140}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm font-medium text-zinc-700">{bpm}</span>
            </div>
            <div className="text-sm font-medium text-zinc-600">
              Beat {currentBeat + 1}/{BEATS_TOTAL}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
            >
              Logout
            </button>
          </div>
        </div>
        <p className="mb-4 text-sm text-zinc-600">
          Click your position to edit your beat grid. Play to preview the
          formation.
        </p>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {slots.map((userName, idx) => {
            const userKey = userName ? Object.keys(users).find((k) => norm(k) === norm(userName)) ?? userName : null;
            const ud = userKey ? users[userKey] : null;
            const user: UserGrid | null =
              ud && userName
                ? { user_name: userName, grid: ud.grid, row_notes: ud.row_notes }
                : null;
            return (
              <FormationSlot
                key={idx}
                user={user}
                currentBeat={currentBeat}
                position={idx + 1}
                canEdit={isMe(userName)}
                highlight={isMe(userName)}
              />
            );
          })}
        </div>
        {mySlotIdx < 0 && (
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            You&apos;re not in the formation. Contact the admin to be added.
          </p>
        )}
      </div>
    </div>
  );
}
