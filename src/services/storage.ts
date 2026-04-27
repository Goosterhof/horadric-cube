// Persistent storage backed by Tauri's store plugin.
//
// Three logical buckets share a single store file:
//   - settings:  CubeSettings (backend URL, hotkey, region, preset)
//   - catalog:   CatalogCache (aspect catalog mirror with fetchedAt)
//   - queue:     IngestPayload[] (offline submissions awaiting reconnect)
//
// The store survives across launches; the auth bearer lives in the OS
// keychain instead (see auth.ts) — we never persist it to a file.

import { Store } from "@tauri-apps/plugin-store";

import type { CatalogCache, CubeSettings, IngestPayload } from "@/types/cube";
import { DEFAULT_SETTINGS } from "@/types/cube";

const STORE_FILE = "cube.dat";

let storeInstance: Store | null = null;

async function store(): Promise<Store> {
  if (storeInstance) return storeInstance;
  storeInstance = await Store.load(STORE_FILE);
  return storeInstance;
}

// ─── settings ──────────────────────────────────────────────────────────────
export async function loadSettings(): Promise<CubeSettings> {
  const s = await store();
  const persisted = await s.get<Partial<CubeSettings>>("settings");
  return { ...DEFAULT_SETTINGS, ...(persisted ?? {}) };
}

export async function saveSettings(settings: CubeSettings): Promise<void> {
  const s = await store();
  await s.set("settings", settings);
  await s.save();
}

// ─── catalog ───────────────────────────────────────────────────────────────
export async function loadCatalog(): Promise<CatalogCache | null> {
  const s = await store();
  return (await s.get<CatalogCache>("catalog")) ?? null;
}

export async function saveCatalog(cache: CatalogCache): Promise<void> {
  const s = await store();
  await s.set("catalog", cache);
  await s.save();
}

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
export function isCatalogStale(cache: CatalogCache | null): boolean {
  if (!cache) return true;
  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  return age > STALE_AFTER_MS;
}

// ─── offline queue ─────────────────────────────────────────────────────────
export async function loadQueue(): Promise<IngestPayload[]> {
  const s = await store();
  return (await s.get<IngestPayload[]>("queue")) ?? [];
}

export async function saveQueue(queue: IngestPayload[]): Promise<void> {
  const s = await store();
  await s.set("queue", queue);
  await s.save();
}

export async function enqueuePayload(payload: IngestPayload): Promise<void> {
  const queue = await loadQueue();
  queue.push(payload);
  await saveQueue(queue);
}

export async function clearQueue(): Promise<void> {
  await saveQueue([]);
}
