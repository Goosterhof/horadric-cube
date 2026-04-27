// Global hotkey registration.
//
// Default: Ctrl+Shift+H — H for Horadrim, unlikely to collide with D4 keybinds.
// The Cube emits `hotkey-fired` and lets the frontend orchestrate the capture
// pipeline. Keeping the orchestration in TS makes the parser easy to iterate.

use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent, ShortcutState,
};

const DEFAULT_HOTKEY: &str = "Ctrl+Shift+H";

#[derive(Default)]
struct CurrentHotkey(Mutex<Option<String>>);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct HotkeyFired {
    accelerator: String,
    fired_at: String,
}

pub fn register_default<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    app.manage(CurrentHotkey::default());
    bind(app, DEFAULT_HOTKEY).map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!(e)))?;
    Ok(())
}

fn bind<R: Runtime>(app: &AppHandle<R>, accelerator: &str) -> Result<(), String> {
    let shortcut = parse_accelerator(accelerator)?;
    let app_for_handler = app.clone();
    let accel_for_handler = accelerator.to_string();

    let shortcuts = app.global_shortcut();

    // Drop any previously-bound accelerator before installing the new one.
    let state: tauri::State<'_, CurrentHotkey> = app.state();
    if let Some(previous) = state.0.lock().ok().and_then(|g| g.clone()) {
        if let Ok(prev) = parse_accelerator(&previous) {
            let _ = shortcuts.unregister(prev);
        }
    }

    shortcuts
        .on_shortcut(shortcut, move |_app, _shortcut, event: ShortcutEvent| {
            if event.state() != ShortcutState::Pressed {
                return;
            }
            let payload = HotkeyFired {
                accelerator: accel_for_handler.clone(),
                fired_at: chrono::Utc::now().to_rfc3339(),
            };
            if let Err(err) = app_for_handler.emit("hotkey-fired", payload) {
                log::warn!("hotkey emit failed: {err}");
            }
        })
        .map_err(|e| e.to_string())?;

    if let Ok(mut guard) = app.state::<CurrentHotkey>().0.lock() {
        *guard = Some(accelerator.to_string());
    }
    Ok(())
}

fn parse_accelerator(accel: &str) -> Result<Shortcut, String> {
    // Tauri's parser accepts common accelerator strings, but pinning the parse
    // path here keeps error messages voiced and lets us guard against typos.
    let mut modifiers = Modifiers::empty();
    let mut code: Option<Code> = None;

    for part in accel.split('+').map(str::trim) {
        match part.to_lowercase().as_str() {
            "ctrl" | "control" => modifiers |= Modifiers::CONTROL,
            "shift" => modifiers |= Modifiers::SHIFT,
            "alt" | "option" => modifiers |= Modifiers::ALT,
            "super" | "meta" | "cmd" | "win" => modifiers |= Modifiers::SUPER,
            other => {
                code = Some(letter_to_code(other).ok_or_else(|| {
                    format!("unrecognised key in accelerator '{accel}': {other}")
                })?);
            }
        }
    }

    let code = code.ok_or_else(|| format!("accelerator '{accel}' missing a key"))?;
    Ok(Shortcut::new(Some(modifiers), code))
}

fn letter_to_code(letter: &str) -> Option<Code> {
    Some(match letter.to_uppercase().as_str() {
        "A" => Code::KeyA,
        "B" => Code::KeyB,
        "C" => Code::KeyC,
        "D" => Code::KeyD,
        "E" => Code::KeyE,
        "F" => Code::KeyF,
        "G" => Code::KeyG,
        "H" => Code::KeyH,
        "I" => Code::KeyI,
        "J" => Code::KeyJ,
        "K" => Code::KeyK,
        "L" => Code::KeyL,
        "M" => Code::KeyM,
        "N" => Code::KeyN,
        "O" => Code::KeyO,
        "P" => Code::KeyP,
        "Q" => Code::KeyQ,
        "R" => Code::KeyR,
        "S" => Code::KeyS,
        "T" => Code::KeyT,
        "U" => Code::KeyU,
        "V" => Code::KeyV,
        "W" => Code::KeyW,
        "X" => Code::KeyX,
        "Y" => Code::KeyY,
        "Z" => Code::KeyZ,
        "F1" => Code::F1,
        "F2" => Code::F2,
        "F3" => Code::F3,
        "F4" => Code::F4,
        "F5" => Code::F5,
        "F6" => Code::F6,
        "F7" => Code::F7,
        "F8" => Code::F8,
        "F9" => Code::F9,
        "F10" => Code::F10,
        "F11" => Code::F11,
        "F12" => Code::F12,
        _ => return None,
    })
}

#[tauri::command]
pub fn rebind_hotkey<R: Runtime>(app: AppHandle<R>, accelerator: String) -> Result<(), String> {
    bind(&app, &accelerator)
}

#[tauri::command]
pub fn current_hotkey<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>, String> {
    let state: tauri::State<'_, CurrentHotkey> = app.state();
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    Ok(guard.clone())
}
