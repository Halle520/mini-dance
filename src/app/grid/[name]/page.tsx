"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { GridEditor } from "@/components/GridEditor";
import { GRID_SIZE } from "@/lib/constants";

type GridState = boolean[][];

function createEmptyGrid(): GridState {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(false));
}

export default function GridNamePage() {
  const router = useRouter();
  const params = useParams();
  const targetName = decodeURIComponent((params?.name as string) ?? "");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [grid, setGrid] = useState<GridState>(createEmptyGrid);
  const [rowNotes, setRowNotes] = useState<string[]>(() => Array(GRID_SIZE).fill(""));
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (g: GridState, notes: string[]) => {
      if (!targetName) return;
      fetch(`/api/grids/${encodeURIComponent(targetName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid: g, row_notes: notes }),
      });
    },
    [targetName]
  );

  useEffect(() => {
    if (!targetName) return;
    Promise.all([
      fetch("/api/auth").then((r) => r.json()),
      fetch(`/api/grids/${encodeURIComponent(targetName)}`).then((r) => (r.ok ? r.json() : r.status === 404 ? null : Promise.reject(new Error("Forbidden")))),
    ])
      .then(([auth, data]) => {
        const user = auth?.name;
        if (!user) {
          router.replace("/");
          return;
        }
        setCurrentUser(user);
        if (data?.grid) setGrid(Array.isArray(data.grid) ? data.grid : createEmptyGrid());
        if (Array.isArray(data?.row_notes)) {
          const notes = [...data.row_notes];
          while (notes.length < GRID_SIZE) notes.push("");
          setRowNotes(notes.slice(0, GRID_SIZE));
        }
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [targetName, router]);

  useEffect(() => {
    if (!targetName) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    const id = setTimeout(() => save(grid, rowNotes), 500);
    setSaveTimeout(id);
    return () => clearTimeout(id);
  }, [grid, rowNotes, targetName, save]);

  const handleToggle = (row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = !next[row][col];
      return next;
    });
  };

  const handleNoteChange = (row: number, value: string) => {
    setRowNotes((prev) => {
      const next = [...prev];
      next[row] = value;
      return next;
    });
  };

  const handleExport = () => {
    if (isExporting || !targetName) return;
    setIsExporting(true);
    try {
      const scale = 2;
      const cellSize = 40;
      const pad = 24;
      const labelSize = 28;
      const noteWidth = 140;
      const w = labelSize + GRID_SIZE * cellSize + noteWidth + pad * 2;
      const h = 60 + labelSize + GRID_SIZE * cellSize + pad * 2;
      const canvas = document.createElement("canvas");
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#27272a";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${targetName}'s Dance Grid`, w / 2, 42);
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const ox = pad + labelSize;
      const oy = 60 + pad + labelSize;
      for (let i = 0; i < GRID_SIZE; i++) {
        ctx.fillStyle = "#71717a";
        ctx.fillText(String(i + 1), ox - labelSize / 2, oy + i * cellSize + cellSize / 2);
        ctx.fillText(String(i + 1), ox + i * cellSize + cellSize / 2, oy - labelSize / 2);
      }
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const x = ox + col * cellSize;
          const y = oy + row * cellSize;
          ctx.fillStyle = "#fafafa";
          ctx.strokeStyle = "#e4e4e7";
          ctx.lineWidth = 1;
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.strokeRect(x, y, cellSize, cellSize);
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;
          const r = cellSize * 0.35;
          if (grid[row][col]) {
            ctx.fillStyle = "#b91c1c";
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = "#d4d4d8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "#71717a";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Note", ox + GRID_SIZE * cellSize + noteWidth / 2, oy - labelSize / 2);
      ctx.textAlign = "left";
      ctx.fillStyle = "#27272a";
      ctx.font = "11px system-ui, sans-serif";
      for (let row = 0; row < GRID_SIZE; row++) {
        const text = (rowNotes[row] || "").trim();
        if (text) {
          const y = oy + row * cellSize + cellSize / 2;
          ctx.fillText(text.length > 25 ? text.slice(0, 25) + "…" : text, ox + GRID_SIZE * cellSize + 8, y, noteWidth - 16);
        }
      }
      const link = document.createElement("a");
      link.download = `${targetName.replace(/\s+/g, "-")}-dance-grid.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
      alert("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => (window.location.href = "/"));
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-zinc-100">Loading…</div>;
  if (!currentUser) return null;

  const isAdmin = currentUser.trim().toLowerCase() === "win";

  return (
    <GridEditor
      name={targetName}
      grid={grid}
      rowNotes={rowNotes}
      onToggle={handleToggle}
      onNoteChange={handleNoteChange}
      onExport={handleExport}
      onLogout={handleLogout}
      isExporting={isExporting}
      backHref={isAdmin ? "/admin" : "/grid"}
      backLabel={isAdmin ? "← All users" : "← Formation"}
    />
  );
}
