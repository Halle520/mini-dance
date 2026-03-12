"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_NAME } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to login");
      const isAdmin = trimmed.trim().toLowerCase() === ADMIN_NAME.toLowerCase();
      router.push(isAdmin ? "/admin" : "/grid");
    } catch {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-xl font-semibold text-zinc-800">
          Enter your name
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your name"
            className="rounded-lg border border-zinc-300 px-4 py-3 text-zinc-800 placeholder:text-zinc-400 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
            autoFocus
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-red-700 px-4 py-3 font-medium text-white hover:bg-red-800 disabled:opacity-60"
          >
            {loading ? "…" : "Start"}
          </button>
        </form>
      </div>
    </div>
  );
}
