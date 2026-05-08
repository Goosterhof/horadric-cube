// Single composable for the Cube's reactive state.
//
// The Cube is small enough that one composable can carry settings, catalog,
// queue, capture log, and orchestration without sprouting Pinia. If the
// surface ever outgrows this, split per-concern.

import type {
    AspectCatalogEntry,
    CaptureLogEntry,
    CatalogCache,
    CubeSettings,
    IngestPayload,
    IngestResult,
    TrayState,
} from '@/types/cube';

import {fetchAspectCatalog, postIngest, ReliquaryError, resolveAspectId} from '@/services/api';
import {clearToken, getToken, openAuthFlow, storeToken} from '@/services/auth';
import {captureAndOcr, currentHotkey, onHotkeyFired, rebindHotkey, setTrayState} from '@/services/cube';
import {parseTooltip} from '@/services/parser';
import {
    clearQueue,
    enqueuePayload,
    isCatalogStale,
    loadCatalog,
    loadQueue,
    loadSettings,
    saveCatalog,
    saveQueue,
    saveSettings,
} from '@/services/storage';
import {computed, onMounted, onUnmounted, reactive, ref, type Ref} from 'vue';

const MAX_LOG_ENTRIES = 50;

interface CubeState {
    initialized: boolean;
    trayState: TrayState;
    settings: CubeSettings;
    catalog: AspectCatalogEntry[];
    catalogFetchedAt: string | null;
    queueLength: number;
    hotkey: string | null;
    authenticated: boolean;
    authenticatedAt: string | null;
}

const state = reactive<CubeState>({
    initialized: false,
    trayState: 'idle',
    settings: {
        backendUrl: 'https://horadrim.zmuuzn.nl',
        hotkey: 'Ctrl+Shift+H',
        region: {x: 0, y: 0, width: 0, height: 0, psm: 6},
        presetId: 'ultrawide-3440',
        autoStart: false,
    },
    catalog: [],
    catalogFetchedAt: null,
    queueLength: 0,
    hotkey: null,
    authenticated: false,
    authenticatedAt: null,
});

const captureLog: Ref<CaptureLogEntry[]> = ref([]);
const lastError = ref<string | null>(null);
const isCapturing = ref(false);

let unlistenHotkey: (() => void) | null = null;
let initPromise: Promise<void> | null = null;

async function initialize(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        state.settings = await loadSettings();
        state.queueLength = (await loadQueue()).length;
        state.hotkey = await currentHotkey();

        const cache = await loadCatalog();
        if (cache) {
            state.catalog = cache.entries;
            state.catalogFetchedAt = cache.fetchedAt;
        }
        if (isCatalogStale(cache)) {
            // Refresh in the background; failure is non-fatal — the previous cache,
            // even if stale, still powers parser → catalog matching.
            void refreshCatalog().catch((err) => console.warn('catalog refresh failed', err));
        }

        const token = await getToken();
        state.authenticated = token !== null;
        state.authenticatedAt = token !== null ? new Date().toISOString() : null;

        // Wire the global hotkey to the capture pipeline.
        unlistenHotkey = await onHotkeyFired(() => {
            void runCapture();
        });

        state.initialized = true;
        void setTrayState('idle');
    })();
    return initPromise;
}

async function attemptIngest(
    payload: NonNullable<ReturnType<typeof parseTooltip>>,
    entry: CaptureLogEntry,
): Promise<void> {
    try {
        const ingestResult = await postIngest(state.settings.backendUrl, payload);
        entry.result = ingestResult;
        entry.state = 'success';
        state.trayState = 'success';
        await setTrayState('success').catch(() => undefined);
        void drainQueue();
    } catch (err) {
        entry.error = err instanceof Error ? err.message : String(err);
        const isAuth = err instanceof ReliquaryError && err.status === 401;
        if (isAuth) {
            state.authenticated = false;
        } else {
            // Network-or-server failures get queued; auth failures don't, since
            // the same broken bearer would just refill the queue with rejections.
            await enqueuePayload(payload);
            state.queueLength = (await loadQueue()).length;
        }
        entry.state = 'error';
        state.trayState = 'error';
        await setTrayState('error').catch(() => undefined);
        lastError.value = entry.error;
    }
}

async function runCapture(): Promise<void> {
    if (isCapturing.value) {
        // Coalesce double-presses — capture-while-capturing produces noise.
        return;
    }
    isCapturing.value = true;
    state.trayState = 'capturing';
    await setTrayState('capturing').catch(() => undefined);

    const entry: CaptureLogEntry = {
        id: crypto.randomUUID(),
        capturedAt: new Date().toISOString(),
        state: 'capturing',
        rawText: '',
    };
    pushLog(entry);

    try {
        const result = await captureAndOcr(state.settings.region);
        entry.rawText = result.rawText;
        entry.elapsedMs = result.elapsedMs;

        const payload = parseTooltip(result.rawText);
        if (!payload) {
            entry.state = 'error';
            entry.error = 'the parser could not classify this tooltip';
            state.trayState = 'error';
            await setTrayState('error').catch(() => undefined);
            lastError.value = entry.error;
            return;
        }

        if (payload.type === 'aspect' && state.catalog.length > 0) {
            const id = resolveAspectId(state.catalog, payload.aspectName);
            if (id) payload.aspectId = id;
        }

        entry.payload = payload;
        await attemptIngest(payload, entry);
    } catch (err) {
        entry.state = 'error';
        entry.error = err instanceof Error ? err.message : String(err);
        state.trayState = 'error';
        await setTrayState('error').catch(() => undefined);
        lastError.value = entry.error;
    } finally {
        isCapturing.value = false;
        // Revert tray to idle after a brief celebration interval.
        setTimeout(() => {
            if (!isCapturing.value) {
                state.trayState = 'idle';
                void setTrayState('idle').catch(() => undefined);
            }
        }, 1200);
    }
}

function pushLog(entry: CaptureLogEntry): void {
    captureLog.value.unshift(entry);
    if (captureLog.value.length > MAX_LOG_ENTRIES) {
        captureLog.value.length = MAX_LOG_ENTRIES;
    }
}

async function refreshCatalog(): Promise<void> {
    const entries = await fetchAspectCatalog(state.settings.backendUrl);
    const cache: CatalogCache = {fetchedAt: new Date().toISOString(), entries};
    await saveCatalog(cache);
    state.catalog = entries;
    state.catalogFetchedAt = cache.fetchedAt;
}

async function drainQueue(): Promise<void> {
    const queue = await loadQueue();
    if (queue.length === 0) return;

    const remaining: IngestPayload[] = [];
    for (const payload of queue) {
        try {
            await postIngest(state.settings.backendUrl, payload);
        } catch {
            // Stop draining on first failure — the network is still down or the
            // token is invalid; preserve order for the next attempt.
            remaining.push(payload, ...queue.slice(queue.indexOf(payload) + 1));
            break;
        }
    }
    await saveQueue(remaining);
    state.queueLength = remaining.length;
}

async function updateSettings(partial: Partial<CubeSettings>): Promise<void> {
    state.settings = {...state.settings, ...partial};
    await saveSettings(state.settings);
    if (partial.hotkey && partial.hotkey !== state.hotkey) {
        await rebindHotkey(partial.hotkey);
        state.hotkey = await currentHotkey();
    }
}

async function authenticate(token: string): Promise<void> {
    await storeToken(token.trim());
    state.authenticated = true;
    state.authenticatedAt = new Date().toISOString();
    // First refresh after auth — many catalog requests are public, but the
    // post-auth refresh confirms the token is live before the player triggers
    // their first capture.
    await refreshCatalog().catch(() => undefined);
}

async function deauthenticate(): Promise<void> {
    await clearToken();
    state.authenticated = false;
    state.authenticatedAt = null;
}

async function manualSyncCatalog(): Promise<void> {
    await refreshCatalog();
}

async function manualDrainQueue(): Promise<IngestResult[] | null> {
    await drainQueue();
    return null;
}

async function manualClearQueue(): Promise<void> {
    await clearQueue();
    state.queueLength = 0;
}

async function manualLaunchAuth(): Promise<void> {
    await openAuthFlow(state.settings.backendUrl);
}

export function useCube() {
    onMounted(() => {
        void initialize();
    });
    onUnmounted(() => {
        if (unlistenHotkey) {
            unlistenHotkey();
            unlistenHotkey = null;
        }
    });

    const catalogCount = computed(() => state.catalog.length);

    return {
        state,
        captureLog,
        lastError,
        isCapturing,
        catalogCount,
        runCapture,
        refreshCatalog: manualSyncCatalog,
        drainQueue: manualDrainQueue,
        clearQueue: manualClearQueue,
        updateSettings,
        authenticate,
        deauthenticate,
        launchAuthFlow: manualLaunchAuth,
    };
}
