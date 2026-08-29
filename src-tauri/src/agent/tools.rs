use base64::Engine;
use enigo::{
    Axis, Button, Coordinate,
    Direction::{Click, Press, Release},
    Enigo, Key, Keyboard, Mouse, Settings,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::{Duration, Instant};
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

pub fn get_available_tools_definitions() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "take_screenshot".to_string(),
            description: "Capture a full screenshot of the desktop screen or a specified coordinate region. Returns base64 image data and dimensions.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "region": {
                        "type": "object",
                        "description": "Optional bounding box to capture",
                        "properties": {
                            "x": { "type": "integer" },
                            "y": { "type": "integer" },
                            "width": { "type": "integer" },
                            "height": { "type": "integer" }
                        }
                    }
                }
            }),
        },
        ToolDefinition {
            name: "mouse_move".to_string(),
            description: "Move the OS mouse cursor to specific absolute screen coordinates (x, y).".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "x": { "type": "integer", "description": "Target X screen coordinate" },
                    "y": { "type": "integer", "description": "Target Y screen coordinate" }
                },
                "required": ["x", "y"]
            }),
        },
        ToolDefinition {
            name: "mouse_click".to_string(),
            description: "Perform a mouse click (left, right, middle, double) optionally at specific coordinates.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "button": {
                        "type": "string",
                        "enum": ["left", "right", "middle"],
                        "description": "Mouse button to click (default: left)"
                    },
                    "click_type": {
                        "type": "string",
                        "enum": ["single", "double"],
                        "description": "Click type (default: single)"
                    },
                    "x": { "type": "integer", "description": "Optional X coordinate to move before clicking" },
                    "y": { "type": "integer", "description": "Optional Y coordinate to move before clicking" }
                }
            }),
        },
        ToolDefinition {
            name: "mouse_drag".to_string(),
            description: "Drag the mouse from start coordinates to end coordinates.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "start_x": { "type": "integer", "description": "Starting X coordinate" },
                    "start_y": { "type": "integer", "description": "Starting Y coordinate" },
                    "end_x": { "type": "integer", "description": "Ending X coordinate" },
                    "end_y": { "type": "integer", "description": "Ending Y coordinate" }
                },
                "required": ["start_x", "start_y", "end_x", "end_y"]
            }),
        },
        ToolDefinition {
            name: "mouse_scroll".to_string(),
            description: "Scroll the mouse wheel vertically or horizontally.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "delta_y": { "type": "integer", "description": "Vertical scroll amount (positive down, negative up)" },
                    "delta_x": { "type": "integer", "description": "Horizontal scroll amount" }
                }
            }),
        },
        ToolDefinition {
            name: "type_text".to_string(),
            description: "Type a string of text into the currently active desktop window/input field using simulated keystrokes.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "Text to type" }
                },
                "required": ["text"]
            }),
        },
        ToolDefinition {
            name: "press_key".to_string(),
            description: "Press a special key (e.g. 'return', 'tab', 'escape', 'space', 'backspace', 'delete', 'up', 'down', 'left', 'right') or key combination with modifiers (e.g. modifiers: ['command'], key: 'c').".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "key": { "type": "string", "description": "Special key or character to press" },
                    "modifiers": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Modifiers to hold down e.g. ['command', 'control', 'shift', 'alt']"
                    }
                },
                "required": ["key"]
            }),
        },
        ToolDefinition {
            name: "execute_shell_command".to_string(),
            description: "Execute a command in the OS terminal (zsh/sh/cmd) and capture stdout, stderr, and exit code.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "Shell command to run" },
                    "cwd": { "type": "string", "description": "Optional working directory" },
                    "timeout_seconds": { "type": "integer", "description": "Max execution time in seconds (default: 30)" }
                },
                "required": ["command"]
            }),
        },
        ToolDefinition {
            name: "browser_navigate".to_string(),
            description: "Use Playwright headless browser to navigate to a webpage and extract clean structured text content and page title.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "url": { "type": "string", "description": "Web URL to navigate to" },
                    "timeout": { "type": "integer", "description": "Navigation timeout in ms (default: 30000)" }
                },
                "required": ["url"]
            }),
        },
        ToolDefinition {
            name: "browser_screenshot".to_string(),
            description: "Use Playwright to capture a screenshot of a webpage. Returns base64 image data URI.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "url": { "type": "string", "description": "Web URL to capture" },
                    "full_page": { "type": "boolean", "description": "Capture entire scrollable page (default: false)" }
                },
                "required": ["url"]
            }),
        },
        ToolDefinition {
            name: "browser_action".to_string(),
            description: "Perform an action (click, fill, evaluate) on a webpage using Playwright browser automation.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "action": { "type": "string", "enum": ["click", "fill", "evaluate"], "description": "Browser action type" },
                    "url": { "type": "string", "description": "Target webpage URL" },
                    "selector": { "type": "string", "description": "CSS selector to interact with" },
                    "text": { "type": "string", "description": "Text value to fill" },
                    "script": { "type": "string", "description": "JavaScript snippet to evaluate" }
                },
                "required": ["action", "url"]
            }),
        },
        ToolDefinition {
            name: "read_file".to_string(),
            description: "Read the text contents of a file on the local filesystem.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Absolute or relative file path" },
                    "max_lines": { "type": "integer", "description": "Max lines to return (default: 500)" }
                },
                "required": ["path"]
            }),
        },
        ToolDefinition {
            name: "write_file".to_string(),
            description: "Create or overwrite a file with specified text content.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Target file path" },
                    "content": { "type": "string", "description": "Text content to write" }
                },
                "required": ["path", "content"]
            }),
        },
        ToolDefinition {
            name: "append_file".to_string(),
            description: "Append text content to an existing or new file.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Target file path" },
                    "content": { "type": "string", "description": "Text content to append" }
                },
                "required": ["path", "content"]
            }),
        },
        ToolDefinition {
            name: "clipboard_read".to_string(),
            description: "Read the current text from the OS clipboard.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolDefinition {
            name: "clipboard_write".to_string(),
            description: "Write text to the OS clipboard.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string", "description": "Text to copy to clipboard" }
                },
                "required": ["text"]
            }),
        },
        ToolDefinition {
            name: "open_app_or_url".to_string(),
            description: "Open an application or URL with the default OS handler.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "target": { "type": "string", "description": "App name (e.g. 'Calculator') or URL (e.g. 'https://github.com')" }
                },
                "required": ["target"]
            }),
        },
        ToolDefinition {
            name: "get_system_metrics".to_string(),
            description: "Retrieve real-time host system statistics including CPU usage, RAM utilization, and OS details".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {},
                "required": []
            }),
        },
        ToolDefinition {
            name: "get_current_time".to_string(),
            description: "Get the current date, time, and timezone".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Optional timezone identifier like 'local' or 'utc'"
                    }
                }
            }),
        },
        ToolDefinition {
            name: "calculate_expression".to_string(),
            description: "Perform basic mathematical calculations and expressions safely".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Math expression such as '25 * 4 + 10' or 'sqrt(144)'"
                    }
                },
                "required": ["expression"]
            }),
        },
        ToolDefinition {
            name: "list_directory".to_string(),
            description: "List files and directories in a specific folder path".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Target folder path to inspect"
                    }
                },
                "required": ["path"]
            }),
        },
    ]
}

fn map_key_string(k: &str) -> Option<Key> {
    match k.to_lowercase().as_str() {
        "return" | "enter" => Some(Key::Return),
        "tab" => Some(Key::Tab),
        "space" => Some(Key::Space),
        "backspace" => Some(Key::Backspace),
        "delete" => Some(Key::Delete),
        "escape" | "esc" => Some(Key::Escape),
        "up" | "arrowup" => Some(Key::UpArrow),
        "down" | "arrowdown" => Some(Key::DownArrow),
        "left" | "arrowleft" => Some(Key::LeftArrow),
        "right" | "arrowright" => Some(Key::RightArrow),
        "home" => Some(Key::Home),
        "end" => Some(Key::End),
        "pageup" => Some(Key::PageUp),
        "pagedown" => Some(Key::PageDown),
        "command" | "cmd" | "meta" | "super" => Some(Key::Meta),
        "control" | "ctrl" => Some(Key::Control),
        "alt" | "option" => Some(Key::Alt),
        "shift" => Some(Key::Shift),
        s if s.chars().count() == 1 => s.chars().next().map(Key::Unicode),
        _ => None,
    }
}

fn sync_mouse_move(x: i32, y: i32) -> Result<serde_json::Value, String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo init error: {}", e))?;
    enigo.move_mouse(x, y, Coordinate::Abs).map_err(|e| format!("Failed to move mouse: {}", e))?;
    Ok(json!({ "status": "success", "x": x, "y": y }))
}

fn sync_mouse_click(args: &serde_json::Value) -> Result<serde_json::Value, String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo init error: {}", e))?;

    if let (Some(x), Some(y)) = (
        args.get("x").and_then(|v| v.as_i64()),
        args.get("y").and_then(|v| v.as_i64()),
    ) {
        enigo.move_mouse(x as i32, y as i32, Coordinate::Abs).map_err(|e| format!("Failed to move mouse: {}", e))?;
    }

    let button_str = args.get("button").and_then(|v| v.as_str()).unwrap_or("left");
    let target_button = match button_str {
        "right" => Button::Right,
        "middle" => Button::Middle,
        _ => Button::Left,
    };

    let click_type = args.get("click_type").and_then(|v| v.as_str()).unwrap_or("single");
    if click_type == "double" {
        enigo.button(target_button, Click).map_err(|e| format!("Click failed: {}", e))?;
        std::thread::sleep(Duration::from_millis(50));
        enigo.button(target_button, Click).map_err(|e| format!("Second click failed: {}", e))?;
    } else {
        enigo.button(target_button, Click).map_err(|e| format!("Click failed: {}", e))?;
    }

    Ok(json!({ "status": "success", "button": button_str, "click_type": click_type }))
}

fn sync_mouse_drag(start_x: i32, start_y: i32, end_x: i32, end_y: i32) -> Result<serde_json::Value, String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo init error: {}", e))?;
    enigo.move_mouse(start_x, start_y, Coordinate::Abs).map_err(|e| format!("Move failed: {}", e))?;
    enigo.button(Button::Left, Press).map_err(|e| format!("Press failed: {}", e))?;
    std::thread::sleep(Duration::from_millis(50));
    enigo.move_mouse(end_x, end_y, Coordinate::Abs).map_err(|e| format!("Drag failed: {}", e))?;
    std::thread::sleep(Duration::from_millis(50));
    enigo.button(Button::Left, Release).map_err(|e| format!("Release failed: {}", e))?;

    Ok(json!({ "status": "success", "from": [start_x, start_y], "to": [end_x, end_y] }))
}

fn sync_mouse_scroll(delta_y: i32, delta_x: i32) -> Result<serde_json::Value, String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo init error: {}", e))?;
    if delta_y != 0 {
        enigo.scroll(delta_y, Axis::Vertical).map_err(|e| format!("Vertical scroll failed: {}", e))?;
    }
    if delta_x != 0 {
        enigo.scroll(delta_x, Axis::Horizontal).map_err(|e| format!("Horizontal scroll failed: {}", e))?;
    }
    Ok(json!({ "status": "success", "delta_y": delta_y, "delta_x": delta_x }))
}

fn sync_type_text(text: &str) -> Result<serde_json::Value, String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo init error: {}", e))?;
    enigo.text(text).map_err(|e| format!("Failed to type text: {}", e))?;
    Ok(json!({ "status": "success", "typed_length": text.chars().count() }))
}

fn sync_press_key(key_str: &str, modifiers: &[String]) -> Result<serde_json::Value, String> {
    let target_key = map_key_string(key_str).ok_or_else(|| format!("Unknown key: {}", key_str))?;
    let mut modifier_keys = Vec::new();
    for m in modifiers {
        if let Some(mk) = map_key_string(m) {
            modifier_keys.push(mk);
        }
    }

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo init error: {}", e))?;

    for m in &modifier_keys {
        let _ = enigo.key(*m, Press);
    }

    enigo.key(target_key, Click).map_err(|e| format!("Failed to press key: {}", e))?;

    for m in modifier_keys.iter().rev() {
        let _ = enigo.key(*m, Release);
    }

    Ok(json!({ "status": "success", "key": key_str }))
}

/// Resolve the browser_runner.mjs script path.
/// Tries (in order): env override, exe-adjacent resource, src-tauri relative, cwd fallbacks.
fn resolve_browser_runner_path() -> Option<std::path::PathBuf> {
    // 1. Explicit env override
    if let Ok(p) = std::env::var("KOKI_BROWSER_RUNNER") {
        let path = std::path::PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }

    // 2. Next to the compiled exe (production bundle)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            for candidate in [
                dir.join("scripts/browser_runner.mjs"),
                dir.join("../Resources/scripts/browser_runner.mjs"),
                dir.join("../../scripts/browser_runner.mjs"),
            ] {
                if candidate.exists() {
                    return Some(candidate);
                }
            }
        }
    }

    // 3. Relative to CARGO_MANIFEST_DIR at compile time (dev builds)
    let manifest = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidate = manifest.join("scripts/browser_runner.mjs");
    if candidate.exists() {
        return Some(candidate);
    }

    // 4. Relative to current working directory (fallback)
    for cwd_candidate in [
        std::path::PathBuf::from("src-tauri/scripts/browser_runner.mjs"),
        std::path::PathBuf::from("scripts/browser_runner.mjs"),
    ] {
        if cwd_candidate.exists() {
            return cwd_candidate.canonicalize().ok();
        }
    }

    None
}

pub async fn execute_tool(name: &str, args: &serde_json::Value) -> Result<serde_json::Value, String> {
    match name {
        "take_screenshot" => {
            let temp_path = std::env::temp_dir().join(format!("koki_screenshot_{}.png", Instant::now().elapsed().as_nanos()));
            let temp_str = temp_path.to_string_lossy().to_string();

            #[cfg(target_os = "macos")]
            {
                let mut cmd = tokio::process::Command::new("screencapture");
                cmd.arg("-x");
                if let Some(region) = args.get("region") {
                    if let (Some(x), Some(y), Some(w), Some(h)) = (
                        region.get("x").and_then(|v| v.as_i64()),
                        region.get("y").and_then(|v| v.as_i64()),
                        region.get("width").and_then(|v| v.as_i64()),
                        region.get("height").and_then(|v| v.as_i64()),
                    ) {
                        cmd.arg(format!("-R{},{},{},{}", x, y, w, h));
                    }
                }
                cmd.arg(&temp_str);
                let output = cmd.output().await.map_err(|e| format!("Failed to run screencapture: {}", e))?;
                if !output.status.success() {
                    return Err(format!("screencapture failed: {}", String::from_utf8_lossy(&output.stderr)));
                }
            }

            #[cfg(not(target_os = "macos"))]
            {
                return Err("Screenshot currently supported natively on macOS".to_string());
            }

            let bytes = fs::read(&temp_path).map_err(|e| format!("Failed to read screenshot output: {}", e))?;
            let _ = fs::remove_file(&temp_path);
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            let data_uri = format!("data:image/png;base64,{}", b64);

            Ok(json!({
                "status": "success",
                "image_data_uri": data_uri,
                "byte_size": bytes.len(),
            }))
        }
        "mouse_move" => {
            let x = args.get("x").and_then(|v| v.as_i64()).ok_or("Missing parameter 'x'")? as i32;
            let y = args.get("y").and_then(|v| v.as_i64()).ok_or("Missing parameter 'y'")? as i32;
            sync_mouse_move(x, y)
        }
        "mouse_click" => {
            sync_mouse_click(args)
        }
        "mouse_drag" => {
            let start_x = args.get("start_x").and_then(|v| v.as_i64()).ok_or("Missing 'start_x'")? as i32;
            let start_y = args.get("start_y").and_then(|v| v.as_i64()).ok_or("Missing 'start_y'")? as i32;
            let end_x = args.get("end_x").and_then(|v| v.as_i64()).ok_or("Missing 'end_x'")? as i32;
            let end_y = args.get("end_y").and_then(|v| v.as_i64()).ok_or("Missing 'end_y'")? as i32;
            sync_mouse_drag(start_x, start_y, end_x, end_y)
        }
        "mouse_scroll" => {
            let delta_y = args.get("delta_y").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let delta_x = args.get("delta_x").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            sync_mouse_scroll(delta_y, delta_x)
        }
        "type_text" => {
            let text = args.get("text").and_then(|v| v.as_str()).ok_or("Missing parameter 'text'")?;
            sync_type_text(text)
        }
        "press_key" => {
            let key_str = args.get("key").and_then(|v| v.as_str()).ok_or("Missing parameter 'key'")?;
            let mut modifiers = Vec::new();
            if let Some(mods) = args.get("modifiers").and_then(|v| v.as_array()) {
                for m in mods {
                    if let Some(m_str) = m.as_str() {
                        modifiers.push(m_str.to_string());
                    }
                }
            }
            sync_press_key(key_str, &modifiers)
        }
        "execute_shell_command" => {
            let command = args.get("command").and_then(|v| v.as_str()).ok_or("Missing 'command'")?;
            let timeout_secs = args.get("timeout_seconds").and_then(|v| v.as_u64()).unwrap_or(30);

            let mut cmd = if cfg!(target_os = "windows") {
                let mut c = tokio::process::Command::new("cmd");
                c.args(["/C", command]);
                c
            } else {
                let mut c = tokio::process::Command::new("zsh");
                c.args(["-c", command]);
                c
            };

            if let Some(cwd) = args.get("cwd").and_then(|v| v.as_str()) {
                cmd.current_dir(cwd);
            }

            let t_start = Instant::now();
            let execution = tokio::time::timeout(Duration::from_secs(timeout_secs), cmd.output()).await;

            match execution {
                Ok(Ok(output)) => {
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    Ok(json!({
                        "exit_code": output.status.code().unwrap_or(-1),
                        "success": output.status.success(),
                        "stdout": stdout,
                        "stderr": stderr,
                        "duration_ms": t_start.elapsed().as_millis() as u64
                    }))
                }
                Ok(Err(e)) => Err(format!("Failed to execute command: {}", e)),
                Err(_) => Err(format!("Command timed out after {} seconds", timeout_secs)),
            }
        }
        "browser_navigate" => {
            let url = args.get("url").and_then(|v| v.as_str()).ok_or("Missing parameter 'url'")?;
            let timeout = args.get("timeout").and_then(|v| v.as_u64()).unwrap_or(30000);

            let payload = json!({
                "action": "navigate",
                "url": url,
                "timeout": timeout
            });

            let script_path = resolve_browser_runner_path()
                .ok_or_else(|| "browser_runner.mjs not found. Set KOKI_BROWSER_RUNNER env var or ensure scripts/ is bundled.".to_string())?;
            let mut cmd = tokio::process::Command::new("node");
            cmd.arg(&script_path).arg(payload.to_string());

            let output = cmd.output().await.map_err(|e| format!("Failed to spawn node for browser navigation: {}", e))?;
            if !output.status.success() {
                let err_text = String::from_utf8_lossy(&output.stderr).to_string();
                return Err(format!("Browser error: {}", err_text));
            }

            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let parsed = serde_json::from_str::<serde_json::Value>(&stdout)
                .map_err(|e| format!("Failed to parse browser output (raw: {}): {}", stdout, e))?;

            Ok(parsed)
        }
        "browser_screenshot" => {
            let url = args.get("url").and_then(|v| v.as_str()).ok_or("Missing parameter 'url'")?;
            let full_page = args.get("full_page").and_then(|v| v.as_bool()).unwrap_or(false);

            let payload = json!({
                "action": "screenshot",
                "url": url,
                "fullPage": full_page
            });

            let script_path = resolve_browser_runner_path()
                .ok_or_else(|| "browser_runner.mjs not found.".to_string())?;
            let mut cmd = tokio::process::Command::new("node");
            cmd.arg(&script_path).arg(payload.to_string());

            let output = cmd.output().await.map_err(|e| format!("Failed to spawn node for browser screenshot: {}", e))?;
            if !output.status.success() {
                let err_text = String::from_utf8_lossy(&output.stderr).to_string();
                return Err(format!("Browser screenshot error: {}", err_text));
            }

            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let parsed = serde_json::from_str::<serde_json::Value>(&stdout)
                .map_err(|e| format!("Failed to parse browser output: {}", e))?;

            Ok(parsed)
        }
        "browser_action" => {
            let action = args.get("action").and_then(|v| v.as_str()).ok_or("Missing parameter 'action'")?;
            let url = args.get("url").and_then(|v| v.as_str()).ok_or("Missing parameter 'url'")?;

            let mut payload = json!({
                "action": action,
                "url": url
            });

            if let Some(sel) = args.get("selector").and_then(|v| v.as_str()) {
                payload["selector"] = json!(sel);
            }
            if let Some(txt) = args.get("text").and_then(|v| v.as_str()) {
                payload["text"] = json!(txt);
            }
            if let Some(scr) = args.get("script").and_then(|v| v.as_str()) {
                payload["script"] = json!(scr);
            }

            let script_path = resolve_browser_runner_path()
                .ok_or_else(|| "browser_runner.mjs not found.".to_string())?;
            let mut cmd = tokio::process::Command::new("node");
            cmd.arg(&script_path).arg(payload.to_string());

            let output = cmd.output().await.map_err(|e| format!("Failed to spawn node for browser action: {}", e))?;
            if !output.status.success() {
                let err_text = String::from_utf8_lossy(&output.stderr).to_string();
                return Err(format!("Browser action error: {}", err_text));
            }

            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let parsed = serde_json::from_str::<serde_json::Value>(&stdout)
                .map_err(|e| format!("Failed to parse browser output: {}", e))?;

            Ok(parsed)
        }
        "read_file" => {
            let path_str = args.get("path").and_then(|v| v.as_str()).ok_or("Missing parameter 'path'")?;
            let max_lines = args.get("max_lines").and_then(|v| v.as_u64()).unwrap_or(500) as usize;

            let path = Path::new(path_str);
            if !path.exists() {
                return Err(format!("File does not exist: {}", path_str));
            }

            let content = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;
            let lines = content.lines().take(max_lines).collect::<Vec<_>>().join("\n");
            let total_lines = content.lines().count();

            Ok(json!({
                "path": path_str,
                "content": lines,
                "lines_shown": lines.lines().count(),
                "total_lines": total_lines
            }))
        }
        "write_file" => {
            let path_str = args.get("path").and_then(|v| v.as_str()).ok_or("Missing parameter 'path'")?;
            let content = args.get("content").and_then(|v| v.as_str()).ok_or("Missing parameter 'content'")?;

            let path = Path::new(path_str);
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directories: {}", e))?;
            }

            fs::write(path, content).map_err(|e| format!("Failed to write file: {}", e))?;

            Ok(json!({
                "status": "success",
                "path": path_str,
                "bytes_written": content.len()
            }))
        }
        "append_file" => {
            let path_str = args.get("path").and_then(|v| v.as_str()).ok_or("Missing parameter 'path'")?;
            let content = args.get("content").and_then(|v| v.as_str()).ok_or("Missing parameter 'content'")?;

            let path = Path::new(path_str);
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directories: {}", e))?;
            }

            let mut file = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)
                .map_err(|e| format!("Failed to open file for append: {}", e))?;

            file.write_all(content.as_bytes()).map_err(|e| format!("Failed to append to file: {}", e))?;

            Ok(json!({
                "status": "success",
                "path": path_str,
                "bytes_appended": content.len()
            }))
        }
        "clipboard_read" => {
            #[cfg(target_os = "macos")]
            {
                let output = tokio::process::Command::new("pbpaste")
                    .output()
                    .await
                    .map_err(|e| format!("Failed to run pbpaste: {}", e))?;
                let text = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(json!({ "text": text }))
            }
            #[cfg(not(target_os = "macos"))]
            {
                Err("Clipboard read currently supported on macOS".to_string())
            }
        }
        "clipboard_write" => {
            let text = args.get("text").and_then(|v| v.as_str()).ok_or("Missing parameter 'text'")?;

            #[cfg(target_os = "macos")]
            {
                use std::process::Stdio;
                use tokio::io::AsyncWriteExt;
                let mut child = tokio::process::Command::new("pbcopy")
                    .stdin(Stdio::piped())
                    .spawn()
                    .map_err(|e| format!("Failed to spawn pbcopy: {}", e))?;

                if let Some(mut stdin) = child.stdin.take() {
                    stdin.write_all(text.as_bytes()).await.map_err(|e| format!("Failed to write to pbcopy: {}", e))?;
                }
                child.wait().await.map_err(|e| format!("Failed to complete pbcopy: {}", e))?;
                Ok(json!({ "status": "success", "length": text.len() }))
            }
            #[cfg(not(target_os = "macos"))]
            {
                Err("Clipboard write currently supported on macOS".to_string())
            }
        }
        "open_app_or_url" => {
            let target = args.get("target").and_then(|v| v.as_str()).ok_or("Missing parameter 'target'")?;

            #[cfg(target_os = "macos")]
            {
                let mut cmd = tokio::process::Command::new("open");
                if !target.starts_with("http://") && !target.starts_with("https://") && !target.starts_with('/') {
                    cmd.arg("-a").arg(target);
                } else {
                    cmd.arg(target);
                }
                let output = cmd.output().await.map_err(|e| format!("Failed to open target: {}", e))?;
                if !output.status.success() {
                    return Err(format!("Failed to open {}: {}", target, String::from_utf8_lossy(&output.stderr)));
                }
                Ok(json!({ "status": "success", "opened": target }))
            }
            #[cfg(not(target_os = "macos"))]
            {
                Err("open_app_or_url supported on macOS".to_string())
            }
        }
        "get_system_metrics" => {
            let mut sys = System::new_all();
            sys.refresh_all();
            let total_mem = sys.total_memory() / (1024 * 1024);
            let used_mem = sys.used_memory() / (1024 * 1024);
            let mem_pct = if total_mem > 0 { (used_mem as f32 / total_mem as f32) * 100.0 } else { 0.0 };
            let cpu_usage = sys.global_cpu_usage();

            Ok(json!({
                "os": System::name().unwrap_or_else(|| "Unknown".into()),
                "os_version": System::os_version().unwrap_or_else(|| "".into()),
                "cpu_count": sys.cpus().len(),
                "cpu_usage_percent": cpu_usage,
                "total_memory_mb": total_mem,
                "used_memory_mb": used_mem,
                "memory_usage_percent": mem_pct
            }))
        }
        "get_current_time" => {
            let now = chrono::Local::now();
            Ok(json!({
                "local_time": now.format("%Y-%m-%d %H:%M:%S %Z").to_string(),
                "utc_time": chrono::Utc::now().to_rfc3339(),
                "timestamp_ms": now.timestamp_millis()
            }))
        }
        "calculate_expression" => {
            let expr = args.get("expression").and_then(|v| v.as_str()).unwrap_or("0");
            let sanitized = expr.replace(' ', "");
            if let Some(pos) = sanitized.find('+') {
                let (a, b) = sanitized.split_at(pos);
                let num_a = a.parse::<f64>().map_err(|e| e.to_string())?;
                let num_b = b[1..].parse::<f64>().map_err(|e| e.to_string())?;
                return Ok(json!({ "result": num_a + num_b }));
            }
            if let Some(pos) = sanitized.find('-') {
                if pos > 0 {
                    let (a, b) = sanitized.split_at(pos);
                    let num_a = a.parse::<f64>().map_err(|e| e.to_string())?;
                    let num_b = b[1..].parse::<f64>().map_err(|e| e.to_string())?;
                    return Ok(json!({ "result": num_a - num_b }));
                }
            }
            if let Some(pos) = sanitized.find('*') {
                let (a, b) = sanitized.split_at(pos);
                let num_a = a.parse::<f64>().map_err(|e| e.to_string())?;
                let num_b = b[1..].parse::<f64>().map_err(|e| e.to_string())?;
                return Ok(json!({ "result": num_a * num_b }));
            }
            if let Some(pos) = sanitized.find('/') {
                let (a, b) = sanitized.split_at(pos);
                let num_a = a.parse::<f64>().map_err(|e| e.to_string())?;
                let num_b = b[1..].parse::<f64>().map_err(|e| e.to_string())?;
                if num_b == 0.0 {
                    return Err("Division by zero".to_string());
                }
                return Ok(json!({ "result": num_a / num_b }));
            }
            if let Ok(num) = sanitized.parse::<f64>() {
                return Ok(json!({ "result": num }));
            }
            Err("Expression evaluation failed".to_string())
        }
        "list_directory" => {
            let path_str = args.get("path").and_then(|v| v.as_str()).unwrap_or(".");
            let path = Path::new(path_str);
            if !path.exists() {
                return Err(format!("Path does not exist: {}", path_str));
            }
            let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
            let mut results = Vec::new();
            for entry in entries.flatten() {
                let file_type = entry.file_type().map_err(|e| e.to_string())?;
                let name = entry.file_name().to_string_lossy().to_string();
                results.push(json!({
                    "name": name,
                    "is_dir": file_type.is_dir(),
                    "is_file": file_type.is_file()
                }));
            }
            Ok(json!({ "path": path_str, "entries": results }))
        }
        _ => Err(format!("Unknown tool: {}", name)),
    }
}
