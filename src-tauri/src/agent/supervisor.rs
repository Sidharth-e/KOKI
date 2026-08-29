use crate::agent::graph_memory::GraphMemoryManager;
use crate::agent::subagents::{SubAgentRole, SubAgentRunner};
use crate::models::{SubAgentExecutionResult, SupervisorEventPayload};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub struct SupervisorAgent {
    graph_memory: Arc<GraphMemoryManager>,
    subagent_runner: Arc<SubAgentRunner>,
}

impl SupervisorAgent {
    pub fn new(
        graph_memory: Arc<GraphMemoryManager>,
        subagent_runner: Arc<SubAgentRunner>,
    ) -> Self {
        Self {
            graph_memory,
            subagent_runner,
        }
    }

    pub async fn inspect_and_check_stagnation(
        &self,
        app: &AppHandle,
        session_id: &str,
        iteration: u32,
        window_size: u32,
    ) -> Result<Option<String>, String> {
        let scores = self
            .graph_memory
            .get_recent_scores(session_id, window_size)
            .await
            .unwrap_or_default();

        if scores.len() < window_size as usize {
            return Ok(None);
        }

        let first = scores[0];
        let last = scores[scores.len() - 1];
        let delta = last - first;

        if delta <= 0.05 {
            let hint_id = format!("hint_{}", Uuid::new_v4().simple());
            let hint_text = format!(
                "SUPERVISION INTERVENTION: Trajectory plateau detected (score delta {:.2} across last {} variations). Pivot approach immediately: reconsider assumptions, verify environment state using tools, and explore alternative paths.",
                delta, window_size
            );

            let _ = self
                .graph_memory
                .add_supervisor_hint(session_id, &hint_id, iteration, &hint_text, None)
                .await;

            let _ = app.emit(
                "assistant-supervisor-event",
                SupervisorEventPayload {
                    session_id: session_id.to_string(),
                    event_type: "stagnation_detected".to_string(),
                    iteration,
                    message: hint_text.clone(),
                    score: Some(last),
                    data: None,
                },
            );

            return Ok(Some(hint_text));
        }

        Ok(None)
    }

    pub async fn spawn_agent(
        &self,
        app: &AppHandle,
        session_id: &str,
        role: SubAgentRole,
        goal: &str,
        context: Option<&str>,
        model: &str,
        enable_tools: bool,
    ) -> Result<SubAgentExecutionResult, String> {
        let _ = app.emit(
            "assistant-supervisor-event",
            SupervisorEventPayload {
                session_id: session_id.to_string(),
                event_type: "subagent_spawn".to_string(),
                iteration: 0,
                message: format!("Supervisor spawning sub-agent [{}]", role.as_str()),
                score: None,
                data: None,
            },
        );

        self.subagent_runner
            .execute(app, session_id, role, goal, context, model, enable_tools)
            .await
    }
}
