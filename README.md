# The Horadric Cube

> *"A box. A small box. The Horadrim built it to fit a sword inside, and a hammer, and the staff that broke the Three. The Cube does not contain. It transforms."*

The Horadric Cube is the local companion to **The Horadrim** — the Diablo 4
personal codex hosted at [horadrim.zmuuzn.nl](https://horadrim.zmuuzn.nl). It
runs in your system tray during play, listens for a single hotkey, captures
the configured tooltip region, OCRs it locally, parses the result into a
structured payload, and posts the payload to the Horadrim's reliquary gate.

The codex grows without ceremony. You hover an item, you press the key, the
vault remembers.

## The Horadrim's Oath

**The Horadrim reads. It does not touch.**

- No game memory access.
- No process injection.
- No network interception.
- No client modification.
- Only the configured tooltip region is captured. The PNG is deleted after OCR.
- Only parsed JSON crosses the wire — never raw screenshots.

The Cube models its capture pattern on
[Diablo4Companion](https://github.com/josdemmers/Diablo4Companion) — a
publicly tolerated precedent — and inherits its safe-harbor by design
proximity. The shield is the pattern, not the obscurity.

If you intend to stream while running the Cube, the disclosure is "screen OCR
only, no memory access, same pattern as publicly tolerated tools." Document
that to your audience explicitly.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         The Horadric Cube                           │
├─────────────────────────────────────────────────────────────────────┤
│  Tauri v2 (Rust core)                                               │
│    ├── tray.rs ........... system tray icon, four states            │
│    ├── hotkey.rs ......... global Ctrl+Shift+H, emits event         │
│    ├── capture.rs ........ region screenshot via xcap, conditioning │
│    ├── sidecar.rs ........ Tesseract subprocess, stdout → text      │
│    └── auth.rs ........... OS keychain via the keyring crate        │
│                                                                      │
│  Vue 3 + TypeScript + UnoCSS (tray window UI)                       │
│    ├── App.vue ........... shell with status / history / settings   │
│    ├── composables/ ...... useCube — single reactive store          │
│    ├── services/ ......... parser, api, storage, auth, cube bridge  │
│    └── pages/ ............ StatusPanel, HistoryPanel, Settings,     │
│                            About                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Pipeline

```
hotkey fires (Ctrl+Shift+H)
    │
    ├─→ Rust capture_and_ocr(region)
    │     ├─→ xcap → cropped PNG (cached, deleted on next launch)
    │     └─→ Tesseract sidecar → raw OCR text
    │
    ├─→ TS parser → IngestPayload (item | aspect)
    │     └─→ catalog match: aspect_name → aspect_id
    │
    └─→ POST horadrim.zmuuzn.nl/api/ingest/tooltip
          ├─→ on success: tray flashes green, queue drains
          └─→ on failure: tray flashes red, payload queued for retry
```

## Tech Stack

- **Tauri v2** (Rust core, Vue UI in webview)
- **Vue 3 + TypeScript 5** + **UnoCSS** (Vault palette mirroring The Horadrim)
- **xcap** for screen region capture
- **Tesseract** as a bundled Windows sidecar binary (not a Rust crate, not WASM)
- **keyring** for OS-level secure token storage
- **tauri-plugin-store** for settings, catalog cache, offline queue
- **tauri-plugin-http** for outbound HTTPS to the Horadrim backend

## Prerequisites

- **Node.js 20+** and **npm 10+**
- **Rust** (rustup, latest stable)
- **Windows-specific build prerequisites** for Tauri — see
  https://tauri.app/start/prerequisites
- **Tesseract sidecar binary** + `eng.traineddata` placed in
  `src-tauri/sidecars/` (see that directory's README for sourcing)

## Development

```bash
# install JS deps
npm install

# pull Rust deps + run dev with hot reload (Rust required)
npm run tauri dev

# build a Windows installer (.msi + .nsis)
npm run tauri build
```

## First-launch checklist

1. **Drop the Tesseract sidecar** into `src-tauri/sidecars/` (filename:
   `tesseract-x86_64-pc-windows-msvc.exe`) plus `eng.traineddata`. Without
   these, captures will fail with a clear sidecar error in the History tab.
2. **Run `tauri dev`** — the Cube launches hidden in the tray. Click the tray
   icon to surface the settings window.
3. **Authenticate** — click "Open browser flow" in Settings → The vault. The
   Horadrim's `/auth/redirect?cube=1` opens in your default browser. After
   completing the Gatekeeper OAuth, paste the resulting bearer/exchange code
   back into the Cube and seal it.
4. **Pick your region preset** — the default is ultrawide 3440×1440. If your
   display is different, switch in Settings → Capture region.
5. **Hover an item in Diablo 4** and press `Ctrl+Shift+H`. The tray icon
   flashes amber → green; the Codex tab shows the parsed payload.

## Phase 2 status

This is Phase 2 of The Horadrim — see the parent experiment log at
`zmuuzn/documents/experiment-logs/00047-the-horadrim.md`. The Phase 1 backend
is live at `horadrim.zmuuzn.nl`; Phase 3 (the Aspect Alchemy engine and the
web codex) is downstream of this Cube being functional.

**v0 limitations:**

- The OAuth flow opens the browser but does not auto-complete back into the
  Cube. The investor pastes the token into Settings. v0.2 closes this loop
  with a deep-link handler or a local HTTP listener.
- Region presets are starting estimates. Pixel-perfect regions ship in v0.2
  with an in-app drag-to-define tool.
- The parser is a v0 heuristic. Real captures will surface holes; iterate
  `src/services/parser.ts` against samples in the History tab's "raw OCR"
  toggle.
- Tray icon is the default Tauri icon for all four states; the tooltip text
  carries the situational signal. Distinct icon variants (idle / capturing /
  success / error) ship in v0.2.
- No paragon board capture. Single tooltip only — that's the locked v0 scope.

## Lab journal

`CLAUDE.md` in this directory is the experiment-specific lab journal — read
it before picking up the scalpel.

## License

Internal — The Horadric Cube is part of the Zmuuzn laboratory and not yet
licensed for redistribution.
