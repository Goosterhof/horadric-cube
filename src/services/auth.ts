// Token storage facade.
//
// The actual secret lives in the OS credential store (Windows Credential
// Manager via the keyring crate). This file exists so the rest of the Vue
// layer never imports from @tauri-apps/api/core directly — keeps the boundary
// between TS and Rust visible.

import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

export async function getToken(): Promise<string | null> {
  return await invoke<string | null>("get_token");
}

export async function storeToken(token: string): Promise<void> {
  await invoke("store_token", { token });
}

export async function clearToken(): Promise<void> {
  await invoke("clear_token");
}

/**
 * Opens the Gatekeeper authorization flow in the player's default browser.
 *
 * v0 limitation: there is no automatic callback into the Cube. The Gatekeeper
 * (or a Horadrim helper page) must surface a one-time exchange code that the
 * investor pastes into Settings → Authentication. v1 closes this loop with a
 * deep-link handler (`horadric-cube://auth?code=…`) or a local HTTP listener.
 */
export async function openAuthFlow(backendUrl: string): Promise<void> {
  // The Horadrim backend's /auth/redirect already proxies to The Gatekeeper.
  // For v0 we open it with `?cube=true` so the backend can render a
  // Cube-friendly success page instead of bouncing back to the SPA.
  const url = new URL("/auth/redirect", backendUrl);
  url.searchParams.set("cube", "1");
  await openUrl(url.toString());
}
