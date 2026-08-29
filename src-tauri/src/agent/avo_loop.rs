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
        let mut iteration_feedback: Option<String> = None;
        let mut last_tool_errors: Vec<String> = Vec::new();
        let mut last_score: Option<f64> = None;

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
                    .inspect_and_check_stagnation(
                        app,
                        session_id,
                        iteration,
                        2,
                        &last_tool_errors,
                        last_score,
                    )
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
                 Iteration: {}/{}\n\n\
                 CRITICAL RULES for tool use:\n\
                 (1) NEVER search ~/Library or other permission-restricted system folders — macOS TCC will deny access and waste iterations.\n\
                 (2) When looking for user projects, search standard locations first: ~/Documents, ~/Desktop, ~/Developer, ~/Source, ~/Projects, ~/Code, ~/Workspace.\n\
                 (3) After calling tools, you MUST synthesize the findings into a clear response for the user — a bare tool call with no explanation is a FAILED attempt.\n",
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
                if best_score >= 0.5 {
                    system_prompt.push_str(&format!(
                        "\n[LINEAGE CONTEXT: Best previous candidate: {} with score {:.2}]\n{}\n",
                        best_id, best_score, best_proposal
                    ));
                } else {
                    // Don't present a failing attempt as "best" — it encourages
                    // the model to repeat it. The concrete failure details are
                    // already provided in the iteration feedback message.
                    system_prompt.push_str(&format!(
                        "\n[LINEAGE CONTEXT: No successful candidate yet (best so far scored {:.2}). Previous attempts failed — see the feedback message below and change strategy.]\n",
                        best_score
                    ));
                }
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

            // Inject the previous iteration's outcome IN THE MESSAGE FLOW so the
            // model actually sees what failed and why (it cannot see system-prompt
            // footnotes as strongly as an instruction after the task).
            if let Some(ref fb) = iteration_feedback {
                messages.push(json!({
                    "role": "user",
                    "content": fb.clone()
                }));
            }

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

            let tool_errors: Vec<String> = iteration_tool_calls
                .iter()
                .filter_map(|tc| {
                    let result = &tc.result;

                    // Hard error: the tool itself failed to execute (spawn error,
                    // timeout, missing binary, etc.)
                    if let Some(e) = result.get("error").filter(|e| !e.is_null()) {
                        let msg = e.as_str().map(|s| s.to_string()).unwrap_or_else(|| e.to_string());
                        return Some(format!("- {} {} → {}", tc.tool_name, tc.arguments, msg));
                    }

                    // Soft failure: the tool ran but reported failure in-band.
                    // Shell commands return exit_code/success instead of "error",
                    // so a non-zero exit must be treated as a failed attempt or the
                    // loop will score it 0.9 and stop with an empty answer.
                    let failed = result.get("success").and_then(|s| s.as_bool()) == Some(false)
                        || result
                            .get("exit_code")
                            .and_then(|c| c.as_i64())
                            .map(|c| c != 0)
                            .unwrap_or(false);

                    if failed {
                        let stdout_tail: String = result
                            .get("stdout")
                            .and_then(|s| s.as_str())
                            .unwrap_or("")
                            .chars()
                            .take(300)
                            .collect();
                        let stderr_tail: String = result
                            .get("stderr")
                            .and_then(|s| s.as_str())
                            .unwrap_or("")
                            .chars()
                            .take(300)
                            .collect();
                        return Some(format!(
                            "- {} {} → exit_code={} stderr={} stdout_tail={}",
                            tc.tool_name,
                            tc.arguments,
                            result
                                .get("exit_code")
                                .and_then(|c| c.as_i64())
                                .unwrap_or(-1),
                            if stderr_tail.is_empty() { "(empty)" } else { &stderr_tail },
                            if stdout_tail.is_empty() { "(empty)" } else { &stdout_tail }
                        ));
                    }

                    None
                })
                .collect();
            let has_tool_errors = !tool_errors.is_empty();

            if has_tool_errors {
                score = 0.3;
                feedback = "Some tool executions resulted in errors.".to_string();
            } else if !iteration_tool_calls.is_empty() {
                // Require actual synthesized text alongside the tool calls;
                // a bare tool call with no explanation is not a usable answer.
                if candidate_text.trim().is_empty() {
                    score = 0.5;
                    feedback = "Tools executed but no explanatory response was synthesized.".to_string();
                } else {
                    score = 0.9;
                    feedback = "Tools executed cleanly and grounded with environment.".to_string();
                }
            } else if !candidate_text.trim().is_empty() {
                score = 0.85;
                feedback = "Direct response synthesized cleanly.".to_string();
            }

            // Prepare structured feedback for the NEXT iteration.
            iteration_feedback = if has_tool_errors {
                let snippet: String = candidate_text.chars().take(400).collect();
                Some(format!(
                    "[ATTEMPT {} FAILED — score {:.2}]\n\
                     Tool errors:\n{}\n\n\
                     Your previous answer snippet: \"{}\"\n\n\
                     The identical approach already failed. Do NOT call the same tool with the same arguments again. \
                     Diagnose the root cause (e.g. verify the path exists with list_directory or execute_shell_command, \
                     check argument formats, or answer from your own knowledge if the environment can't satisfy the request) \
                     and try a genuinely different strategy.",
                    iteration,
                    score,
                    tool_errors.join("\n"),
                    snippet
                ))
            } else if iteration_tool_calls.is_empty() && candidate_text.trim().is_empty() {
                Some(format!(
                    "[ATTEMPT {} PRODUCED NO OUTPUT — score {:.2}]\n\
                     You must either answer directly or use tools to gather information. \
                     Produce a substantive response this time.",
                    iteration, score
                ))
            } else {
                None
            };
            last_tool_errors = tool_errors;
            last_score = Some(score);

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
