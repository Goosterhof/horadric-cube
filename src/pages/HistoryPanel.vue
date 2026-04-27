<script setup lang="ts">
import { computed } from "vue";

import { useCube } from "@/composables/useCube";

const { captureLog } = useCube();

const entries = computed(() => captureLog.value);

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

function badgeClass(state: string): string {
  switch (state) {
    case "success":
      return "text-emerald-400 border-emerald-400/40";
    case "error":
      return "text-hd-crimson border-hd-crimson/40";
    case "capturing":
      return "text-hd-ember border-hd-ember/40";
    default:
      return "text-hd-bone/60 border-hd-rune/40";
  }
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="entries.length === 0" class="vault-card text-center">
      <div class="vault-label">The codex breathes empty</div>
      <p class="text-hd-bone/60 text-sm mt-2">
        Captures will appear here as you press the hotkey during play.
      </p>
    </div>

    <div
      v-for="entry in entries"
      :key="entry.id"
      class="vault-card hover:border-hd-rune/70 transition-colors"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              :class="['vault-label border px-2 py-0.5', badgeClass(entry.state)]"
            >
              {{ entry.state }}
            </span>
            <span class="vault-label text-hd-bone/40">
              {{ relativeTime(entry.capturedAt) }}
            </span>
            <span v-if="entry.elapsedMs" class="text-hd-bone/40 text-xs">
              {{ entry.elapsedMs }}ms
            </span>
          </div>

          <div v-if="entry.payload" class="mt-2 vault-rune text-xs">
            <template v-if="entry.payload.type === 'item'">
              {{ entry.payload.name ?? "Item" }} ·
              {{ entry.payload.slot ?? "—" }} ·
              {{ entry.payload.affixes.length }} affix(es)
            </template>
            <template v-else>
              {{ entry.payload.aspectName }}
              <span v-if="entry.payload.aspectId" class="text-hd-bone/40">
                → {{ entry.payload.aspectId }}
              </span>
            </template>
          </div>

          <div v-if="entry.result" class="mt-1 text-emerald-400/80 text-xs font-mono">
            {{ entry.result.status }} · #{{ entry.result.id }}
          </div>

          <div v-if="entry.error" class="mt-1 text-hd-crimson text-xs">
            {{ entry.error }}
          </div>

          <details v-if="entry.rawText" class="mt-2">
            <summary class="vault-label cursor-pointer hover:text-hd-ember">
              raw OCR
            </summary>
            <pre class="font-mono text-xs text-hd-bone/60 mt-2 whitespace-pre-wrap">{{ entry.rawText }}</pre>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>
