// Region capture + OCR pipeline.
//
// The hotkey fires, the Cube grabs the configured tooltip region into a temp
// PNG, hands the path to the Tesseract sidecar, and returns the raw text.
// Privacy floor: the PNG never leaves the machine. Only parsed JSON does.

use std::path::PathBuf;

use image::{imageops, ImageBuffer, Luma};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use xcap::Monitor;

use crate::error::{CubeError, CubeResult};
use crate::sidecar;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenRegion {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    /// Optional zero-based monitor index. None = primary monitor.
    #[serde(default)]
    pub monitor_index: Option<usize>,
    /// Tesseract PSM (page segmentation mode). 6 = "uniform block of text",
    /// the default that handles Diablo 4 tooltips well.
    #[serde(default = "default_psm")]
    pub psm: u8,
}

fn default_psm() -> u8 {
    6
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureResult {
    pub raw_text: String,
    pub elapsed_ms: u128,
    pub png_path: String,
}

#[tauri::command]
pub async fn capture_and_ocr(app: AppHandle, region: ScreenRegion) -> CubeResult<CaptureResult> {
    let started = std::time::Instant::now();

    let png_path = capture_region_to_png(&app, region)?;
    let raw_text = sidecar::run_tesseract(&app, &png_path, region.psm).await?;

    Ok(CaptureResult {
        raw_text,
        elapsed_ms: started.elapsed().as_millis(),
        png_path: png_path.to_string_lossy().to_string(),
    })
}

fn capture_region_to_png(app: &AppHandle, region: ScreenRegion) -> CubeResult<PathBuf> {
    let monitors = Monitor::all().map_err(|e| CubeError::Capture(e.to_string()))?;
    if monitors.is_empty() {
        return Err(CubeError::Capture("no monitors enumerated".into()));
    }
    let monitor = match region.monitor_index {
        Some(i) => monitors
            .get(i)
            .ok_or_else(|| CubeError::Capture(format!("monitor index {i} out of range")))?,
        None => monitors
            .iter()
            .find(|m| m.is_primary())
            .or_else(|| monitors.first())
            .ok_or_else(|| CubeError::Capture("no primary monitor".into()))?,
    };

    let frame = monitor
        .capture_image()
        .map_err(|e| CubeError::Capture(format!("monitor capture failed: {e}")))?;

    let (full_w, full_h) = frame.dimensions();
    let crop_x = region.x.max(0) as u32;
    let crop_y = region.y.max(0) as u32;
    let crop_w = region.width.min(full_w.saturating_sub(crop_x));
    let crop_h = region.height.min(full_h.saturating_sub(crop_y));
    if crop_w == 0 || crop_h == 0 {
        return Err(CubeError::Capture("region collapses to zero pixels".into()));
    }

    let cropped = imageops::crop_imm(&frame, crop_x, crop_y, crop_w, crop_h).to_image();

    // Standard tesseract input conditioning: grayscale + threshold so the dark
    // Diablo UI yields cleaner glyphs. The threshold was tuned for the tooltip
    // background-to-text contrast; the investor can revisit if accuracy slips.
    let gray = imageops::grayscale(&cropped);
    let conditioned = threshold_inverse(&gray, 110);

    let temp_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| CubeError::Capture(format!("cache dir unavailable: {e}")))?
        .join("captures");
    std::fs::create_dir_all(&temp_dir)?;
    let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%S%3f");
    let png_path = temp_dir.join(format!("tooltip-{stamp}.png"));
    conditioned.save(&png_path)?;

    Ok(png_path)
}

fn threshold_inverse(
    image: &ImageBuffer<Luma<u8>, Vec<u8>>,
    cutoff: u8,
) -> ImageBuffer<Luma<u8>, Vec<u8>> {
    // Dark backgrounds (D4 tooltip) → black; light text → white.
    // Tesseract reads black-on-white; we invert so the darker background goes
    // black-on-white once the threshold flips.
    let (w, h) = image.dimensions();
    let mut out = ImageBuffer::new(w, h);
    for (x, y, px) in image.enumerate_pixels() {
        let v = px.0[0];
        let mapped = if v < cutoff { 0 } else { 255 };
        out.put_pixel(x, y, Luma([mapped]));
    }
    out
}
