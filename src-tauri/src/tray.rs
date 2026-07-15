// Tray icon and state management.
//
// The tray is the Cube's only persistent surface during play — the main
// window is hidden by default. Four states give the player situational
// awareness without forcing them to alt-tab.

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TrayState {
    Idle,
    Capturing,
    Success,
    Error,
}

const TRAY_ID: &str = "horadric-cube-tray";

pub fn install<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "Open the Cube", true, None::<&str>)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Seal the vault", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &separator, &quit_item])?;

    let _tray = TrayIconBuilder::with_id(TRAY_ID)
        .icon(app.default_window_icon().cloned().expect("default icon"))
        .tooltip("The Horadric Cube — idle")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Single left click also surfaces the window.
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[tauri::command]
pub fn set_tray_state<R: Runtime>(app: AppHandle<R>, state: TrayState) -> Result<(), String> {
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| "tray not installed".to_string())?;

    let tooltip = match state {
        TrayState::Idle => "The Horadric Cube — idle",
        TrayState::Capturing => "The Horadric Cube — capturing…",
        TrayState::Success => "The Horadric Cube — captured ✓",
        TrayState::Error => "The Horadric Cube — capture failed",
    };
    tray.set_tooltip(Some(tooltip)).map_err(|e| e.to_string())?;

    // The default window icon is reused across all four states for v0; the
    // tooltip carries the situational signal. Phase 2 follow-up: ship distinct
    // icon variants (idle grey, capturing amber, success green, error red).
    Ok(())
}
