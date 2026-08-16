use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppData {
    pub entries: Vec<Entry>,
    pub types: Vec<String>,
    pub settings: Settings,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Entry {
    pub id: String,
    pub date: String,
    #[serde(rename = "taskType")]
    pub task_type: String,
    pub nature: String,
    pub content: String,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: String,
    pub quantity: u32,
    pub unit: String,
    pub note: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TimerState {
    #[serde(rename = "taskType")]
    pub task_type: String,
    pub content: String,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: String,
    pub nature: String,
    pub note: String,
}


#[derive(Clone, Copy, Debug)]
struct DockMemory {
    docked: bool,
}

static DOCK_MEMORY: OnceLock<Mutex<Option<DockMemory>>> = OnceLock::new();

fn dock_memory() -> &'static Mutex<Option<DockMemory>> {
    DOCK_MEMORY.get_or_init(|| Mutex::new(None))
}

fn data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("WorkTimer")
}

fn data_file() -> PathBuf {
    data_dir().join("data.json")
}

fn timer_state_file() -> PathBuf {
    data_dir().join("timer_state.json")
}

fn float_task_file() -> PathBuf {
    data_dir().join("float_task.json")
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct FloatTask {
    #[serde(rename = "taskType")]
    pub task_type: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Settings {
    #[serde(rename = "edgeDock")]
    pub edge_dock: bool,
}

#[tauri::command]
fn load_data() -> Result<AppData, String> {
    let path = data_file();
    if !path.exists() {
        return Ok(AppData {
            entries: vec![],
            types: vec![
                "订单导出".into(),
                "邮件回复".into(),
                "制单发货".into(),
                "评论回复".into(),
                "文档整理".into(),
            ],
            settings: Settings::default(),
        });
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: AppData = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(data)
}

#[tauri::command]
fn save_data(data: AppData) -> Result<(), String> {
    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(data_file(), content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_float_window(app: tauri::AppHandle) -> Result<(), String> {
    if app.get_webview_window("float").is_some() {
        return Ok(());
    }
    let _window = tauri::WebviewWindowBuilder::new(
        &app,
        "float",
        tauri::WebviewUrl::App("index.html?float=1".into()),
    )
    .title("Timer")
    .inner_size(320.0, 180.0)
    .min_inner_size(240.0, 140.0)
    .max_inner_size(600.0, 400.0)
    .resizable(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .decorations(false)
    .transparent(true)
    .visible(true)
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_float_window_properties(
    app: tauri::AppHandle,
    always_on_top: bool,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("float") {
        let _ = window.set_always_on_top(always_on_top);
    }
    Ok(())
}

#[tauri::command]
fn save_timer_state(state: TimerState) -> Result<(), String> {
    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = timer_state_file();
    let content = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_timer_state() -> Result<Option<TimerState>, String> {
    let path = timer_state_file();
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if content.trim().is_empty() {
        return Ok(None);
    }
    let state: TimerState = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(&path);
    Ok(Some(state))
}

#[tauri::command]
fn save_float_task(task: FloatTask) -> Result<(), String> {
    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = float_task_file();
    let content = serde_json::to_string_pretty(&task).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_float_task() -> Result<Option<FloatTask>, String> {
    let path = float_task_file();
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if content.trim().is_empty() {
        return Ok(None);
    }
    let task: FloatTask = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(Some(task))
}

#[tauri::command]
fn start_float_drag(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("float") {
        let _ = window.start_dragging();
    }
    Ok(())
}

#[tauri::command]
fn dock_float_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("float") {
        let monitor = window.current_monitor().map_err(|e| e.to_string())?
            .ok_or("no monitor")?;
        let scale = monitor.scale_factor();
        let pos: tauri::LogicalPosition<f64> = window.outer_position().map_err(|e| e.to_string())?.to_logical(scale);
        let size: tauri::LogicalSize<f64> = window.outer_size().map_err(|e| e.to_string())?.to_logical(scale);
        let screen: tauri::LogicalSize<f64> = monitor.size().to_logical(scale);
        let margin = 40.0;
        let reveal = 10.0;
        let right_edge = pos.x + size.width;
        let bottom_edge = pos.y + size.height;

        let mut mem = dock_memory().lock().unwrap();
        if let Some(ref mut m) = *mem {
            if m.docked { return Ok(()); }
        } else {
            *mem = Some(DockMemory { docked: false });
        }

        let new_pos = if pos.x < margin {
            Some((reveal - size.width, pos.y))
        } else if right_edge > screen.width - margin {
            Some((screen.width - reveal, pos.y))
        } else if pos.y < margin {
            Some((pos.x, reveal - size.height))
        } else if bottom_edge > screen.height - margin {
            Some((pos.x, screen.height - reveal))
        } else {
            None
        };

        if let Some((x, y)) = new_pos {
            if let Some(ref mut m) = *mem {
                m.docked = true;
            }
            window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn undock_float_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("float") {
        let mut mem = dock_memory().lock().unwrap();
        let currently_docked = mem.map(|m| m.docked).unwrap_or(false);
        if !currently_docked { return Ok(()); }

        let monitor = window.current_monitor().map_err(|e| e.to_string())?
            .ok_or("no monitor")?;
        let scale = monitor.scale_factor();
        let pos: tauri::LogicalPosition<f64> = window.outer_position().map_err(|e| e.to_string())?.to_logical(scale);
        let size: tauri::LogicalSize<f64> = window.outer_size().map_err(|e| e.to_string())?.to_logical(scale);
        let screen: tauri::LogicalSize<f64> = monitor.size().to_logical(scale);
        let margin = 40.0;

        let new_pos = if pos.x < margin {
            Some((0.0, pos.y))
        } else if pos.x + size.width > screen.width - margin {
            Some((screen.width - size.width, pos.y))
        } else if pos.y < margin {
            Some((pos.x, 0.0))
        } else if pos.y + size.height > screen.height - margin {
            Some((pos.x, screen.height - size.height))
        } else {
            None
        };

        if let Some((x, y)) = new_pos {
            if let Some(ref mut m) = *mem {
                m.docked = false;
            }
            window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn close_float_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("float") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|_app| {
            let shortcut = Shortcut::new(
                Some(tauri_plugin_global_shortcut::Modifiers::SUPER | tauri_plugin_global_shortcut::Modifiers::SHIFT),
                tauri_plugin_global_shortcut::Code::KeyT,
            );
            _app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            })?;
            let dir = data_dir();
            fs::create_dir_all(&dir)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            open_float_window,
            set_float_window_properties,
            save_timer_state,
            get_timer_state,
            save_float_task,
            get_float_task,
            start_float_drag,
            dock_float_window,
            undock_float_window,
            close_float_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
