use crate::models::{OllamaModel, OllamaTagsResponse, SystemMetrics};
use reqwest::Client;
use std::time::Duration;
use sysinfo::System;
use tauri::{command, AppHandle, Manager};

#[command]
pub async fn set_window_mode(app_handle: AppHandle, mode: String) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        if let Ok(Some(monitor)) = window.current_monitor() {
            let scale_factor = monitor.scale_factor();
            let size = monitor.size();
            let screen_w = size.width as f64 / scale_factor;
            let screen_h = size.height as f64 / scale_factor;

            match mode.as_str() {
                "dock" => {
                    let dock_w = 80.0;
                    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                        width: dock_w,
                        height: screen_h,
                    }));
                    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                        x: screen_w - dock_w,
                        y: 0.0,
                    }));
                }
                "panel" => {
                    let panel_w = 760.0;
                    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                        width: panel_w,
                        height: screen_h,
                    }));
                    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                        x: screen_w - panel_w,
                        y: 0.0,
                    }));
                }
                "palette" | "fullscreen" => {
                    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                        width: screen_w,
                        height: screen_h,
                    }));
                    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
                        x: 0.0,
                        y: 0.0,
                    }));
                }
                _ => {}
            }
        }
    }
    Ok(())
}

#[command]
pub async fn get_system_metrics() -> Result<SystemMetrics, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_mem = sys.total_memory() / (1024 * 1024);
    let used_mem = sys.used_memory() / (1024 * 1024);
    let mem_pct = if total_mem > 0 {
        (used_mem as f32 / total_mem as f32) * 100.0
    } else {
        0.0
    };

    Ok(SystemMetrics {
        os_name: System::name().unwrap_or_else(|| "Unknown".into()),
        os_version: System::os_version().unwrap_or_else(|| "".into()),
        cpu_count: sys.cpus().len(),
        cpu_usage_percent: sys.global_cpu_usage(),
        total_memory_mb: total_mem,
        used_memory_mb: used_mem,
        memory_usage_percent: mem_pct,
        uptime_seconds: System::uptime(),
    })
}

#[command]
pub async fn check_ollama_status(endpoint: Option<String>) -> Result<bool, String> {
    let base_url = endpoint.unwrap_or_else(|| "http://127.0.0.1:11434".to_string());
    let client = Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    match client.get(format!("{}/api/tags", base_url.trim_end_matches('/'))).send().await {
        Ok(res) => Ok(res.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[command]
pub async fn list_ollama_models(endpoint: Option<String>) -> Result<Vec<OllamaModel>, String> {
    let base_url = endpoint.unwrap_or_else(|| "http://127.0.0.1:11434".to_string());
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(format!("{}/api/tags", base_url.trim_end_matches('/')))
        .send()
        .await
        .map_err(|e| format!("Failed to reach Ollama: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Ollama returned status {}", res.status()));
    }

    let tags_data = res
        .json::<OllamaTagsResponse>()
        .await
        .map_err(|e| format!("Failed to parse Ollama models: {}", e))?;

    let models = tags_data
        .models
        .into_iter()
        .map(|m| OllamaModel {
            name: m.name,
            size: m.size,
            digest: m.digest,
            modified_at: m.modified_at,
            parameter_size: m.details.as_ref().and_then(|d| d.parameter_size.clone()),
            quantization_level: m.details.as_ref().and_then(|d| d.quantization_level.clone()),
        })
        .collect();

    Ok(models)
}
