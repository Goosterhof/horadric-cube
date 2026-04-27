// Token storage for the Gatekeeper OAuth bearer.
//
// The token lives in the platform's native credential store via the `keyring`
// crate — Windows Credential Manager on the investor's primary OS, with macOS
// Keychain and Secret Service available if the Cube ever ships beyond Windows.
// The Cube never persists the token to its own files; only the OS holds it.

use keyring::Entry;

use crate::error::{CubeError, CubeResult};

const SERVICE: &str = "nl.zmuuzn.horadric-cube";
const ACCOUNT: &str = "gatekeeper-bearer";

fn entry() -> CubeResult<Entry> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| CubeError::Keyring(e.to_string()))
}

#[tauri::command]
pub fn store_token(token: String) -> CubeResult<()> {
    entry()?
        .set_password(&token)
        .map_err(|e| CubeError::Keyring(e.to_string()))
}

#[tauri::command]
pub fn get_token() -> CubeResult<Option<String>> {
    match entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(CubeError::Keyring(e.to_string())),
    }
}

#[tauri::command]
pub fn clear_token() -> CubeResult<()> {
    match entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(CubeError::Keyring(e.to_string())),
    }
}
