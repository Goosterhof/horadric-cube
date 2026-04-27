<script setup lang="ts">
import { ref } from "vue";

import StatusPanel from "@/pages/StatusPanel.vue";
import HistoryPanel from "@/pages/HistoryPanel.vue";
import SettingsPanel from "@/pages/SettingsPanel.vue";
import AboutPanel from "@/pages/AboutPanel.vue";
import { useCube } from "@/composables/useCube";

type Tab = "status" | "history" | "settings" | "about";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "status", label: "Status" },
  { id: "history", label: "Codex" },
  { id: "settings", label: "Settings" },
  { id: "about", label: "About" },
];

const activeTab = ref<Tab>("status");
const { state } = useCube();

function statusGlow(): string {
  switch (state.trayState) {
    case "capturing":
      return "bg-hd-ember/80 shadow-ember";
    case "success":
      return "bg-emerald-600/80";
    case "error":
      return "bg-hd-crimson shadow-crimson";
    default:
      return "bg-hd-rune/60";
  }
}

function statusLabel(): string {
  switch (state.trayState) {
    case "capturing":
      return "Capturing";
    case "success":
      return "Captured";
    case "error":
      return "Refused";
    default:
      return "Idle";
  }
}
</script>

<template>
  <div class="flex flex-col h-full font-body text-hd-bone">
    <header class="border-b border-hd-rune/30 px-6 py-4 flex items-center gap-4">
      <div class="flex items-center gap-3 flex-1">
        <div class="text-3xl">⬢</div>
        <div>
          <h1 class="font-display text-xl text-hd-bone tracking-wider">The Horadric Cube</h1>
          <p class="vault-label text-[10px] tracking-widest mt-0.5">
            v0.1 · {{ state.hotkey ?? "Ctrl+Shift+H" }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span :class="['inline-block w-2 h-2 rounded-full', statusGlow()]"></span>
        <span class="vault-label text-[10px]">{{ statusLabel() }}</span>
      </div>
    </header>

    <nav class="border-b border-hd-rune/30 flex">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        :class="[
          'flex-1 py-2 px-3 text-xs uppercase tracking-widest font-display transition-colors duration-150',
          activeTab === tab.id
            ? 'text-hd-ember border-b-2 border-hd-ember'
            : 'text-hd-bone/50 hover:text-hd-bone border-b-2 border-transparent',
        ]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <main class="flex-1 overflow-y-auto p-6">
      <StatusPanel v-if="activeTab === 'status'" />
      <HistoryPanel v-else-if="activeTab === 'history'" />
      <SettingsPanel v-else-if="activeTab === 'settings'" />
      <AboutPanel v-else />
    </main>

    <footer class="border-t border-hd-rune/30 px-6 py-2 flex justify-between vault-label text-[10px]">
      <span>The Horadrim · The Cube reads, it does not touch</span>
      <span v-if="state.queueLength > 0" class="text-hd-ember">
        {{ state.queueLength }} queued
      </span>
    </footer>
  </div>
</template>
