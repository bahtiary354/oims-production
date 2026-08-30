/**
 * Pure helpers for the independent Sablon/Bordir receiving flow.
 * Keeping this logic outside the UI makes the validation testable and ensures
 * every save calculates Selesai, Sisa, and status in exactly one way.
 */
export function getDecorationReceiptState(row) {
  const total = Number.isFinite(row?.total) ? Math.max(0, row.total) : 0;
  const completed = Math.min(
    total,
    Math.max(0, Number.isFinite(row?.decorationCompleted) ? row.decorationCompleted : 0),
  );

  return { total, completed, remaining: total - completed };
}

export function validateDecorationReceiptInput(input, remaining) {
  const value = String(input ?? "").trim();
  if (!value) return { ok: false, message: "Masukkan jumlah penerimaan." };
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: "Jumlah penerimaan harus berupa angka bulat." };
  }

  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return { ok: false, message: "Jumlah penerimaan harus lebih dari 0." };
  }
  if (quantity > remaining) {
    return {
      ok: false,
      message: `Jumlah penerimaan tidak boleh melebihi sisa ${remaining} unit.`,
    };
  }

  return { ok: true, quantity };
}

export function applyDecorationReceipt(row, input) {
  const { total, completed, remaining } = getDecorationReceiptState(row);
  const validation = validateDecorationReceiptInput(input, remaining);
  if (!validation.ok) return validation;

  const decorationCompleted = completed + validation.quantity;
  return {
    ok: true,
    row: {
      ...row,
      decorationCompleted,
      status: decorationCompleted >= total ? "Selesai" : "Selesai sebagian",
    },
    receivedNow: validation.quantity,
    remaining: total - decorationCompleted,
  };
}
