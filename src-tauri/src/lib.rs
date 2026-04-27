// The Horadric Cube — entry library
//
// The Cube transforms inputs into refined outputs. In our case: a screen region
// becomes a parsed tooltip, the tooltip becomes a JSON payload, the payload
// reaches The Horadrim's reliquary gate. Everything else in this crate exists
// to keep that pipeline fast, silent, and respectful of the player's machine.

mod auth;
mod capture;
mod error;
mod hotkey;
mod sidecar;
mod tray;

use error::CubeError;
use tauri::Manager;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_log::{Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                ])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            tray::install(app.handle())?;
            hotkey::register_default(app.handle())?;

            // Hide the main window on launch — the Cube lives in the tray.
            // The player surfaces it via the tray menu when settings are needed.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            log::info!("the cube has materialised — tray armed, hotkey listening");
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window hides it instead of quitting — the tray
            // remains the source of truth for whether the Cube is alive.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            capture::capture_and_ocr,
            tray::set_tray_state,
            auth::store_token,
            auth::get_token,
            auth::clear_token,
            hotkey::rebind_hotkey,
            hotkey::current_hotkey,
        ])
        .run(tauri::generate_context!())
        .expect("the cube failed to materialise");
}
