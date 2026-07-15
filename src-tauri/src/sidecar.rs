// Tesseract sidecar invocation.
//
// The Windows `tesseract.exe` is shipped alongside the Cube binary as a Tauri
// sidecar. We invoke it as a subprocess, point it at the PNG, and read stdout.
// No raw screenshots cross the network — only the text the sidecar produces,
// and only after the parser has classified it client-side.

use std::path::Path;

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

use crate::error::{CubeError, CubeResult};

pub async fn run_tesseract(app: &AppHandle, png_path: &Path, psm: u8) -> CubeResult<String> {
    let png_str = png_path.to_string_lossy().to_string();
    let psm_str = psm.to_string();

    let output = app
        .shell()
        .sidecar("tesseract")
        .map_err(|e| CubeError::Sidecar(format!("sidecar lookup failed: {e}")))?
        .args([
            png_str.as_str(),
            "stdout",
            "-l",
            "eng",
            "--psm",
            psm_str.as_str(),
        ])
        .output()
        .await
        .map_err(|e| CubeError::Sidecar(format!("sidecar invocation failed: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(CubeError::Sidecar(format!(
            "tesseract exited with status {:?}: {}",
            output.status.code(),
            stderr.trim()
        )));
    }

    let raw = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(raw)
}
