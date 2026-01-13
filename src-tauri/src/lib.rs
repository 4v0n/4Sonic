use serde::Serialize;
#[cfg(target_os = "windows")]
use windows::Win32::UI::Shell::PropertiesSystem::{IPropertyStore, PROPERTYKEY, PKEY_Device_FriendlyName};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize)]
struct AudioOutputDevice {
    id: String,
    name: String,
    is_default: bool,
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn list_audio_outputs() -> Result<Vec<AudioOutputDevice>, String> {
    use windows::Win32::Media::Audio::{
        eMultimedia, eRender, IMMDeviceEnumerator, MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
    };
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};
    use windows::Win32::System::Com::StructuredStorage::STGM_READ;

    unsafe {
        CoInitializeEx(None, COINIT_MULTITHREADED).map_err(|err| err.to_string())?;
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(|err| err.to_string())?;
        let default_id = enumerator
            .GetDefaultAudioEndpoint(eRender, eMultimedia)
            .ok()
            .and_then(|device| device.GetId().ok())
            .and_then(|id| id.to_string().ok());

        let collection = enumerator
            .EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)
            .map_err(|err| err.to_string())?;
        let count = collection.GetCount().map_err(|err| err.to_string())?;

        let mut devices = Vec::new();
        for index in 0..count {
            let device = collection.Item(index).map_err(|err| err.to_string())?;
            let id = device
                .GetId()
                .map_err(|err| err.to_string())?
                .to_string()
                .map_err(|err| err.to_string())?;

            let store = device.OpenPropertyStore(STGM_READ).map_err(|err| err.to_string())?;
            let name = read_property_string(&store, &PKEY_Device_FriendlyName)
                .unwrap_or_else(|| "Unknown output".to_string());
            let is_default = default_id.as_ref().map_or(false, |default| default == &id);

            devices.push(AudioOutputDevice { id, name, is_default });
        }

        Ok(devices)
    }
}

#[cfg(target_os = "windows")]
fn read_property_string(store: &IPropertyStore, key: &PROPERTYKEY) -> Option<String> {
    use std::mem::MaybeUninit;
    use windows::core::PWSTR;
    use windows::Win32::System::Com::CoTaskMemFree;
    use windows::Win32::System::Com::StructuredStorage::{PropVariantClear, PROPVARIANT};
    use windows::Win32::UI::Shell::PropertiesSystem::PropVariantToStringAlloc;

    unsafe {
        let mut value = MaybeUninit::<PROPVARIANT>::zeroed();
        if store.GetValue(key, value.as_mut_ptr()).is_err() {
            return None;
        }

        let mut prop_variant = value.assume_init();
        let mut wide = PWSTR::null();
        let converted = PropVariantToStringAlloc(&prop_variant, &mut wide);
        let _ = PropVariantClear(&mut prop_variant);
        if converted.is_err() || wide.is_null() {
            return None;
        }

        let as_string = wide.to_string().ok();
        CoTaskMemFree(Some(wide.0 as *const _));
        as_string
    }
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn list_audio_outputs() -> Result<Vec<AudioOutputDevice>, String> {
    Err("WASAPI output selection is only available on Windows builds.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, list_audio_outputs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
