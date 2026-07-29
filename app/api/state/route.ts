import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { appState } from "../../../db/schema";

const initialState = {
  models: [{
    code: "SNV",
    name: "Supernova",
    colors: ["Hitam", "Navy"],
    sizes: ["M", "L", "XL", "XXL", "XXXL"],
    active: true,
  }],
  vendors: [{ code: "VDR-001", name: "Cipedes", contact: "", phone: "", address: "", active: true }],
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
    return Response.json(JSON.parse(row.payload));
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
