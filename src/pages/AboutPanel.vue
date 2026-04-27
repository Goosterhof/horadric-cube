<script setup lang="ts">
import { openUrl } from "@tauri-apps/plugin-opener";

async function openHoradrim() {
  await openUrl("https://horadrim.zmuuzn.nl");
}

async function openSourcePrecedent() {
  await openUrl("https://github.com/josdemmers/Diablo4Companion");
}
</script>

<template>
  <div class="space-y-4">
    <div class="vault-card">
      <div class="vault-label mb-2">The Horadric Cube</div>
      <p class="text-hd-bone/80 text-sm leading-relaxed">
        The Cube is the local artifact that captures Diablo 4 tooltips during
        play and posts the parsed contents to The Horadrim. The codex grows
        without ceremony — you hover, you press, the vault remembers.
      </p>
    </div>

    <div class="vault-card border-hd-crimson/30">
      <div class="vault-label text-hd-crimson mb-2">The Horadrim's Oath</div>
      <p class="font-display text-hd-bone text-base mb-2">
        The Horadrim reads. It does not touch.
      </p>
      <ul class="text-hd-bone/70 text-xs space-y-1 list-disc list-inside">
        <li>No game memory access.</li>
        <li>No process injection.</li>
        <li>No network interception.</li>
        <li>No client modification.</li>
        <li>Only the configured tooltip region is captured. The PNG is deleted after OCR.</li>
        <li>Only parsed JSON crosses the wire — never raw screenshots.</li>
      </ul>
      <p class="text-hd-bone/60 text-xs mt-3">
        The Cube models its capture pattern on
        <button class="text-hd-ember underline" @click="openSourcePrecedent">
          Diablo4Companion
        </button>
        — a publicly tolerated precedent — and inherits its safe-harbor by
        design proximity. The shield is the pattern, not the obscurity.
      </p>
    </div>

    <div class="vault-card">
      <div class="vault-label mb-2">The Vault</div>
      <p class="text-hd-bone/70 text-xs">
        The web codex lives at
        <button class="text-hd-ember underline" @click="openHoradrim">
          horadrim.zmuuzn.nl
        </button>
        — captures appear there moments after the hotkey fires.
      </p>
    </div>

    <div class="vault-card">
      <div class="vault-label mb-2">Version</div>
      <p class="vault-rune">0.1.0 · phase 2 scaffold</p>
      <p class="text-hd-bone/50 text-xs mt-1">
        Built by the Mad Scientist's laboratory, in the wing labelled "stretch
        skill."
      </p>
    </div>
  </div>
</template>
