use crate::agent::graph_memory::GraphMemoryManager;
use crate::agent::provider::ModelFactory;
use crate::agent::subagents::SubAgentRunner;
use crate::agent::supervisor::SupervisorAgent;
use crate::models::{
    AgentRequest, AgentResponse, ModelConfig, StreamChunkPayload, SupervisorEventPayload,
};
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub struct AvoEngine {
    pub client: Client,
    pub ollama_url: String,
    pub graph_memory: Arc<GraphMemoryManager>,
    pub supervisor: Arc<SupervisorAgent>,
    pub subagent_runner: Arc<SubAgentRunner>,
}

impl AvoEngine {
    pub fn new(
        client: Client,
        ollama_url: String,
        graph_memory: Arc<GraphMemoryManager>,
    ) -> Self {
        let runner = Arc::new(SubAgentRunner::new(
            client.clone(),
            ollama_url.clone(),
            Arc::clone(&graph_memory),
        ));
        let supervisor = Arc::new(SupervisorAgent::new(
            Arc::clone(&graph_memory),
            Arc::clone(&runner),
        ));

        Self {
            client,
            ollama_url,
            graph_memory,
            supervisor,
            subagent_runner: runner,
        }
    }

    pub async fn run_avo_loop(
        &self,
        app: &AppHandle,
        session_id: &str,
        req: AgentRequest,
        max_iterations: u32,
    ) -> Result<AgentResponse, String> {
        let start_time = Instant::now();
        let task_id = format!("task_{}", Uuid::new_v4().simple());
        let mut all_tool_calls = Vec::new();

        let _ = self
            .graph_memory
            .add_task(session_id, &task_id, &req.prompt)
            .await;

        let _ = app.emit(
            "assistant-supervisor-event",
            SupervisorEventPayload {
                session_id: session_id.to_string(),
                event_type: "inspection".to_string(),
                iteration: 0,
                message: "Initializing NVIDIA AVO autonomous evolutionary search loop with Neo4j lineage graph"
                    .to_string(),
                score: None,
                data: Some(json!({ "task_id": task_id, "prompt": req.prompt })),
            },
        );

        let mut previous_candidate_id: Option<String> = None;
        let mut accumulated_final_response = String::new();
        let mut supervisor_hint: Option<String> = None;

        let effective_config = req.config.clone().unwrap_or_else(|| {
            let mut c = ModelConfig::default();
            if !req.model.is_empty() {
                c.model_name = req.model.clone();
            }
            c
        });

        for iteration in 1..=max_iterations {
            let _ = app.emit(
                "assistant-supervisor-event",
                SupervisorEventPayload {
                    session_id: session_id.to_string(),
                    event_type: "iteration_start".to_string(),
                    iteration,
                    message: format!("Executing AVO Variation Loop [Iteration {}/{}]", iteration, max_iterations),
                    score: None,
                    data: None,
                },
            );

            if iteration > 1 {
                supervisor_hint = self
                    .supervisor
                    .inspect_and_check_stagnation(app, session_id, iteration, 2)
                    .await
                    .unwrap_or(None);
            }

            let best_info = self
                .graph_memory
                .get_best_candidate(session_id)
                .await
                .unwrap_or(None);

            let candidate_id = format!("cand_{}_it{}", Uuid::new_v4().simple(), iteration);

            let mut system_prompt = format!(
                "You are the KOKI autonomous AI agent implementing NVIDIA's AVO (Agentic Variation Operators) architecture.\n\
                 Your task is to inspect the lineage history, evaluate feedback, and propose the best candidate action or solution.\n\
                 Iteration: {}/{}\n",
                iteration, max_iterations
            );

            if let Some(ref custom_sys) = req.system_prompt {
                if !custom_sys.trim().is_empty() {
                    system_prompt = format!("{}\n\n{}", custom_sys, system_prompt);
                }
            }

            if let Some(ref hint) = supervisor_hint {
                system_prompt.push_str(&format!("\n[SUPERVISOR INTERVENTION]\n{}\n", hint));
            }

            if let Some((best_id, best_score, best_proposal)) = best_info {
                system_prompt.push_str(&format!(
                    "\n[LINEAGE CONTEXT: Best previous candidate: {} with score {:.2}]\n{}\n",
                    best_id, best_score, best_proposal
                ));
            }

            let mut messages = Vec::new();
            messages.push(json!({
                "role": "system",
                "content": system_prompt
            }));

            if let Some(ref history) = req.history {
                for msg in history {
                    messages.push(json!({
                        "role": msg.role,
                        "content": msg.content
                    }));
                }
            }

            messages.push(json!({
                "role": "user",
                "content": req.prompt.clone()
            }));

            let (candidate_text, iteration_tool_calls) = ModelFactory::execute_stream_chat(
                app,
                session_id,
                &effective_config,
                messages,
                true,
                req.temperature.unwrap_or(0.3),
            )
            .await?;

            for tc in &iteration_tool_calls {
                all_tool_calls.push(tc.clone());
            }

            let _ = self
                .graph_memory
                .add_candidate(
                    session_id,
                    &task_id,
                    &candidate_id,
                    iteration,
                    &candidate_text,
                    previous_candidate_id.as_deref(),
                    Some("agentic_variation"),
                )
                .await;

            let eval_id = format!("eval_{}_it{}", Uuid::new_v4().simple(), iteration);
            let mut score = 0.5;
            let mut feedback = "Candidate generated and executed successfully.".to_string();

            let has_tool_errors = iteration_tool_calls.iter().any(|tc| {
                tc.result
                    .get("error")
                    .map(|e| !e.is_null())
                    .unwrap_or(false)
            });

            if has_tool_errors {
                score = 0.3;
                feedback = "Some tool executions resulted in errors.".to_string();
            } else if !iteration_tool_calls.is_empty() {
                score = 0.9;
                feedback = "Tools executed cleanly and grounded with environment.".to_string();
            } else if !candidate_text.trim().is_empty() {
                score = 0.85;
                feedback = "Direct response synthesized cleanly.".to_string();
            }

            let _ = self
                .graph_memory
                .add_evaluation(
                    session_id,
                    &eval_id,
                    &candidate_id,
                    score,
                    &feedback,
                    json!({ "tool_call_count": iteration_tool_calls.len(), "has_errors": has_tool_errors }),
                )
                .await;

            let _ = app.emit(
                "assistant-supervisor-event",
                SupervisorEventPayload {
                    session_id: session_id.to_string(),
                    event_type: "iteration_complete".to_string(),
                    iteration,
                    message: format!("Candidate [{}] evaluated with score {:.2}: {}", candidate_id, score, feedback),
                    score: Some(score),
                    data: Some(json!({ "candidate_id": candidate_id, "score": score })),
                },
            );

            accumulated_final_response = candidate_text;
            previous_candidate_id = Some(candidate_id);

            if score >= 0.85 || iteration == max_iterations {
                break;
            }
        }

        let _ = app.emit(
            "assistant-stream-chunk",
            StreamChunkPayload {
                session_id: session_id.to_string(),
                chunk: String::new(),
                is_done: true,
                error: None,
            },
        );

        let final_model = if !effective_config.model_name.is_empty() {
            effective_config.model_name
        } else {
            req.model
        };

        Ok(AgentResponse {
            response: accumulated_final_response,
            model: final_model,
            tool_calls: all_tool_calls,
            total_duration_ms: start_time.elapsed().as_millis() as u64,
        })
    }
}
