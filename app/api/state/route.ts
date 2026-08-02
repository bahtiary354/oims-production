import { getSupabaseAdmin } from "../../../db";

const initialState = {
  dataVersion: 3,
  models: [],
  vendors: [],
  qcLocations: [],
  records: {},
  notes: [],
};

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const { data: row, error } = await db
      .from("app_state")
      .select("payload")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;

    if (!row) {
      const { error: insertError } = await db
        .from("app_state")
        .insert({ id: 1, payload: initialState });
      if (insertError) throw insertError;
      return Response.json(initialState);
    }
    const saved = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    if (saved.dataVersion !== 3) {
      const resetState = {
        ...initialState,
      };
      const { error: updateError } = await db
        .from("app_state")
        .update({ payload: resetState, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (updateError) throw updateError;
      return Response.json(resetState);
    }
    return Response.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database tidak tersedia";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const db = getSupabaseAdmin();
    const { error } = await db.from("app_state").upsert(
      { id: 1, payload, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data gagal disimpan";
    return Response.json({ error: message }, { status: 500 });
  }
}
