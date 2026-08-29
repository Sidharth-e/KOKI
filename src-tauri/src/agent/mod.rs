pub mod avo_loop;
pub mod graph_memory;
pub mod provider;
pub mod subagents;
pub mod supervisor;
pub mod tools;

use crate::models::{
    AgentRequest, AgentResponse, LineageGraphPayload, ModelConfig, Neo4jConfig, Neo4jStatus,
    OllamaConfig, SubAgentExecutionResult, SubAgentSpawnRequest,
};
use avo_loop::AvoEngine;
use graph_memory::GraphMemoryManager;
use reqwest::Client;
use std::sync::Arc;
use subagents::{SubAgentRole, SubAgentRunner};
use supervisor::SupervisorAgent;
use tauri::AppHandle;

pub struct AgentEngine {
    pub client: Client,
    pub ollama_url: String,
    pub graph_memory: Arc<GraphMemoryManager>,
    pub supervisor: Arc<SupervisorAgent>,
    pub subagent_runner: Arc<SubAgentRunner>,
    pub avo_engine: Arc<AvoEngine>,
}

impl Default for AgentEngine {
    fn default() -> Self {
        let model_config = ModelConfig::default();
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .unwrap_or_default();
        let ollama_url = model_config.endpoint;
        let graph_memory = Arc::new(GraphMemoryManager::new(None));
        let subagent_runner = Arc::new(SubAgentRunner::new(
            client.clone(),
            ollama_url.clone(),
            Arc::clone(&graph_memory),
        ));
        let supervisor = Arc::new(SupervisorAgent::new(
            Arc::clone(&graph_memory),
            Arc::clone(&subagent_runner),
        ));
        let avo_engine = Arc::new(AvoEngine::new(
            client.clone(),
            ollama_url.clone(),
            Arc::clone(&graph_memory),
        ));

        Self {
            client,
            ollama_url,
            graph_memory,
            supervisor,
            subagent_runner,
            avo_engine,
        }
    }
}

impl AgentEngine {
    pub fn new(ollama_url: Option<String>, neo4j_config: Option<Neo4jConfig>) -> Self {
        let model_config = ModelConfig::default();
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .unwrap_or_default();
        let ollama_url = ollama_url.unwrap_or(model_config.endpoint);
        let graph_memory = Arc::new(GraphMemoryManager::new(neo4j_config));
        let subagent_runner = Arc::new(SubAgentRunner::new(
            client.clone(),
            ollama_url.clone(),
            Arc::clone(&graph_memory),
        ));
        let supervisor = Arc::new(SupervisorAgent::new(
            Arc::clone(&graph_memory),
            Arc::clone(&subagent_runner),
        ));
        let avo_engine = Arc::new(AvoEngine::new(
            client.clone(),
            ollama_url.clone(),
            Arc::clone(&graph_memory),
        ));

        Self {
            client,
            ollama_url,
            graph_memory,
            supervisor,
            subagent_runner,
            avo_engine,
        }
    }

    pub async fn run_agent_prompt(
        &self,
        app: &AppHandle,
        session_id: &str,
        req: AgentRequest,
    ) -> Result<AgentResponse, String> {
        let _ = self.graph_memory.init_schema().await;
        self.avo_engine.run_avo_loop(app, session_id, req, 3).await
    }

    pub async fn spawn_subagent(
        &self,
        app: &AppHandle,
        req: SubAgentSpawnRequest,
    ) -> Result<SubAgentExecutionResult, String> {
        let role = match req.role.to_lowercase().as_str() {
            "planner" => SubAgentRole::Planner,
            "variation_worker" | "worker" => SubAgentRole::VariationWorker,
            "evaluator" => SubAgentRole::Evaluator,
            "diagnoser" => SubAgentRole::Diagnoser,
            other => SubAgentRole::Custom(other.to_string()),
        };

        let model = req.model.unwrap_or_else(|| {
            req.config
                .as_ref()
                .map(|c| c.model_name.clone())
                .unwrap_or_else(|| OllamaConfig::default().model)
        });

        self.supervisor
            .spawn_agent(
                app,
                &req.session_id,
                role,
                &req.goal,
                req.context.as_deref(),
                &model,
                req.config.as_ref(),
                true,
            )
            .await
    }

    pub async fn get_lineage(&self, session_id: &str) -> Result<LineageGraphPayload, String> {
        self.graph_memory.get_session_lineage(session_id).await
    }

    pub async fn check_neo4j_status(&self) -> Neo4jStatus {
        self.graph_memory.check_status().await
    }
}
