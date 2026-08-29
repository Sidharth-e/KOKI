use crate::agent::graph_memory::GraphMemoryManager;
use crate::agent::provider::ModelFactory;
use crate::models::{ModelConfig, SubAgentExecutionResult};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use std::time::Instant;
use tauri::AppHandle;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SubAgentRole {
    Planner,
    VariationWorker,
    Evaluator,
    Diagnoser,
    Custom(String),
}

impl SubAgentRole {
    pub fn as_str(&self) -> &str {
        match self {
            SubAgentRole::Planner => "planner",
            SubAgentRole::VariationWorker => "variation_worker",
            SubAgentRole::Evaluator => "evaluator",
            SubAgentRole::Diagnoser => "diagnoser",
            SubAgentRole::Custom(s) => s.as_str(),
        }
    }

    pub fn system_prompt(&self) -> &'static str {
        match self {
            SubAgentRole::Planner => {
                "You are the AVO Planner Sub-Agent. Your role is to inspect the user goal, current lineage memory, and domain context, then produce a clear, concise, structured plan of action for the variation worker."
            }
            SubAgentRole::VariationWorker => {
                "You are the AVO Variation Operator Sub-Agent. Your role is to implement candidate solutions, write/edit code, or execute tool operations to fulfill the task based on the current lineage and supervisor directives."
            }
            SubAgentRole::Evaluator => {
                "You are the AVO Evaluator Sub-Agent. Your role is to critically analyze candidate outputs, execution results, error logs, and metrics. Provide an objective score between 0.0 and 1.0 and a brief diagnostic assessment."
            }
            SubAgentRole::Diagnoser => {
                "You are the AVO Diagnoser Sub-Agent. Your role is to diagnose failed candidate executions, identify exact root causes (e.g. syntax errors, wrong tool arguments, missing dependencies), and formulate targeted repair advice."
            }
            SubAgentRole::Custom(_) => {
                "You are an autonomous specialized sub-agent for the KOKI assistant system."
            }
        }
    }
}

pub struct SubAgentRunner {
    pub client: Client,
    pub ollama_url: String,
    pub graph_memory: Arc<GraphMemoryManager>,
}

impl SubAgentRunner {
    pub fn new(client: Client, ollama_url: String, graph_memory: Arc<GraphMemoryManager>) -> Self {
        Self {
            client,
            ollama_url,
            graph_memory,
        }
    }

    pub async fn execute(
        &self,
        app: &AppHandle,
        session_id: &str,
        role: SubAgentRole,
        goal: &str,
        context: Option<&str>,
        model: &str,
        config: Option<&ModelConfig>,
        enable_tools: bool,
    ) -> Result<SubAgentExecutionResult, String> {
        let start_time = Instant::now();
        let agent_id = format!("agent_{}_{}", role.as_str(), Uuid::new_v4().simple());

        let mut messages = Vec::new();
        messages.push(json!({
            "role": "system",
            "content": role.system_prompt()
        }));

        if let Some(ctx) = context {
            messages.push(json!({
                "role": "user",
                "content": format!("[Context & Memory]\n{}\n\n[Assigned Goal]\n{}", ctx, goal)
            }));
        } else {
            messages.push(json!({
                "role": "user",
                "content": goal
            }));
        }

        let effective_config = match config {
            Some(c) => {
                let mut cfg = c.clone();
                if !model.is_empty() {
                    cfg.model_name = model.to_string();
                }
                cfg
            }
            None => {
                let mut cfg = ModelConfig::default();
                if !model.is_empty() {
                    cfg.model_name = model.to_string();
                }
                cfg
            }
        };

        let (accumulated_text, tool_calls_executed) = ModelFactory::execute_stream_chat(
            app,
            session_id,
            &effective_config,
            messages,
            enable_tools,
            0.3,
        )
        .await?;

        let dur = start_time.elapsed().as_millis() as u64;
        let success = !accumulated_text.is_empty();

        let _ = self
            .graph_memory
            .add_subagent_run(
                session_id,
                &agent_id,
                role.as_str(),
                goal,
                &accumulated_text,
                dur,
                success,
            )
            .await;

        Ok(SubAgentExecutionResult {
            agent_id,
            role: role.as_str().to_string(),
            output: accumulated_text,
            tool_calls: tool_calls_executed,
            duration_ms: dur,
            success,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subagent_roles() {
        let planner = SubAgentRole::Planner;
        assert_eq!(planner.as_str(), "planner");
        assert!(planner.system_prompt().contains("Planner Sub-Agent"));

        let worker = SubAgentRole::VariationWorker;
        assert_eq!(worker.as_str(), "variation_worker");
        assert!(worker.system_prompt().contains("Variation Operator"));

        let evaluator = SubAgentRole::Evaluator;
        assert_eq!(evaluator.as_str(), "evaluator");
        assert!(evaluator.system_prompt().contains("Evaluator Sub-Agent"));

        let diagnoser = SubAgentRole::Diagnoser;
        assert_eq!(diagnoser.as_str(), "diagnoser");
        assert!(diagnoser.system_prompt().contains("Diagnoser Sub-Agent"));

        let custom = SubAgentRole::Custom("specialist".to_string());
        assert_eq!(custom.as_str(), "specialist");
    }
}
