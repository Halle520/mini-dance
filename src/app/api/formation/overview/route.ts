import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { parseFormation } from "@/lib/formation";

export async function GET() {
  const name = await getSession();
  if (!name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data: formData, error: formErr } = await supabase
    .from("formation")
    .select("positions")
    .eq("id", 1)
    .single();
  if (formErr) return NextResponse.json({ error: formErr.message }, { status: 500 });
  const { positions } = parseFormation(formData?.positions ?? []);
  const names = [...new Set(positions.map((p) => p.name))];
  const users: Record<string, { grid: boolean[][]; row_notes: string[] }> = {};
  if (names.length > 0) {
    const { data: grids } = await supabase
      .from("dance_grids")
      .select("user_name, grid, row_notes")
      .in("user_name", names);
    for (const row of grids ?? []) {
      users[row.user_name] = {
        grid: (Array.isArray(row.grid) ? row.grid : []) as boolean[][],
        row_notes: (Array.isArray(row.row_notes) ? row.row_notes : []) as string[],
      };
    }
  }
  return NextResponse.json({ positions, users });
}
