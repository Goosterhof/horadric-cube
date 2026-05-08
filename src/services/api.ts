// Talking to The Horadrim's reliquary gate.
//
// Fetch through Tauri's HTTP plugin so the request is visible to the
// allowlisted host scope and not subject to webview CORS. Two endpoints:
//   - GET /api/catalog/aspects → static catalog mirror (used to map OCR'd
//     aspect names to aspect_ids before submission).
//   - POST /api/ingest/tooltip → the gate that consumes parsed payloads.

import type {AspectCatalogEntry, IngestPayload, IngestResult} from '@/types/cube';

import {getToken} from '@/services/auth';
import {fetch as tauriFetch} from '@tauri-apps/plugin-http';

export class ReliquaryError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly body?: unknown,
    ) {
        super(message);
        this.name = 'ReliquaryError';
    }
}

interface CatalogResponse {
    data: AspectCatalogEntry[];
}

export async function fetchAspectCatalog(backendUrl: string): Promise<AspectCatalogEntry[]> {
    const url = new URL('/api/catalog/aspects', backendUrl);
    const response = await tauriFetch(url.toString(), {method: 'GET', headers: {Accept: 'application/json'}});
    if (!response.ok) {
        throw new ReliquaryError(`catalog fetch refused (${response.status})`, response.status);
    }
    const body = (await response.json()) as CatalogResponse | AspectCatalogEntry[];
    return Array.isArray(body) ? body : body.data;
}

export async function postIngest(backendUrl: string, payload: IngestPayload): Promise<IngestResult> {
    const token = await getToken();
    if (!token) {
        throw new ReliquaryError('no bearer token — authenticate via Settings');
    }
    const url = new URL('/api/ingest/tooltip', backendUrl);
    const response = await tauriFetch(url.toString(), {
        method: 'POST',
        headers: {Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify(payload),
    });

    if (response.status === 401) {
        throw new ReliquaryError('the bearer was rejected — re-authenticate', 401);
    }
    if (response.status === 422) {
        const body: unknown = await response.json().catch(() => null);
        throw new ReliquaryError('the gate rejected the payload — parser needs work', 422, body);
    }
    if (!response.ok) {
        throw new ReliquaryError(`ingest failed (${response.status})`, response.status);
    }
    return (await response.json()) as IngestResult;
}

/**
 * Resolves an OCR-extracted aspect name to an aspect_id from the cached
 * catalog. Returns null when no confident match is found — the parser then
 * leaves aspect_id off the payload and the backend will return a 422 with a
 * targeted error the investor can iterate against.
 */
export function resolveAspectId(catalog: AspectCatalogEntry[], rawName: string): string | null {
    const needle = rawName.trim().toLowerCase();
    if (!needle) return null;

    // Exact match wins; otherwise look for a substring match in either direction.
    const exact = catalog.find((entry) => entry.name.toLowerCase() === needle);
    if (exact) return exact.aspectId;

    const partial = catalog.find((entry) => {
        const haystack = entry.name.toLowerCase();
        return haystack.includes(needle) || needle.includes(haystack);
    });
    return partial?.aspectId ?? null;
}
