use crate::agent::graph_memory::GraphMemoryManager;
use crate::agent::provider::ModelFactory;
use crate::agent::{tools, AgentEngine};
use crate::models::{
    AgentRequest, AgentResponse, LineageGraphPayload, ModelConfig, Neo4jConfig, Neo4jStatus,
    OllamaModel, SubAgentExecutionResult, SubAgentSpawnRequest,
};
use std::sync::Arc;
use tauri::{command, AppHandle, State};
use tokio::sync::RwLock;

pub struct AgentState {
    pub engine: AgentEngine,
    pub active_config: Arc<RwLock<ModelConfig>>,
}

#[command]
pub async fn get_model_config(
    state: State<'_, AgentState>,
) -> Result<ModelConfig, String> {
    let conf = state.active_config.read().await;
    Ok(conf.clone())
}

#[command]
pub async fn save_model_config(
    state: State<'_, AgentState>,
    config: ModelConfig,
) -> Result<ModelConfig, String> {
    let mut conf = state.active_config.write().await;
    *conf = config.clone();
    Ok(config)
}

#[command]
pub async fn test_model_connection(
    state: State<'_, AgentState>,
    config: Option<ModelConfig>,
) -> Result<bool, String> {
    let conf = match config {
        Some(c) => c,
        None => state.active_config.read().await.clone(),
    };
    ModelFactory::check_health(&conf).await
}

#[command]
pub async fn list_models_for_config(
    state: State<'_, AgentState>,
    config: Option<ModelConfig>,
) -> Result<Vec<OllamaModel>, String> {
    let conf = match config {
        Some(c) => c,
        None => state.active_config.read().await.clone(),
    };
    ModelFactory::list_models(&conf).await
}

#[command]
pub async fn get_neo4j_config(
    state: State<'_, AgentState>,
) -> Result<Neo4jConfig, String> {
    Ok(state.engine.get_neo4j_config().await)
}

#[command]
pub async fn save_neo4j_config(
    state: State<'_, AgentState>,
    config: Neo4jConfig,
) -> Result<Neo4jStatus, String> {
    Ok(state.engine.update_neo4j_config(config).await)
}

#[command]
pub async fn test_neo4j_connection(
    config: Neo4jConfig,
) -> Result<Neo4jStatus, String> {
    Ok(GraphMemoryManager::test_config(&config).await)
}

#[command]
pub async fn ask_assistant(
    app: AppHandle,
    state: State<'_, AgentState>,
    session_id: String,
    mut request: AgentRequest,
) -> Result<AgentResponse, String> {
    if request.config.is_none() {
        let active = state.active_config.read().await.clone();
        request.config = Some(active);
    }
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
    mut request: SubAgentSpawnRequest,
) -> Result<SubAgentExecutionResult, String> {
    if request.config.is_none() {
        let active = state.active_config.read().await.clone();
        request.config = Some(active);
    }
    state.engine.spawn_subagent(&app, request).await
}
