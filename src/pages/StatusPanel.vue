<script setup lang="ts">
import { computed } from "vue";

import { useCube } from "@/composables/useCube";

const { state, isCapturing, lastError, runCapture } = useCube();

const catalogStatus = computed(() => {
  if (!state.catalogFetchedAt) return "Never";
  const fetched = new Date(state.catalogFetchedAt);
  const ageMs = Date.now() - fetched.getTime();
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
});

const authStatus = computed(() => {
  if (!state.authenticated) return "Sealed";
  return "Authenticated";
});

const authClass = computed(() =>
  state.authenticated ? "text-emerald-400" : "text-hd-crimson",
);
</script>

<template>
  <div class="space-y-4">
    <div class="vault-card">
      <div class="vault-label mb-3">The watch</div>
      <div class="flex items-baseline gap-3">
        <span class="font-display text-3xl text-hd-ember">
          {{ state.trayState === "capturing" ? "Capturing…" : "Standing by" }}
        </span>
      </div>
      <p class="text-hd-bone/60 text-sm mt-2">
        Hover an item or aspect tooltip in Diablo 4 and press
        <span class="vault-rune">{{ state.hotkey ?? "Ctrl+Shift+H" }}</span>.
        The Cube will capture, OCR, and post the parsed payload.
      </p>
      <button
        class="vault-button-primary mt-4"
        :disabled="isCapturing || !state.authenticated"
        @click="runCapture"
      >
        {{ isCapturing ? "Capturing…" : "Capture now" }}
      </button>
      <p v-if="!state.authenticated" class="text-hd-crimson text-xs mt-2">
        Authenticate via Settings before capturing.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="vault-card">
        <div class="vault-label">Catalog</div>
        <div class="vault-rune mt-1">{{ state.catalog.length }} aspects</div>
        <div class="text-hd-bone/50 text-xs">{{ catalogStatus }}</div>
      </div>
      <div class="vault-card">
        <div class="vault-label">Vault</div>
        <div :class="['vault-rune mt-1', authClass]">{{ authStatus }}</div>
        <div v-if="state.authenticatedAt" class="text-hd-bone/50 text-xs">
          since this session
        </div>
      </div>
      <div class="vault-card">
        <div class="vault-label">Queued</div>
        <div class="vault-rune mt-1">{{ state.queueLength }} payloads</div>
        <div class="text-hd-bone/50 text-xs">flush on next success</div>
      </div>
      <div class="vault-card">
        <div class="vault-label">Region</div>
        <div class="vault-rune mt-1">
          {{ state.settings.region.width }}×{{ state.settings.region.height }}
        </div>
        <div class="text-hd-bone/50 text-xs">{{ state.settings.presetId }}</div>
      </div>
    </div>

    <div v-if="lastError" class="vault-card border-hd-crimson/40">
      <div class="vault-label text-hd-crimson">Last refusal</div>
      <pre class="font-mono text-xs text-hd-bone/80 mt-2 whitespace-pre-wrap">{{ lastError }}</pre>
    </div>
  </div>
</template>
