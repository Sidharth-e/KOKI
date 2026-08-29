use crate::agent::graph_memory::GraphMemoryManager;
use crate::agent::subagents::SubAgentRunner;
use crate::agent::supervisor::SupervisorAgent;
use crate::agent::tools;
use crate::models::{
    AgentRequest, AgentResponse, StreamChunkPayload, SupervisorEventPayload, ToolCallInfo,
    ToolStatusPayload,
};
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub struct AvoEngine {
    client: Client,
    ollama_url: String,
    graph_memory: Arc<GraphMemoryManager>,
    supervisor: Arc<SupervisorAgent>,
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

        self.graph_memory
            .add_task(session_id, &task_id, &req.prompt)
            .await?;

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

            let tool_definitions = tools::get_available_tools_definitions();
            let tools_json = tool_definitions
                .iter()
                .map(|t| {
                    json!({
                        "type": "function",
                        "function": {
                            "name": t.name,
                            "description": t.description,
                            "parameters": t.parameters
                        }
                    })
                })
                .collect::<Vec<_>>();

            let endpoint = format!("{}/api/chat", self.ollama_url.trim_end_matches('/'));
            let request_body = json!({
                "model": req.model,
                "messages": messages,
                "stream": true,
                "tools": tools_json,
                "options": {
                    "temperature": req.temperature.unwrap_or(0.3)
                }
            });

            let response = self
                .client
                .post(&endpoint)
                .json(&request_body)
                .send()
                .await
                .map_err(|e| format!("Failed to connect to Ollama at {}: {}", endpoint, e))?;

            let status = response.status();
            if !status.is_success() {
                let err_text = response.text().await.unwrap_or_default();
                return Err(format!("Ollama error (HTTP {}): {}", status, err_text));
            }

            let mut stream = response.bytes_stream();
            let mut candidate_text = String::new();
            let mut line_buffer = String::new();
            let mut iteration_tool_calls = Vec::new();

            while let Some(chunk_result) = stream.next().await {
                let chunk_bytes = chunk_result.map_err(|e| e.to_string())?;
                let chunk_str = String::from_utf8_lossy(&chunk_bytes);
                line_buffer.push_str(&chunk_str);

                while let Some(newline_pos) = line_buffer.find('\n') {
                    let line = line_buffer[..newline_pos].trim().to_string();
                    line_buffer.drain(..=newline_pos);

                    if line.is_empty() {
                        continue;
                    }

                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                        if let Some(msg) = val.get("message") {
                            if let Some(content) = msg.get("content").and_then(|c| c.as_str()) {
                                if !content.is_empty() {
                                    candidate_text.push_str(content);
                                    let _ = app.emit(
                                        "assistant-stream-chunk",
                                        StreamChunkPayload {
                                            session_id: session_id.to_string(),
                                            chunk: content.to_string(),
                                            is_done: false,
                                            error: None,
                                        },
                                    );
                                }
                            }

                            if let Some(tool_calls) =
                                msg.get("tool_calls").and_then(|tc| tc.as_array())
                            {
                                for tc in tool_calls {
                                    if let Some(func) = tc.get("function") {
                                        let tool_name = func
                                            .get("name")
                                            .and_then(|n| n.as_str())
                                            .unwrap_or("");
                                        let tool_args = func
                                            .get("arguments")
                                            .cloned()
                                            .unwrap_or(json!({}));

                                        let _ = app.emit(
                                            "assistant-tool-status",
                                            ToolStatusPayload {
                                                session_id: session_id.to_string(),
                                                tool_name: tool_name.to_string(),
                                                status: "running".to_string(),
                                                input: tool_args.clone(),
                                                output: None,
                                            },
                                        );

                                        let t_start = Instant::now();
                                        let tool_res =
                                            tools::execute_tool(tool_name, &tool_args).await;
                                        let t_dur = t_start.elapsed().as_millis() as u64;

                                        let result_json = match tool_res {
                                            Ok(out) => out,
                                            Err(e) => json!({ "error": e }),
                                        };

                                        let _ = app.emit(
                                            "assistant-tool-status",
                                            ToolStatusPayload {
                                                session_id: session_id.to_string(),
                                                tool_name: tool_name.to_string(),
                                                status: "completed".to_string(),
                                                input: tool_args.clone(),
                                                output: Some(result_json.clone()),
                                            },
                                        );

                                        let tc_info = ToolCallInfo {
                                            tool_name: tool_name.to_string(),
                                            arguments: tool_args,
                                            result: result_json,
                                            duration_ms: t_dur,
                                        };
                                        iteration_tool_calls.push(tc_info.clone());
                                        all_tool_calls.push(tc_info);
                                    }
                                }
                            }
                        }
                    }
                }
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

        Ok(AgentResponse {
            response: accumulated_final_response,
            model: req.model,
            tool_calls: all_tool_calls,
            total_duration_ms: start_time.elapsed().as_millis() as u64,
        })
    }
}
