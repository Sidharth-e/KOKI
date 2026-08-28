pub mod agent;
pub mod commands;
pub mod models;

use agent::AgentEngine;
use commands::agent_cmds::AgentState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AgentState {
            engine: AgentEngine::default(),
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
