use crate::agent::{tools, AgentEngine};
use crate::models::{AgentRequest, AgentResponse};
use tauri::{command, AppHandle, State};

pub struct AgentState {
    pub engine: AgentEngine,
}

#[command]
pub async fn ask_assistant(
    app: AppHandle,
    state: State<'_, AgentState>,
    session_id: String,
    request: AgentRequest,
) -> Result<AgentResponse, String> {
    state.engine.run_agent_prompt(&app, &session_id, request).await
}

#[command]
pub async fn get_available_tools() -> Result<Vec<tools::ToolDefinition>, String> {
    Ok(tools::get_available_tools_definitions())
}

#[command]
pub async fn run_tool_direct(
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<serde_json::Value, String> {
    tools::execute_tool(&tool_name, &arguments).await
}
