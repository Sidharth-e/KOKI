use crate::agent::{tools, AgentEngine};
use crate::models::{
    AgentRequest, AgentResponse, LineageGraphPayload, Neo4jStatus, SubAgentExecutionResult,
    SubAgentSpawnRequest,
};
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

#[command]
pub async fn get_graph_lineage(
    state: State<'_, AgentState>,
    session_id: String,
) -> Result<LineageGraphPayload, String> {
    state.engine.get_lineage(&session_id).await
}

#[command]
pub async fn check_neo4j_status(
    state: State<'_, AgentState>,
) -> Result<Neo4jStatus, String> {
    Ok(state.engine.check_neo4j_status().await)
}

#[command]
pub async fn spawn_subagent(
    app: AppHandle,
    state: State<'_, AgentState>,
    request: SubAgentSpawnRequest,
) -> Result<SubAgentExecutionResult, String> {
    state.engine.spawn_subagent(&app, request).await
}
