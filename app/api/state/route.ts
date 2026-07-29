import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { appState } from "../../../db/schema";

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
    const db = getDb();
    const [row] = await db.select().from(appState).where(eq(appState.id, 1)).limit(1);
    if (!row) {
      await db.insert(appState).values({ id: 1, payload: JSON.stringify(initialState) });
      return Response.json(initialState);
    }
    const saved = JSON.parse(row.payload);
    if (saved.dataVersion !== 2) {
      const resetState = {
        dataVersion: 2,
        models: saved.models ?? initialState.models,
        vendors: saved.vendors ?? initialState.vendors,
        qcLocations: saved.qcLocations ?? initialState.qcLocations,
        records: {},
        notes: [],
      };
      await db.update(appState).set({ payload: JSON.stringify(resetState), updatedAt: new Date().toISOString() }).where(eq(appState.id, 1));
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
    const db = getDb();
    await db.insert(appState).values({ id: 1, payload: JSON.stringify(payload) })
      .onConflictDoUpdate({ target: appState.id, set: { payload: JSON.stringify(payload), updatedAt: new Date().toISOString() } });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data gagal disimpan";
    return Response.json({ error: message }, { status: 500 });
  }
}
