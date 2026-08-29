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
    pub config: Option<ModelConfig>,
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

use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    OllamaLocal,
    OllamaCloud,
    Openai,
    Openrouter,
    Anthropic,
    Custom,
}

impl Default for ProviderType {
    fn default() -> Self {
        ProviderType::OllamaLocal
    }
}

fn default_config_id() -> String {
    "default".to_string()
}

fn default_config_name() -> String {
    "Default Profile".to_string()
}

fn default_mode() -> String {
    "local".to_string()
}

fn default_endpoint() -> String {
    "http://127.0.0.1:11434".to_string()
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    #[serde(default = "default_config_id")]
    pub id: String,
    #[serde(default = "default_config_name")]
    pub name: String,
    #[serde(default)]
    pub provider: ProviderType,
    #[serde(default = "default_mode")]
    pub mode: String,
    #[serde(default = "default_endpoint")]
    pub endpoint: String,
    pub api_key: Option<String>,
    #[serde(default)]
    pub model_name: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub custom_headers: Option<HashMap<String, String>>,
    #[serde(default = "default_true")]
    pub is_active: bool,
}

impl Default for ModelConfig {
    fn default() -> Self {
        let mode = std::env::var("OLLAMA_MODE")
            .unwrap_or_else(|_| "local".to_string())
            .to_lowercase();

        let is_cloud = mode == "cloud";

        let api_key = std::env::var("OLLAMA_API_KEY")
            .or_else(|_| std::env::var("OLLAMA_CLOUD_API_KEY"))
            .or_else(|_| std::env::var("OPENAI_API_KEY"))
            .ok()
            .filter(|k| !k.trim().is_empty());

        let endpoint = if is_cloud {
            std::env::var("OLLAMA_CLOUD_URL")
                .or_else(|_| std::env::var("OLLAMA_URL"))
                .unwrap_or_else(|_| "https://api.ollama.com".to_string())
        } else {
            std::env::var("OLLAMA_LOCAL_URL")
                .or_else(|_| std::env::var("OLLAMA_URL"))
                .unwrap_or_else(|_| "http://127.0.0.1:11434".to_string())
        };

        let model_name = std::env::var("OLLAMA_MODEL")
            .or_else(|_| std::env::var("NEXT_PUBLIC_OLLAMA_MODEL"))
            .unwrap_or_default();

        let provider = if is_cloud {
            ProviderType::OllamaCloud
        } else {
            ProviderType::OllamaLocal
        };

        Self {
            id: "default".to_string(),
            name: "Default Profile".to_string(),
            provider,
            mode,
            endpoint,
            api_key,
            model_name,
            temperature: Some(0.3),
            max_tokens: None,
            custom_headers: None,
            is_active: true,
        }
    }
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
        let conf = ModelConfig::default();
        Self {
            mode: conf.mode,
            url: conf.endpoint,
            api_key: conf.api_key,
            model: conf.model_name,
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
    pub config: Option<ModelConfig>,
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

