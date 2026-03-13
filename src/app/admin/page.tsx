"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { FormationSlot } from "@/components/FormationSlot";
import { FORMATION_COLS, FORMATION_ROWS, GRID_SIZE } from "@/lib/constants";

const BEATS_TOTAL = GRID_SIZE * GRID_SIZE;
const MIN_ROWS = 1;
const MIN_COLS = 1;
const MAX_ROWS = 20;
const MAX_COLS = 20;

const defaultSlots = (cols: number, rows: number) =>
  Array(cols * rows).fill(null) as (string | null)[];

type UserGrid = {
  user_name: string;
  updated_at?: string;
  grid: boolean[][];
  row_notes: string[];
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserGrid[]>([]);
  const [formationCols, setFormationCols] = useState(FORMATION_COLS);
  const [formationRows, setFormationRows] = useState(FORMATION_ROWS);
  const [formation, setFormation] = useState<(string | null)[]>(
    defaultSlots(FORMATION_COLS, FORMATION_ROWS),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [bpm, setBpm] = useState(30);
  const [editFormation, setEditFormation] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [manageUsers, setManageUsers] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userMap = Object.fromEntries(users.map((u) => [u.user_name, u]));

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

  const refetch = useCallback((): Promise<void> => {
    return Promise.all([fetch("/api/grids"), fetch("/api/admin/formation")])
      .then(([gridsRes, formRes]) => {
        if (!gridsRes.ok)
          throw new Error(
            gridsRes.status === 401 ? "Please log in" : "Failed to load",
          );
        return Promise.all([
          gridsRes.json(),
          formRes.ok ? formRes.json() : Promise.resolve([]),
        ]);
      })
      .then(([gridData, data]) => {
        setUsers(gridData);
        const d =
          data &&
          typeof data === "object" &&
          "cols" in data &&
          "rows" in data &&
          "slots" in data
            ? (data as { cols: number; rows: number; slots: (string | null)[] })
            : {
                cols: FORMATION_COLS,
                rows: FORMATION_ROWS,
                slots: defaultSlots(FORMATION_COLS, FORMATION_ROWS),
              };
        setFormationCols(Math.max(MIN_COLS, Math.min(MAX_COLS, d.cols)));
        setFormationRows(Math.max(MIN_ROWS, Math.min(MAX_ROWS, d.rows)));
        setFormation(
          Array.isArray(d.slots) ? d.slots : defaultSlots(d.cols, d.rows),
        );
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch()
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  }, [refetch]);

  useEffect(() => {
    if (!playing) return;
    const ms = 60000 / bpm / 4;
    intervalRef.current = setInterval(advanceBeat, ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, bpm, advanceBeat]);

  const formationSize = formationCols * formationRows;

  const saveFormation = (
    slots: (string | null)[],
    cols = formationCols,
    rows = formationRows,
  ) => {
    const size = cols * rows;
    const normalized = Array.from({ length: size }, (_, i) =>
      typeof slots[i] === "string" && slots[i] ? slots[i] : null,
    );
    setFormationCols(cols);
    setFormationRows(rows);
    setFormation(normalized);
    fetch("/api/admin/formation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cols, rows, slots: normalized }),
    });
  };

  const addRow = () => {
    if (formationRows >= MAX_ROWS) return;
    const newSlots = [...formation, ...Array(formationCols).fill(null)];
    saveFormation(newSlots, formationCols, formationRows + 1);
  };

  const removeRow = () => {
    if (formationRows <= MIN_ROWS) return;
    const newSlots = formation.slice(0, -formationCols);
    saveFormation(newSlots, formationCols, formationRows - 1);
  };

  const addCol = () => {
    if (formationCols >= MAX_COLS) return;
    const newSlots: (string | null)[] = [];
    for (let r = 0; r < formationRows; r++) {
      const start = r * formationCols;
      newSlots.push(...formation.slice(start, start + formationCols), null);
    }
    saveFormation(newSlots, formationCols + 1, formationRows);
  };

  const removeCol = () => {
    if (formationCols <= MIN_COLS) return;
    const newSlots: (string | null)[] = [];
    for (let r = 0; r < formationRows; r++) {
      const start = r * formationCols;
      newSlots.push(...formation.slice(start, start + formationCols - 1));
    }
    saveFormation(newSlots, formationCols - 1, formationRows);
  };

  const setSlot = (idx: number, name: string | null) => {
    const next = [...formation];
    next[idx] = name;
    saveFormation(next);
  };

  const swapSlots = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const next = [...formation];
    [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
    saveFormation(next);
  };

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(
      () => (window.location.href = "/"),
    );
  };

  const handleCreateUser = async () => {
    const name = newUserName.trim();
    if (!name) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      alert((await res.json()).error || "Failed to create");
      return;
    }
    setNewUserName("");
    refetch();
  };

  const handleDeleteUser = async (userName: string) => {
    if (!confirm(`Delete ${userName}?`)) return;
    const res = await fetch(`/api/grids/${encodeURIComponent(userName)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Failed to delete");
      return;
    }
    saveFormation(formation.map((n) => (n === userName ? null : n)));
    refetch();
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        Loading…
      </div>
    );
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-100">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="text-red-700 hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  const inFormation = formation.filter((n): n is string => !!n);
  const available = users.filter((u) => !inFormation.includes(u.user_name));

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-zinc-800">
            Formation – Beat overview
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
                min={10}
                max={60}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm font-medium text-zinc-700">{bpm}</span>
            </div>
            <button
              onClick={() => setEditFormation((e) => !e)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              {editFormation ? "Xong" : "Sắp xếp vị trí thành viên"}
            </button>
            <button
              onClick={() => setManageUsers((m) => !m)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              {manageUsers ? "Xong" : "Quản lý thành viên"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
            >
              Logout
            </button>
          </div>
        </div>

        {manageUsers && (
          <div className="mb-6 rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">
              Manage users
            </h2>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="New user name"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
              />
              <button
                onClick={handleCreateUser}
                className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
              >
                Add user
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <div
                  key={u.user_name}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1"
                >
                  <span className="text-sm font-medium text-zinc-800">
                    {u.user_name}
                  </span>
                  <button
                    onClick={() => handleDeleteUser(u.user_name)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              ))}
              {users.length === 0 && (
                <span className="text-sm text-zinc-500">No users</span>
              )}
            </div>
          </div>
        )}

        {editFormation && (
          <div className="mb-6 rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">
              Arrange formation ({formationCols}×{formationRows} grid) – drag
              users into positions
            </h2>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Rows:</span>
              <button
                type="button"
                onClick={addRow}
                disabled={formationRows >= MAX_ROWS}
                className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs disabled:opacity-40"
              >
                + Row
              </button>
              <button
                type="button"
                onClick={removeRow}
                disabled={formationRows <= MIN_ROWS}
                className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs disabled:opacity-40"
              >
                − Row
              </button>
              <span className="ml-2 text-xs text-zinc-500">Cols:</span>
              <button
                type="button"
                onClick={addCol}
                disabled={formationCols >= MAX_COLS}
                className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs disabled:opacity-40"
              >
                + Col
              </button>
              <button
                type="button"
                onClick={removeCol}
                disabled={formationCols <= MIN_COLS}
                className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs disabled:opacity-40"
              >
                − Col
              </button>
            </div>

            <div className="flex flex-wrap gap-6">
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${formationCols}, minmax(80px, 1fr))`,
                }}
              >
                {Array.from(
                  { length: formationCols * formationRows },
                  (_, idx) => (
                    <div
                      key={idx}
                      className="min-h-[44px] rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-2 transition hover:border-red-300 hover:bg-red-50/30"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add(
                          "border-red-400",
                          "bg-red-50/50",
                        );
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove(
                          "border-red-400",
                          "bg-red-50/50",
                        );
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove(
                          "border-red-400",
                          "bg-red-50/50",
                        );
                        const name = e.dataTransfer.getData("user");
                        const fromSlotRaw = e.dataTransfer.getData("slot");
                        if (!name) return;
                        const fromSlot =
                          fromSlotRaw !== "" ? parseInt(fromSlotRaw, 10) : -1;
                        if (fromSlot >= 0) swapSlots(fromSlot, idx);
                        else setSlot(idx, name);
                      }}
                    >
                      {formation[idx] ? (
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("user", formation[idx]!);
                            e.dataTransfer.setData("slot", String(idx));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className="flex cursor-grab items-center justify-between rounded border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-800 active:cursor-grabbing"
                        >
                          <span className="truncate">{formation[idx]}</span>
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSlot(idx, null);
                            }}
                            className="ml-1 text-zinc-400 hover:text-red-600"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">{idx + 1}</span>
                      )}
                    </div>
                  ),
                )}
              </div>
              <div className="min-w-[140px]">
                <p className="mb-2 text-xs font-medium text-zinc-500">
                  Available
                </p>
                <div className="flex flex-wrap gap-2">
                  {available.map((u) => (
                    <div
                      key={u.user_name}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("user", u.user_name);
                        e.dataTransfer.setData("slot", "");
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      className="cursor-grab rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:border-zinc-300 active:cursor-grabbing"
                    >
                      {u.user_name}
                    </div>
                  ))}
                  {available.length === 0 && inFormation.length > 0 && (
                    <span className="text-sm text-zinc-500">
                      All in formation
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mb-4 rounded-xl bg-white p-4 shadow">
          <span className="mb-3 block text-center text-6xl font-bold tabular-nums text-zinc-800">
            Nhịp {currentBeat + 1} / {BEATS_TOTAL}
          </span>
          <input
            type="range"
            min={0}
            max={BEATS_TOTAL - 1}
            value={currentBeat}
            onChange={(e) => {
              setPlaying(false);
              setCurrentBeat(Number(e.target.value));
            }}
            className="w-full"
          />
        </div>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${formationCols}, 1fr)` }}
        >
          {formation.some(Boolean) ? (
            formation.map((userName, i) => (
              <FormationSlot
                key={`${i}-${userName ?? "empty"}`}
                user={userName ? (userMap[userName] ?? null) : null}
                currentBeat={currentBeat}
                position={i + 1}
              />
            ))
          ) : (
            <p className="col-span-full rounded-xl bg-white p-8 text-center text-zinc-500 shadow">
              Arrange users into formation slots.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
