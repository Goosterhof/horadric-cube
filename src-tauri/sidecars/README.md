# Sidecars — Tesseract Windows Binary

This directory holds the bundled OCR engine that ships alongside the Cube.
Tauri's sidecar pattern requires the binary to be present at build time so it
can be copied next to the application executable.

## What goes here

```
sidecars/
├── tesseract-x86_64-pc-windows-msvc.exe   # the Windows tesseract binary
└── eng.traineddata                        # English language pack
```

The filename suffix matters: Tauri matches sidecars to host triples. For the
investor's Windows 11 target the triple is `x86_64-pc-windows-msvc`. Tauri
strips the suffix at runtime and resolves to `tesseract.exe` next to the app.

## Where to get them

**Tesseract binary** — Download the latest stable Windows build from the
Tesseract OCR project's release channel. The Tesseract 5.x line is the
recommended baseline; check the project's release notes for the most recent
patch when you fetch it. Place the executable here as
`tesseract-x86_64-pc-windows-msvc.exe`.

**Language pack** — Grab `eng.traineddata` from Tesseract's `tessdata`
repository (the standard `tessdata` set, not `tessdata_fast` or
`tessdata_best` unless the investor has decided otherwise). Place it in this
directory; `tauri.conf.json` declares it as a bundled resource.

## Why it isn't in git

The Tesseract binary is a multi-megabyte executable maintained by an upstream
project. Vendoring it would bloat the repo and make security updates manual.
The investor (or a release pipeline, when one exists) drops the artifact into
this directory before running `tauri build`. Until then the dev build will
warn about the missing sidecar — that warning is expected during scaffolding.

## Verifying

Once the binary is in place:

```sh
cd src-tauri/sidecars
./tesseract-x86_64-pc-windows-msvc.exe --version
```

If the binary prints its version string, the Cube can invoke it.
