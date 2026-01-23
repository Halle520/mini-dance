import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { FORMATION_COLS, FORMATION_ROWS } from "@/lib/constants";

type FormationData = { cols: number; rows: number; slots: (string | null)[] };

function parseFormation(raw: unknown): FormationData {
  if (raw && typeof raw === "object" && "cols" in raw && "rows" in raw && "slots" in raw) {
    const { cols, rows, slots } = raw as FormationData;
    const c = Math.max(1, Math.min(20, Number(cols) || FORMATION_COLS));
    const r = Math.max(1, Math.min(20, Number(rows) || FORMATION_ROWS));
    const arr = Array.isArray(slots) ? slots : [];
    const s = Array.from({ length: c * r }, (_, i) =>
      typeof arr[i] === "string" && arr[i] ? arr[i] : null,
    );
    return { cols: c, rows: r, slots: s };
  }
  if (Array.isArray(raw)) {
    const size = FORMATION_COLS * FORMATION_ROWS;
    const s = Array.from({ length: size }, (_, i) =>
      typeof raw[i] === "string" && raw[i] ? raw[i] : null,
    );
    return { cols: FORMATION_COLS, rows: FORMATION_ROWS, slots: s };
  }
  return {
    cols: FORMATION_COLS,
    rows: FORMATION_ROWS,
    slots: Array(FORMATION_COLS * FORMATION_ROWS).fill(null),
  };
}

export async function GET() {
  const name = await getSession();
  if (!name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(name)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const supabase = createServerClient();
  const { data, error } = await supabase.from("formation").select("positions").eq("id", 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(parseFormation(data?.positions ?? []));
}

export async function PUT(req: NextRequest) {
  const name = await getSession();
  if (!name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(name)) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const body = (await req.json()) as FormationData;
  const { cols, rows, slots } = parseFormation(body);
  const supabase = createServerClient();
  const payload = { cols, rows, slots };
  const { error } = await supabase
    .from("formation")
    .upsert({ id: 1, positions: payload }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(payload);
}
