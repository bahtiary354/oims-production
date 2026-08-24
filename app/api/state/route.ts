import { getSupabaseAdmin } from "../../../db";

const initialState = {
  dataVersion: 3,
  models: [],
  vendors: [],
  qcLocations: [],
  pics: [],
  records: {},
  notes: [],
  weeklyPayments: [],
};

const isSimulation = process.env.VERCEL_ENV !== "production";
const stateId = isSimulation ? 10 : 1;
const backupId = isSimulation ? 11 : 2;
const stateHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

function simulationStateFromProduction(
  production: Record<string, unknown> | null | undefined,
) {
  const source = production ? normalizeState(production) : initialState;
  return {
    ...source,
    records: {},
    notes: [],
    weeklyPayments: [],
  };
}

function normalizeState(saved: Record<string, unknown>) {
  const rawRecords =
    saved.records && typeof saved.records === "object"
      ? (saved.records as Record<string, Array<Record<string, unknown>>>)
      : {};
  const rows: Array<Record<string, unknown>> = Object.entries(
    rawRecords,
  ).flatMap(([stage, items]) =>
    (Array.isArray(items) ? items : []).map((item) => ({
      ...(item as Record<string, unknown>),
      stage,
    })),
  );
  const byId = new Map(rows.map((row) => [String(row.id ?? ""), row]));
  const resolvePO = (
    row: Record<string, unknown>,
    seen = new Set<string>(),
  ): string | undefined => {
    if (typeof row.poId === "string" && row.poId) return row.poId;
    if (row.stage === "Order Produksi" && typeof row.id === "string")
      return row.id;
    const sourceId = typeof row.sourceId === "string" ? row.sourceId : "";
    if (!sourceId || seen.has(sourceId)) return undefined;
    seen.add(sourceId);
    const parent = byId.get(sourceId);
    return parent ? resolvePO(parent, seen) : undefined;
  };
  const resolveBundle = (
    row: Record<string, unknown>,
    seen = new Set<string>(),
  ): string | undefined => {
    if (typeof row.bundleId === "string" && row.bundleId) return row.bundleId;
    if (row.stage === "Bundle" && typeof row.id === "string") return row.id;
    const sourceId = typeof row.sourceId === "string" ? row.sourceId : "";
    if (!sourceId || seen.has(sourceId)) return undefined;
    seen.add(sourceId);
    const parent = byId.get(sourceId);
    return parent ? resolveBundle(parent, seen) : undefined;
  };
  const records = Object.fromEntries(
    Object.entries(rawRecords).map(([stage, items]) => [
      stage,
      (Array.isArray(items) ? items : []).map((item, index, stageItems) => ({
        ...item,
        poId: resolvePO({ ...item, stage }) ?? item.poId,
        bundleId: resolveBundle({ ...item, stage }) ?? item.bundleId,
        // Records created before the decoration workflow existed must keep
        // following their original Cutting -> Bundle path. Without this
        // explicit marker, editing the master model would retroactively move
        // old transactions into Sablon/Bordir and make their next action
        // unavailable.
        decorationProcess:
          item.decorationProcess === "screenprint" ||
          item.decorationProcess === "embroidery" ||
          item.decorationProcess === "both"
            ? item.decorationProcess
            : "none",
        ...(stage === "Sablon/Bordir"
          ? {
              decorationOrder:
                typeof item.decorationOrder === "number"
                  ? item.decorationOrder
                  : stageItems.slice(0, index).filter((previous) => previous.sourceId === item.sourceId).length + 1,
              decorationRequiredBeforeBundle: item.decorationRequiredBeforeBundle !== false,
              decorationFinalStep:
                typeof item.decorationFinalStep === "boolean"
                  ? item.decorationFinalStep
                  : !stageItems.slice(index + 1).some((next) => next.sourceId === item.sourceId),
            }
          : {}),
      })),
    ]),
  );
  return {
    dataVersion: 3,
    models: Array.isArray(saved.models)
      ? (saved.models as Array<Record<string, unknown>>).map((model) => ({
          ...model,
          decorationProcess:
            model.decorationProcess === "screenprint" ||
            model.decorationProcess === "embroidery" ||
            model.decorationProcess === "both"
              ? model.decorationProcess
              : "both",
        }))
      : [],
    vendors: Array.isArray(saved.vendors)
      ? (saved.vendors as Array<Record<string, unknown>>).map((vendor) => ({
          ...vendor,
          qcMode: "internal",
          qcOfficer: "",
        }))
      : [],
    qcLocations: Array.isArray(saved.qcLocations) ? saved.qcLocations : [],
    pics: Array.isArray(saved.pics) ? saved.pics : [],
    records,
    notes: Array.isArray(saved.notes) ? saved.notes : [],
    weeklyPayments: Array.isArray(saved.weeklyPayments)
      ? saved.weeklyPayments
      : [],
  };
}

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const { data: row, error } = await db
      .from("app_state")
      .select("payload, updated_at")
      .eq("id", stateId)
      .maybeSingle();
    if (error) throw error;

    if (!row) {
      let seed = simulationStateFromProduction(null);
      if (isSimulation) {
        const { data: productionRow, error: productionError } = await db
          .from("app_state")
          .select("payload")
          .eq("id", 1)
          .maybeSingle();
        if (productionError) throw productionError;
        const productionPayload = productionRow?.payload
          ? typeof productionRow.payload === "string"
            ? JSON.parse(productionRow.payload)
            : productionRow.payload
          : null;
        seed = simulationStateFromProduction(productionPayload);
      }
      const insertedAt = new Date().toISOString();
      const { error: insertError } = await db
        .from("app_state")
        .insert({ id: stateId, payload: seed, updated_at: insertedAt });
      if (insertError) throw insertError;
      return Response.json(
        {
          ...seed,
          updatedAt: insertedAt,
          environment: isSimulation ? "simulation" : "production",
        },
        { headers: stateHeaders },
      );
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
    return Response.json(
      {
        ...normalized,
        updatedAt: row.updated_at,
        environment: isSimulation ? "simulation" : "production",
      },
      { headers: stateHeaders },
    );
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
    const clientUpdatedAt =
      typeof incoming.updatedAt === "string" ? incoming.updatedAt : "";
    const db = getSupabaseAdmin();
    const { data: current, error: readError } = await db
      .from("app_state")
      .select("payload, updated_at")
      .eq("id", stateId)
      .maybeSingle();
    if (readError) throw readError;
    if (
      clientUpdatedAt &&
      current?.updated_at &&
      clientUpdatedAt !== current.updated_at
    ) {
      return Response.json(
        {
          error: "Data telah berubah di perangkat atau tab lain.",
          updatedAt: current.updated_at,
        },
        { status: 409 },
      );
    }

    if (current?.payload) {
      const { error: backupError } = await db.from("app_state").upsert(
        {
          id: backupId,
          payload: current.payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (backupError) throw backupError;
    }

    const updatedAt = new Date().toISOString();
    if (current && clientUpdatedAt) {
      const { data: updatedRow, error } = await db
        .from("app_state")
        .update({ payload, updated_at: updatedAt })
        .eq("id", stateId)
        .eq("updated_at", clientUpdatedAt)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updatedRow) {
        return Response.json(
          { error: "Data berubah saat proses penyimpanan." },
          { status: 409 },
        );
      }
    } else {
      const { error } = await db
        .from("app_state")
        .upsert(
          { id: stateId, payload, updated_at: updatedAt },
          { onConflict: "id" },
        );
      if (error) throw error;
    }
    console.log("[api/state] state saved with backup", {
      models: payload.models.length,
      vendors: payload.vendors.length,
      stages: Object.keys(payload.records).length,
      notes: payload.notes.length,
    });
    return Response.json(
      {
        ok: true,
        updatedAt,
        environment: isSimulation ? "simulation" : "production",
      },
      { headers: stateHeaders },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Data gagal disimpan";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  if (!isSimulation) {
    return Response.json(
      { error: "Data produksi tidak dapat dikosongkan melalui endpoint simulasi." },
      { status: 403 },
    );
  }
  try {
    const db = getSupabaseAdmin();
    const { data: productionRow, error: productionError } = await db
      .from("app_state")
      .select("payload")
      .eq("id", 1)
      .maybeSingle();
    if (productionError) throw productionError;
    const productionPayload = productionRow?.payload
      ? typeof productionRow.payload === "string"
        ? JSON.parse(productionRow.payload)
        : productionRow.payload
      : null;
    const payload = simulationStateFromProduction(productionPayload);
    const updatedAt = new Date().toISOString();
    const { error } = await db.from("app_state").upsert(
      { id: stateId, payload, updated_at: updatedAt },
      { onConflict: "id" },
    );
    if (error) throw error;
    return Response.json({
      ...payload,
      updatedAt,
      environment: "simulation",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Simulasi gagal dikosongkan";
    return Response.json({ error: message }, { status: 500 });
  }
}
