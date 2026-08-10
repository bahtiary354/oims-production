import { getSupabaseAdmin } from "../../../db";

const initialState = {
  dataVersion: 3,
  models: [],
  vendors: [],
  qcLocations: [],
  pics: [],
  records: {},
  notes: [],
};

function normalizeState(saved: Record<string, unknown>) {
  return {
    dataVersion: 3,
    models: Array.isArray(saved.models) ? saved.models : [],
    vendors: Array.isArray(saved.vendors) ? saved.vendors : [],
    qcLocations: Array.isArray(saved.qcLocations) ? saved.qcLocations : [],
    pics: Array.isArray(saved.pics) ? saved.pics : [],
    records:
      saved.records && typeof saved.records === "object" ? saved.records : {},
    notes: Array.isArray(saved.notes) ? saved.notes : [],
  };
}

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
    const saved =
      typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    const normalized = normalizeState(saved ?? {});
    console.log("[api/state] state loaded", {
      models: normalized.models.length,
      vendors: normalized.vendors.length,
      stages: Object.keys(normalized.records).length,
      notes: normalized.notes.length,
    });
    return Response.json(normalized);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database tidak tersedia";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const incoming = await request.json();
    if (!incoming || typeof incoming !== "object") {
      return Response.json(
        { error: "Format data tidak valid" },
        { status: 400 },
      );
    }
    const payload = normalizeState(incoming);
    const db = getSupabaseAdmin();
    const { data: current, error: readError } = await db
      .from("app_state")
      .select("payload")
      .eq("id", 1)
      .maybeSingle();
    if (readError) throw readError;

    if (current?.payload) {
      const { error: backupError } = await db
        .from("app_state")
        .upsert(
          {
            id: 2,
            payload: current.payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      if (backupError) throw backupError;
    }

    const { error } = await db
      .from("app_state")
      .upsert(
        { id: 1, payload, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) throw error;
    console.log("[api/state] state saved with backup", {
      models: payload.models.length,
      vendors: payload.vendors.length,
      stages: Object.keys(payload.records).length,
      notes: payload.notes.length,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Data gagal disimpan";
    return Response.json({ error: message }, { status: 500 });
  }
}
