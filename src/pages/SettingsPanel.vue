<script setup lang="ts">
import {useCube} from '@/composables/useCube';
import {REGION_PRESETS} from '@/types/cube';
import {ref, watch} from 'vue';

const {state, updateSettings, authenticate, deauthenticate, launchAuthFlow, refreshCatalog, drainQueue, clearQueue} =
    useCube();

const draftHotkey = ref(state.settings.hotkey);
const draftBackend = ref(state.settings.backendUrl);
const draftPreset = ref(state.settings.presetId);
const tokenInput = ref('');
const busy = ref<string | null>(null);
const message = ref<string | null>(null);

watch(
    () => state.settings,
    (next) => {
        draftHotkey.value = next.hotkey;
        draftBackend.value = next.backendUrl;
        draftPreset.value = next.presetId;
    },
    {deep: true, immediate: true},
);

async function applyHotkey() {
    busy.value = 'hotkey';
    try {
        await updateSettings({hotkey: draftHotkey.value});
        message.value = 'Hotkey rebound.';
    } catch (err) {
        message.value = err instanceof Error ? err.message : String(err);
    } finally {
        busy.value = null;
    }
}

async function applyBackend() {
    busy.value = 'backend';
    try {
        await updateSettings({backendUrl: draftBackend.value});
        message.value = 'Backend URL saved.';
    } finally {
        busy.value = null;
    }
}

async function applyPreset() {
    const preset = REGION_PRESETS.find((p) => p.id === draftPreset.value);
    if (!preset) return;
    busy.value = 'preset';
    try {
        await updateSettings({presetId: preset.id, region: preset.region});
        message.value = `Region preset switched to ${preset.label}.`;
    } finally {
        busy.value = null;
    }
}

async function applyToken() {
    const trimmed = tokenInput.value.trim();
    if (!trimmed) return;
    busy.value = 'auth';
    try {
        await authenticate(trimmed);
        tokenInput.value = '';
        message.value = 'Bearer stored in the keyring. Catalog refreshing.';
    } catch (err) {
        message.value = err instanceof Error ? err.message : String(err);
    } finally {
        busy.value = null;
    }
}

async function revoke() {
    busy.value = 'revoke';
    try {
        await deauthenticate();
        message.value = 'Bearer cleared.';
    } finally {
        busy.value = null;
    }
}

async function syncNow() {
    busy.value = 'catalog';
    try {
        await refreshCatalog();
        message.value = 'Aspect catalog refreshed.';
    } catch (err) {
        message.value = err instanceof Error ? err.message : String(err);
    } finally {
        busy.value = null;
    }
}
</script>

<template>
    <div class="space-y-4">
        <div class="vault-card">
            <div class="vault-label mb-3">The vault</div>
            <p class="text-hd-bone/70 text-xs mb-3">
                The bearer is stored in the operating system's credential vault — not on disk. v0 limitation: the OAuth
                flow opens in your browser and you paste the resulting token here.
            </p>
            <div class="flex gap-2">
                <button class="vault-button" :disabled="busy !== null" @click="launchAuthFlow">
                    Open browser flow
                </button>
                <button v-if="state.authenticated" class="vault-button" :disabled="busy !== null" @click="revoke">
                    Forget bearer
                </button>
            </div>
            <input
                v-model="tokenInput"
                class="vault-input w-full mt-3"
                placeholder="Paste exchange code or bearer token here"
                type="password"
            />
            <button
                class="vault-button-primary mt-2"
                :disabled="busy !== null || !tokenInput.trim()"
                @click="applyToken"
            >
                Seal the token
            </button>
            <p v-if="state.authenticated" class="text-emerald-400 text-xs mt-2">
                Authenticated — captures will reach the reliquary.
            </p>
            <p v-else class="text-hd-crimson text-xs mt-2">No bearer present.</p>
        </div>

        <div class="vault-card">
            <div class="vault-label mb-3">Capture region</div>
            <div class="flex gap-2 mb-2">
                <select v-model="draftPreset" class="vault-input flex-1">
                    <option v-for="preset in REGION_PRESETS" :key="preset.id" :value="preset.id">
                        {{ preset.label }}
                    </option>
                </select>
                <button
                    class="vault-button"
                    :disabled="busy !== null || draftPreset === state.settings.presetId"
                    @click="applyPreset"
                >
                    Apply
                </button>
            </div>
            <p class="text-hd-bone/60 text-xs">
                Region:
                <span class="vault-rune">
                    x={{ state.settings.region.x }}, y={{ state.settings.region.y }},
                    {{ state.settings.region.width }}×{{ state.settings.region.height }}
                </span>
            </p>
            <p class="text-hd-bone/40 text-xs mt-1">
                Pixel-perfect tuning ships in v0.2 — for now adjust the preset numbers in
                <span class="vault-rune">src/types/cube.ts</span> and rebuild.
            </p>
        </div>

        <div class="vault-card">
            <div class="vault-label mb-3">Hotkey</div>
            <div class="flex gap-2">
                <input v-model="draftHotkey" class="vault-input flex-1" placeholder="Ctrl+Shift+H" />
                <button
                    class="vault-button"
                    :disabled="busy !== null || draftHotkey === state.settings.hotkey"
                    @click="applyHotkey"
                >
                    Rebind
                </button>
            </div>
            <p class="text-hd-bone/40 text-xs mt-1">Modifiers: Ctrl, Shift, Alt, Super. Key: A–Z, F1–F12.</p>
        </div>

        <div class="vault-card">
            <div class="vault-label mb-3">Reliquary gate</div>
            <div class="flex gap-2">
                <input v-model="draftBackend" class="vault-input flex-1" placeholder="https://horadrim.zmuuzn.nl" />
                <button
                    class="vault-button"
                    :disabled="busy !== null || draftBackend === state.settings.backendUrl"
                    @click="applyBackend"
                >
                    Save
                </button>
            </div>
        </div>

        <div class="vault-card">
            <div class="vault-label mb-3">Maintenance</div>
            <div class="flex gap-2 flex-wrap">
                <button class="vault-button" :disabled="busy !== null" @click="syncNow">Sync catalog</button>
                <button class="vault-button" :disabled="busy !== null || state.queueLength === 0" @click="drainQueue">
                    Flush queue ({{ state.queueLength }})
                </button>
                <button class="vault-button" :disabled="busy !== null || state.queueLength === 0" @click="clearQueue">
                    Empty queue
                </button>
            </div>
        </div>

        <p v-if="message" class="text-hd-ember text-xs">{{ message }}</p>
    </div>
</template>
