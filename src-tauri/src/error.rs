use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CubeError {
    #[error("the screen would not yield: {0}")]
    Capture(String),

    #[error("the sidecar fell silent: {0}")]
    Sidecar(String),

    #[error("the keyring refused: {0}")]
    Keyring(String),

    // Reserved for the hotkey/tray failure paths — those modules currently
    // surface `tauri::Result`, but the voiced taxonomy keeps a variant ready
    // for when their errors cross the bridge. Retained by design, not yet
    // constructed.
    #[allow(dead_code)]
    #[error("the hotkey would not bind: {0}")]
    Hotkey(String),

    #[allow(dead_code)]
    #[error("the tray would not respond: {0}")]
    Tray(String),

    #[error("io: {0}")]
    Io(#[from] std::io::Error),

    #[error("encoding: {0}")]
    Image(#[from] image::ImageError),
}

// Tauri commands need errors that serialise cleanly across the bridge.
impl Serialize for CubeError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type CubeResult<T> = Result<T, CubeError>;
