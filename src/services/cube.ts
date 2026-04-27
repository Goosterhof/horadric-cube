// The Cube command bridge.
//
// Thin wrappers around the Rust commands defined in src-tauri/src/lib.rs.
// Keeping every Tauri `invoke` call confined to this file means the rest of
// the Vue layer can swap implementations during testing without dragging
// Tauri into component code.

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { CaptureResult, ScreenRegion, TrayState } from "@/types/cube";

export async function captureAndOcr(region: ScreenRegion): Promise<CaptureResult> {
  return await invoke<CaptureResult>("capture_and_ocr", { region });
}

export async function setTrayState(state: TrayState): Promise<void> {
  await invoke("set_tray_state", { state });
}

export async function rebindHotkey(accelerator: string): Promise<void> {
  await invoke("rebind_hotkey", { accelerator });
}

export async function currentHotkey(): Promise<string | null> {
  return await invoke<string | null>("current_hotkey");
}

export interface HotkeyFiredPayload {
  accelerator: string;
  firedAt: string;
}

export async function onHotkeyFired(
  handler: (payload: HotkeyFiredPayload) => void,
): Promise<UnlistenFn> {
  return await listen<HotkeyFiredPayload>("hotkey-fired", (event) => {
    handler(event.payload);
  });
}
