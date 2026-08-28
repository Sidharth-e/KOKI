pub mod agent;
pub mod commands;
pub mod models;

use agent::AgentEngine;
use commands::agent_cmds::AgentState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AgentState {
            engine: AgentEngine::default(),
        })
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let size = monitor.size();
                    let _ = window.set_size(tauri::Size::Physical(size.clone()));
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: 0, y: 0 }));
                }

                #[cfg(target_os = "macos")]
                {
                    use objc2::msg_send;
                    use objc2::runtime::AnyObject;
                    use objc2_app_kit::NSColor;

                    if let Ok(ns_win_ptr) = window.ns_window() {
                        unsafe {
                            let ns_window = ns_win_ptr as *mut AnyObject;
                            let clear_color = NSColor::clearColor();
                            let _: () = msg_send![ns_window, setBackgroundColor: &*clear_color];
                            let _: () = msg_send![ns_window, setOpaque: false];
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::agent_cmds::ask_assistant,
            commands::agent_cmds::get_available_tools,
            commands::agent_cmds::run_tool_direct,
            commands::system_cmds::get_system_metrics,
            commands::system_cmds::check_ollama_status,
            commands::system_cmds::list_ollama_models
        ])
        .run(tauri::generate_context!())
        .expect("error while running koki assistant application");
}
