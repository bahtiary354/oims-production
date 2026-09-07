"use client";

import { useEffect, useRef, useState } from "react";

type PersistentData = { updatedAt?: string; environment?: string };

type PersistentAppDataOptions<T extends PersistentData> = {
  initialState: T;
  normalize: (state: Partial<T>) => T;
  mergeConflict: (base: T, intended: T, latest: T) => T;
  onMessage: (message: string) => void;
};

export function usePersistentAppData<T extends PersistentData>({
  initialState,
  normalize,
  mergeConflict,
  onMessage,
}: PersistentAppDataOptions<T>) {
  const [data, setData] = useState<T>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const updatedAtRef = useRef<string | undefined>(initialState.updatedAt);
  const saveInFlightRef = useRef(false);
  const initialStateRef = useRef(initialState);
  const normalizeRef = useRef(normalize);
  const mergeConflictRef = useRef(mergeConflict);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((state: Partial<T>) => {
        setIsSimulation(state.environment === "simulation");
        updatedAtRef.current = state.updatedAt;
        setData(normalizeRef.current(state));
      })
      .catch(() => setData(initialStateRef.current))
      .finally(() => setLoaded(true));
  }, []);

  async function persist(next: T) {
    if (saveInFlightRef.current) {
      onMessageRef.current("Penyimpanan sedang berlangsung. Mohon tunggu sebentar.");
      return;
    }

    saveInFlightRef.current = true;
    const previous = data;
    const pending = { ...next, updatedAt: updatedAtRef.current ?? next.updatedAt };
    setData(pending);
    setSaving(true);

    try {
      const send = (payload: T) =>
        fetch("/api/state", {
          method: "PUT",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

      let savedState = pending;
      let response = await send(savedState);
      if (response.status === 409) {
        const latestResponse = await fetch("/api/state", { cache: "no-store" });
        if (!latestResponse.ok) throw new Error("DATA_CONFLICT");
        const latest = normalizeRef.current(await latestResponse.json());
        savedState = {
          ...mergeConflictRef.current(previous, pending, latest),
          updatedAt: latest.updatedAt,
        };
        updatedAtRef.current = latest.updatedAt;
        setData(savedState);
        response = await send(savedState);
        if (response.status === 409) throw new Error("DATA_CONFLICT");
      }
      if (!response.ok) throw new Error("SAVE_FAILED");

      const result = (await response.json()) as Partial<T>;
      const normalized = normalizeRef.current({ ...savedState, ...result });
      updatedAtRef.current = normalized.updatedAt ?? savedState.updatedAt;
      setData(normalized);
      if (savedState !== pending) {
        onMessageRef.current("Data terbaru digabungkan dan transaksi berhasil disimpan.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.message === "DATA_CONFLICT")) setData(previous);
      onMessageRef.current(
        error instanceof Error && error.message === "DATA_CONFLICT"
          ? "Data berubah di perangkat atau tab lain. Muat ulang halaman sebelum menyimpan kembali."
          : "Data gagal disimpan. Silakan coba lagi.",
      );
      throw new Error("Data gagal disimpan");
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }

  async function resetSimulationState() {
    if (!isSimulation || saveInFlightRef.current) return false;
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/state", { method: "DELETE" });
      if (!response.ok) throw new Error("RESET_FAILED");
      const next = normalizeRef.current(await response.json());
      updatedAtRef.current = next.updatedAt;
      setData(next);
      return true;
    } catch {
      onMessageRef.current("Data simulasi gagal dikosongkan.");
      return false;
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }

  return {
    data,
    loaded,
    saving,
    isSimulation,
    persist,
    resetSimulationState,
    isSaveInFlight: () => saveInFlightRef.current,
  };
}
