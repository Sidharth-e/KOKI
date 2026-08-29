pub mod agent;
pub mod commands;
pub mod models;

use agent::AgentEngine;
use commands::agent_cmds::AgentState;
use models::ModelConfig;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::RwLock;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AgentState {
            engine: AgentEngine::default(),
            active_config: Arc::new(RwLock::new(ModelConfig::default())),
        })
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let size = monitor.size();
                    let _ = window.set_size(tauri::Size::Physical(size.clone()));
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: 0, y: 0 }));
                }

                let _ = window.set_resizable(false);

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
                            let _: () = msg_send![ns_window, setMovable: false];
                            let _: () = msg_send![ns_window, setMovableByWindowBackground: false];
                        }
                    }
                }

                let win_clone = window.clone();
                std::thread::spawn(move || {
                    use std::sync::atomic::Ordering;
                    use crate::commands::system_cmds::WINDOW_MODE;

                    let mut currently_ignoring = false;
                    loop {
                        std::thread::sleep(std::time::Duration::from_millis(30));
                        let mode = WINDOW_MODE.load(Ordering::Relaxed);
                        if mode == 2 {
                            if currently_ignoring {
                                let _ = win_clone.set_ignore_cursor_events(false);
                                currently_ignoring = false;
                            }
                            continue;
                        }

                        #[cfg(target_os = "macos")]
                        {
                            use objc2_app_kit::NSEvent;
                            use objc2_foundation::NSPoint;

                            let mouse_pos: NSPoint = unsafe { NSEvent::mouseLocation() };
                            let active_width = if mode == 1 { 760.0 } else { 80.0 };

                            if let Ok(Some(monitor)) = win_clone.current_monitor() {
                                let scale_factor = monitor.scale_factor();
                                let screen_w = monitor.size().width as f64 / scale_factor;
                                let interactive_min_x = screen_w - active_width;

                                let should_capture = mouse_pos.x >= interactive_min_x;
                                let should_ignore = !should_capture;

                                if should_ignore != currently_ignoring {
                                    let _ = win_clone.set_ignore_cursor_events(should_ignore);
                                    currently_ignoring = should_ignore;
                                }
                            }
                        }
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::agent_cmds::get_model_config,
            commands::agent_cmds::save_model_config,
            commands::agent_cmds::test_model_connection,
            commands::agent_cmds::list_models_for_config,
            commands::agent_cmds::get_neo4j_config,
            commands::agent_cmds::save_neo4j_config,
            commands::agent_cmds::test_neo4j_connection,
            commands::agent_cmds::ask_assistant,
            commands::agent_cmds::get_available_tools,
            commands::agent_cmds::run_tool_direct,
            commands::agent_cmds::get_graph_lineage,
            commands::agent_cmds::check_neo4j_status,
            commands::agent_cmds::spawn_subagent,
            commands::system_cmds::set_window_mode,
            commands::system_cmds::get_system_metrics,
            commands::system_cmds::check_ollama_status,
            commands::system_cmds::list_ollama_models
        ])
        .run(tauri::generate_context!())
        .expect("error while running koki assistant application");
}
