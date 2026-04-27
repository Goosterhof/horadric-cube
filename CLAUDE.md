# CLAUDE.md — The Horadric Cube

The Horadric Cube is the local artifact that fills the vault. It is a Tauri
v2 (Rust + Vue) Windows desktop application that captures Diablo 4 tooltip
screen regions on a global hotkey, OCRs them via a bundled Tesseract sidecar
binary, parses the result into typed JSON, and posts the payload to The
Horadrim's reliquary gate at `horadrim.zmuuzn.nl/api/ingest/tooltip`.

This repo lives as a submodule at `zmuuzn/gadgets/horadric-cube/` — the
laboratory's fifth gadget and the first non-VS-Code one. The original
"separate repo, not a submodule" framing in experiment log #00047 was
re-litigated during Phase 2 scaffolding; the Cube is conceptually a tool the
Mad Scientist uses adjacent to an experiment, the same way The Observer is.
It still ships as a Windows binary, not a deployed service. It is the
laboratory's first Tauri build — treated as a stretch skill.

## Tech Stack

- **Core:** Tauri v2 (Rust 2021 edition, rust-version 1.77+)
- **UI:** Vue 3 + TypeScript 5.6 + Vite 6 + UnoCSS (attributify)
- **OCR:** Tesseract Windows binary delivered as a Tauri sidecar (not a Rust
  crate, not WASM)
- **Capture:** the `xcap` Rust crate for region screenshots; `image` for
  cropping/grayscale/threshold
- **Secrets:** the `keyring` crate (Windows Credential Manager backend)
- **Persistence:** `tauri-plugin-store` for settings, catalog cache, offline
  queue
- **HTTP:** `tauri-plugin-http` (allowlisted to `horadrim.zmuuzn.nl` and
  `auth.zmuuzn.nl`)
- **Hotkey:** `tauri-plugin-global-shortcut`
- **Logging:** `tauri-plugin-log` to stdout + log dir

## Architecture

```
horadric-cube/
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs ............ Builder, plugin registration, command list
│   │   ├── main.rs ........... Trivial entry — calls lib::run()
│   │   ├── error.rs .......... CubeError + Serialize-for-Tauri-bridge
│   │   ├── tray.rs ........... TrayIcon install + TrayState command
│   │   ├── hotkey.rs ......... Default Ctrl+Shift+H, parser, rebind command
│   │   ├── capture.rs ........ ScreenRegion → PNG → sidecar → text
│   │   ├── sidecar.rs ........ tesseract subprocess invocation
│   │   └── auth.rs ........... keyring entry for the Gatekeeper bearer
│   ├── Cargo.toml ............ Pinned to tauri 2, plugins-2, keyring 3, xcap 0.0.13
│   ├── tauri.conf.json ....... productName, hidden window, sidecar entry
│   ├── capabilities/default.json  Window + plugin permissions, allowlisted hosts
│   └── sidecars/ ............. (Tesseract + eng.traineddata — added at build time, gitignored)
├── src/
│   ├── App.vue ............... Shell with tab nav (Status / History / Settings / About)
│   ├── main.ts ............... createApp + UnoCSS
│   ├── pages/
│   │   ├── StatusPanel.vue ... Idle / capture button / catalog/queue counters
│   │   ├── HistoryPanel.vue .. Rolling capture log with raw-OCR drawer
│   │   ├── SettingsPanel.vue . Hotkey, region preset, backend URL, auth flow
│   │   └── AboutPanel.vue .... Oath, links, version
│   ├── composables/
│   │   └── useCube.ts ........ Single reactive store, capture orchestration
│   ├── services/
│   │   ├── cube.ts ........... Tauri invoke/listen wrappers
│   │   ├── api.ts ............ horadrim backend HTTP (catalog + ingest)
│   │   ├── parser.ts ......... OCR text → IngestPayload (item vs aspect)
│   │   ├── storage.ts ........ Tauri Store: settings + catalog + queue
│   │   └── auth.ts ........... Token via Rust keyring + browser launch
│   └── types/cube.ts ......... IngestPayload, CubeSettings, REGION_PRESETS
├── uno.config.ts ............. Vault palette: hd-crimson, hd-ember, hd-void, hd-bone
├── vite.config.ts ............ Vue + UnoCSS plugins, @ alias
└── tsconfig.json ............. Strict, @/* path mapping
```

### Capture pipeline

```
hotkey fires (Rust)
    └─→ emits "hotkey-fired" event
            ↓
        useCube.runCapture (TS)
            ├── invoke("capture_and_ocr", { region }) → CaptureResult
            ├── parseTooltip(rawText) → IngestPayload
            ├── resolveAspectId(catalog, aspectName) (for aspects)
            └── postIngest(backendUrl, payload) → IngestResult
                    ├── 401 → mark unauthenticated, do NOT queue
                    ├── 422 → log parser miss, do NOT queue
                    └── network/5xx → enqueuePayload, drain on next success
```

### Key Patterns

- **Hotkey emits, frontend orchestrates.** The Rust hotkey handler emits a
  `hotkey-fired` event; `useCube` listens and runs the full pipeline. Keeps
  parser iteration in TypeScript where it's fast.
- **Capture caches to disk briefly.** PNGs land in
  `app_cache_dir()/captures/tooltip-<timestamp>.png`. The investor's machine
  retains them between runs; future cleanup hook can prune. Never transmitted
  remotely — the privacy floor is enforced by *not implementing* an upload
  path.
- **Image conditioning before OCR.** Captured frames are cropped, grayscaled,
  then threshold-inverted (cutoff 110) so the dark D4 UI yields black-on-white
  glyphs Tesseract reads cleanly. Tune `threshold_inverse` in `capture.rs`
  if accuracy slips.
- **Sidecar arg validation.** `capabilities/default.json` declares
  `shell:allow-execute` with regex validators on the PNG path and the PSM
  number — the only sidecar invocation Tauri will allow. Any mismatch
  produces a security error before the subprocess starts.
- **OS keychain only.** The bearer never touches the store file. `auth.rs`
  uses `keyring::Entry` keyed on `nl.zmuuzn.horadric-cube` /
  `gatekeeper-bearer`. On Windows this is Credential Manager.
- **Tray-first UI.** Window starts hidden (`visible: false` in
  tauri.conf.json). Closing the window hides it instead of quitting — only
  the tray's "Seal the vault" menu item exits the process.
- **Offline queue with idempotent backend.** The Horadrim's ingest action
  hashes `(user_id, slot, affix_set)`; a queued payload retried after a
  network blip produces `unchanged` instead of duplicates.
- **Allowlisted HTTP scope.** The capability declares exactly which hosts
  the Cube may reach: `horadrim.zmuuzn.nl`, `auth.zmuuzn.nl`, and
  `localhost:8000` for backend dev. Extending the allowlist requires editing
  `capabilities/default.json` — friction by design.

## Commands

```bash
# Frontend dev (Vite only, no tray)
npm run dev

# Full Tauri dev with hot reload (requires Rust toolchain)
npm run tauri dev

# Production build (.msi + .nsis installers)
npm run tauri build

# Type-check the Vue layer
npm run typecheck
```

## Conventions

### Rust

- Modules are flat (`mod auth; mod capture; …`) — the Cube is small enough
  that nested module trees would be ceremony. Add depth only when one module
  exceeds ~250 lines.
- Errors use `CubeError` with voiced messages ("the screen would not yield",
  "the sidecar fell silent"). The serializer impl makes them legible across
  the Tauri bridge.
- Tauri commands are thin — they receive serializable structs, do one thing,
  return a `CubeResult<T>`.
- All filesystem writes go through `app.path()` resolvers — never hardcoded
  paths.

### TypeScript

- One composable (`useCube`) carries the reactive surface. Split only when a
  page genuinely needs isolated state.
- Services hide `@tauri-apps/*` imports from components — components import
  composables, composables import services, services import Tauri.
- Types in `@/types/cube` mirror the backend's `IngestPayloadData`. When the
  Horadrim backend evolves the contract, edit both sides in the same commit.
- UnoCSS attributify — `vault-card`, `vault-button`, `vault-rune`, etc. New
  shortcuts go in `uno.config.ts`.

## Sidecar Binary

The Tesseract Windows binary and `eng.traineddata` are **not** committed.
Drop them into `src-tauri/sidecars/`:

```
src-tauri/sidecars/tesseract-x86_64-pc-windows-msvc.exe
src-tauri/sidecars/eng.traineddata
```

See `src-tauri/sidecars/README.md` for sourcing details. Without these,
captures fail with a clear sidecar error.

## Known Limitations & Tech Debt

- **OAuth round-trip is manual.** Browser flow opens, but the investor pastes
  the resulting code into the Cube. v0.2 closes the loop with a custom
  protocol (`horadric-cube://auth?code=…`) or a local HTTP listener.
- **Region presets are estimates.** Pixel-perfect regions need a
  drag-to-define UI — that's v0.2 work.
- **Tray icon is one image, four tooltips.** Distinct icon variants ship in
  v0.2.
- **No paragon board capture.** Single-tooltip only — locked v0 scope per
  experiment log #00047.
- **No auto-update.** The Cube does not phone home for updates. Distribution
  is via the Horadrim's `/download` page (Phase 3 work in the web frontend).
- **English OCR only.** Hardcoded `-l eng` in `sidecar.rs`. Architecture is
  not blocked from adding more locales — the locked v0 decision is to ship
  English-only and revisit if the cohort changes.
- **No CI.** Build and packaging are local. Add a Windows GitHub Actions
  workflow once the binary is shipping.

## Phase 2 Acceptance Criteria

See `zmuuzn/documents/experiment-logs/00047-the-horadrim.md` § Phase 2 for
the full list. The scaffold delivers structural completeness for items 1, 2,
8 (file-based queue), 9, 10 (token via OS keychain rather than the
keystore-plugin name in the original spec), 11, 13. Items 3–7 (region
capture, OCR accuracy, parser correctness, end-to-end ingest, tray icon
states) require the Tesseract sidecar binary + a Windows host running the
build before they can be verified.

## Phase 2D — Web Download Page (deferred)

Phase 2D ("Client Distribution — The Download Codex") lives in the Horadrim
*web frontend*, not in this repo. Open the matching ticket in
`zmuuzn/experiments/zmuuzn-horadrim/` once the first Cube binary is built.
