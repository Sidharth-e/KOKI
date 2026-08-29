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
    Openrouter,
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
        Self {
            id: "default".to_string(),
            name: "Default Profile".to_string(),
            provider: ProviderType::OllamaLocal,
            mode: "local".to_string(),
            endpoint: "http://127.0.0.1:11434".to_string(),
            api_key: None,
            model_name: "gemma4:31b".to_string(),
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

fn default_neo4j_uri() -> String {
    "127.0.0.1:7687".to_string()
}

fn default_neo4j_user() -> String {
    "neo4j".to_string()
}

fn default_neo4j_pass() -> String {
    "AvoHarness2026!SecureGraph".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Neo4jConfig {
    #[serde(default = "default_neo4j_uri")]
    pub uri: String,
    #[serde(default = "default_neo4j_user")]
    pub user: String,
    #[serde(default = "default_neo4j_pass")]
    pub pass: String,
    pub database: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

impl Default for Neo4jConfig {
    fn default() -> Self {
        Self {
            uri: "127.0.0.1:7687".to_string(),
            user: "neo4j".to_string(),
            pass: "AvoHarness2026!SecureGraph".to_string(),
            database: Some("neo4j".to_string()),
            enabled: true,
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

