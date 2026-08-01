import { getSupabaseAdmin } from "../../../db";

const initialState = {
  dataVersion: 2,
  models: [{
    code: "SNV",
    name: "Supernova",
    colors: ["Hitam", "Navy"],
    sizes: ["M", "L", "XL", "XXL", "XXXL"],
    active: true,
  }],
  vendors: [{ code: "VDR-001", name: "Cipedes", contact: "", phone: "", address: "", active: true }],
  qcLocations: [
    { code: "QCL-001", location: "Internal", recipient: "Ibu-ibu Internal", phone: "", address: "", active: true },
    { code: "QCL-002", location: "Tasik", recipient: "Ibu-ibu Tasik", phone: "", address: "", active: true },
  ],
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
    if (saved.dataVersion !== 2) {
      const resetState = {
        dataVersion: 2,
        models: saved.models ?? initialState.models,
        vendors: saved.vendors ?? initialState.vendors,
        qcLocations: saved.qcLocations ?? initialState.qcLocations,
        records: {},
        notes: [],
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
