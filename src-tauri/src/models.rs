use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub os_name: String,
    pub os_version: String,
    pub cpu_count: usize,
    pub cpu_usage_percent: f32,
    pub total_memory_mb: u64,
    pub used_memory_mb: u64,
    pub memory_usage_percent: f32,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub digest: String,
    pub modified_at: String,
    pub parameter_size: Option<String>,
    pub quantization_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaTagsResponse {
    pub models: Vec<OllamaModelItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModelItem {
    pub name: String,
    pub size: u64,
    pub digest: String,
    pub modified_at: String,
    pub details: Option<OllamaModelDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModelDetails {
    pub parameter_size: Option<String>,
    pub quantization_level: Option<String>,
    pub format: Option<String>,
    pub family: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRequest {
    pub prompt: String,
    pub model: String,
    pub system_prompt: Option<String>,
    pub temperature: Option<f32>,
    pub history: Option<Vec<ChatMessage>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallInfo {
    pub tool_name: String,
    pub arguments: serde_json::Value,
    pub result: serde_json::Value,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub response: String,
    pub model: String,
    pub tool_calls: Vec<ToolCallInfo>,
    pub total_duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunkPayload {
    pub session_id: String,
    pub chunk: String,
    pub is_done: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolStatusPayload {
    pub session_id: String,
    pub tool_name: String,
    pub status: String,
    pub input: serde_json::Value,
    pub output: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaConfig {
    pub mode: String,
    pub url: String,
    pub api_key: Option<String>,
    pub model: String,
}

impl Default for OllamaConfig {
    fn default() -> Self {
        let mode = std::env::var("OLLAMA_MODE")
            .unwrap_or_else(|_| "local".to_string())
            .to_lowercase();

        let api_key = std::env::var("OLLAMA_API_KEY")
            .or_else(|_| std::env::var("OLLAMA_CLOUD_API_KEY"))
            .ok()
            .filter(|k| !k.trim().is_empty());

        let url = if mode == "cloud" {
            std::env::var("OLLAMA_CLOUD_URL")
                .or_else(|_| std::env::var("OLLAMA_URL"))
                .unwrap_or_else(|_| "https://api.ollama.com".to_string())
        } else {
            std::env::var("OLLAMA_LOCAL_URL")
                .or_else(|_| std::env::var("OLLAMA_URL"))
                .unwrap_or_else(|_| "http://127.0.0.1:11434".to_string())
        };

        let model = std::env::var("OLLAMA_MODEL")
            .or_else(|_| std::env::var("NEXT_PUBLIC_OLLAMA_MODEL"))
            .unwrap_or_default();

        Self {
            mode,
            url,
            api_key,
            model,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Neo4jConfig {
    pub uri: String,
    pub user: String,
    pub pass: String,
    pub database: Option<String>,
}

impl Default for Neo4jConfig {
    fn default() -> Self {
        let uri = std::env::var("NEO4J_URI")
            .or_else(|_| std::env::var("NEO4J_URL"))
            .unwrap_or_else(|_| "127.0.0.1:7687".to_string());

        let user = std::env::var("NEO4J_USER")
            .or_else(|_| std::env::var("NEO4J_USERNAME"))
            .unwrap_or_else(|_| "neo4j".to_string());

        let pass = std::env::var("NEO4J_PASS")
            .or_else(|_| std::env::var("NEO4J_PASSWORD"))
            .unwrap_or_else(|_| "AvoHarness2026!SecureGraph".to_string());

        let database = std::env::var("NEO4J_DATABASE")
            .or_else(|_| std::env::var("NEO4J_DB"))
            .ok();

        Self {
            uri,
            user,
            pass,
            database,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Neo4jStatus {
    pub connected: bool,
    pub uri: String,
    pub node_count: u64,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageNodeInfo {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub iteration: Option<u32>,
    pub score: Option<f64>,
    pub data: serde_json::Value,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageEdgeInfo {
    pub source_id: String,
    pub target_id: String,
    pub relationship: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageGraphPayload {
    pub session_id: String,
    pub nodes: Vec<LineageNodeInfo>,
    pub edges: Vec<LineageEdgeInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupervisorEventPayload {
    pub session_id: String,
    pub event_type: String,
    pub iteration: u32,
    pub message: String,
    pub score: Option<f64>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubAgentSpawnRequest {
    pub session_id: String,
    pub role: String,
    pub goal: String,
    pub context: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubAgentExecutionResult {
    pub agent_id: String,
    pub role: String,
    pub output: String,
    pub tool_calls: Vec<ToolCallInfo>,
    pub duration_ms: u64,
    pub success: bool,
}

