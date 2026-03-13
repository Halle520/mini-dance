"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { FormationSlot } from "@/components/FormationSlot";
import { GRID_SIZE } from "@/lib/constants";
import type { FormationPosition } from "@/lib/formation";

const BEATS_TOTAL = GRID_SIZE * GRID_SIZE;
const CANVAS_HEIGHT = 500;

type UserGrid = {
  user_name: string;
  updated_at?: string;
  grid: (boolean | number)[][];
  row_notes: string[];
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserGrid[]>([]);
  const [positions, setPositions] = useState<FormationPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [bpm, setBpm] = useState(30);
  const [editFormation, setEditFormation] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [manageUsers, setManageUsers] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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
          formRes.ok ? formRes.json() : Promise.resolve({ positions: [] }),
        ]);
      })
      .then(([gridData, formData]) => {
        setUsers(gridData);
        const p =
          formData &&
          typeof formData === "object" &&
          "positions" in formData &&
          Array.isArray(formData.positions)
            ? (formData.positions as FormationPosition[])
            : [];
        setPositions(p);
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

  const saveFormation = (newPositions: FormationPosition[]) => {
    setPositions(newPositions);
    fetch("/api/admin/formation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positions: newPositions }),
    });
  };

  const removeFromFormation = (idx: number) => {
    saveFormation(positions.filter((_, i) => i !== idx));
  };

  const updatePosition = (idx: number, x: number, y: number) => {
    const next = positions.map((p, i) =>
      i === idx ? { ...p, x: clamp(x), y: clamp(y) } : p,
    );
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

  const toggleBeat = useCallback(
    (userName: string) => {
      const row = Math.floor(currentBeat / GRID_SIZE);
      const col = currentBeat % GRID_SIZE;
      setUsers((prev) =>
        prev.map((u) => {
          if (u.user_name !== userName) return u;
          const newGrid = u.grid.map((r, ri) => {
            if (ri !== row) return [...r];
            return r.map((c, ci) => {
              if (ci !== col) return c;
              const cur =
                c === true ? 4 : c === false ? 0 : typeof c === "number" ? c : 0;
              // Cycle: 0 → 4 → 3 → 2 → 1 → 0
              return cur === 0 ? 4 : cur - 1;
            });
          });
          fetch(`/api/grids/${encodeURIComponent(userName)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grid: newGrid, row_notes: u.row_notes }),
          });
          return { ...u, grid: newGrid };
        }),
      );
    },
    [currentBeat],
  );

  const handleDeleteUser = async (userName: string) => {
    if (!confirm(`Delete ${userName}?`)) return;
    const res = await fetch(`/api/grids/${encodeURIComponent(userName)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Failed to delete");
      return;
    }
    saveFormation(positions.filter((p) => p.name !== userName));
    refetch();
  };

  const getCanvasXY = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
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

  const inFormation = positions.map((p) => p.name);
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
              Drag members to any position on the stage
            </h2>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Canvas */}
              <div
                ref={canvasRef}
                className="relative w-full lg:flex-1 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/50"
                style={{ minHeight: CANVAS_HEIGHT }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const pos = getCanvasXY(e.clientX, e.clientY);
                  if (!pos) return;
                  const name = e.dataTransfer.getData("user");
                  const fromIdxRaw = e.dataTransfer.getData("formIdx");
                  if (fromIdxRaw !== "") {
                    // Moving existing member
                    const idx = parseInt(fromIdxRaw, 10);
                    updatePosition(idx, pos.x, pos.y);
                  } else if (name) {
                    // Adding new member from available panel
                    if (positions.some((p) => p.name === name)) return;
                    saveFormation([...positions, { name, x: pos.x, y: pos.y }]);
                  }
                }}
              >
                {/* Grid lines for visual reference */}
                <div className="pointer-events-none absolute inset-0 opacity-20">
                  {[25, 50, 75].map((pct) => (
                    <div
                      key={`h-${pct}`}
                      className="absolute left-0 right-0 border-t border-zinc-400"
                      style={{ top: `${pct}%` }}
                    />
                  ))}
                  {[25, 50, 75].map((pct) => (
                    <div
                      key={`v-${pct}`}
                      className="absolute top-0 bottom-0 border-l border-zinc-400"
                      style={{ left: `${pct}%` }}
                    />
                  ))}
                </div>
                <span className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-zinc-400">
                  Sân khấu
                </span>

                {positions.map((p, idx) => (
                  <div
                    key={p.name}
                    draggable
                    onDragStart={(e) => {
                      setDraggingIdx(idx);
                      e.dataTransfer.setData("user", p.name);
                      e.dataTransfer.setData("formIdx", String(idx));
                      e.dataTransfer.effectAllowed = "all";
                    }}
                    onDragEnd={() => setDraggingIdx(null)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      // Let parent canvas handle the drop
                      e.preventDefault();
                      const pos = getCanvasXY(e.clientX, e.clientY);
                      if (!pos) return;
                      const name = e.dataTransfer.getData("user");
                      const fromIdxRaw = e.dataTransfer.getData("formIdx");
                      if (fromIdxRaw !== "") {
                        const fromIdx = parseInt(fromIdxRaw, 10);
                        updatePosition(fromIdx, pos.x, pos.y);
                      } else if (name) {
                        if (positions.some((pp) => pp.name === name)) return;
                        saveFormation([...positions, { name, x: pos.x, y: pos.y }]);
                      }
                    }}
                    className={`absolute flex cursor-grab items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-sm font-medium shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
                      draggingIdx === idx
                        ? "border-red-400 opacity-50"
                        : "border-zinc-200"
                    }`}
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <span className="text-zinc-800">{p.name}</span>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        removeFromFormation(idx);
                      }}
                      className="ml-0.5 text-zinc-400 hover:text-red-600"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {positions.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
                    Drop members here
                  </div>
                )}
              </div>

              {/* Available panel */}
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
                        e.dataTransfer.setData("formIdx", "");
                        e.dataTransfer.effectAllowed = "all";
                      }}
                      className="cursor-grab rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:border-zinc-300 active:cursor-grabbing"
                    >
                      {u.user_name}
                    </div>
                  ))}
                  {available.length === 0 && positions.length > 0 && (
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
          <div className="mb-3 flex items-center justify-center gap-4">
            <button
              onClick={() => {
                setPlaying(false);
                setCurrentBeat((b) => Math.max(0, b - 1));
              }}
              disabled={currentBeat <= 0}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-lg font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
            >
              ‹ Prev
            </button>
            <span className="text-4xl md:text-6xl font-bold tabular-nums text-zinc-800">
              Nhịp {currentBeat + 1} / {BEATS_TOTAL}
            </span>
            <button
              onClick={() => {
                setPlaying(false);
                setCurrentBeat((b) => Math.min(BEATS_TOTAL - 1, b + 1));
              }}
              disabled={currentBeat >= BEATS_TOTAL - 1}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-lg font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
            >
              Next ›
            </button>
          </div>
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

        {/* Free-position formation display */}
        <div
          className="relative w-full rounded-xl bg-white shadow"
          style={{ minHeight: CANVAS_HEIGHT }}
        >
          {positions.length > 0 ? (
            positions.map((p, i) => (
              <div
                key={p.name}
                className="absolute"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: 140,
                }}
              >
                <FormationSlot
                  user={userMap[p.name] ?? null}
                  currentBeat={currentBeat}
                  position={i + 1}
                  onToggleBeat={() => toggleBeat(p.name)}
                />
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center" style={{ minHeight: CANVAS_HEIGHT }}>
              <p className="text-zinc-500">
                Arrange users into formation slots.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function clamp(v: number) {
  return Math.round(Math.max(0, Math.min(100, v)) * 100) / 100;
}
