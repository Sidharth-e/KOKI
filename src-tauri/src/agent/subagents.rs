use crate::agent::graph_memory::GraphMemoryManager;
use crate::agent::tools;
use crate::models::{StreamChunkPayload, SubAgentExecutionResult, ToolCallInfo, ToolStatusPayload};
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
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
    client: Client,
    ollama_url: String,
    graph_memory: Arc<GraphMemoryManager>,
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
        enable_tools: bool,
    ) -> Result<SubAgentExecutionResult, String> {
        let start_time = Instant::now();
        let agent_id = format!("agent_{}_{}", role.as_str(), Uuid::new_v4().simple());
        let mut tool_calls_executed = Vec::new();

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

        let tools_json = if enable_tools {
            tools::get_available_tools_definitions()
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
                .collect::<Vec<_>>()
        } else {
            Vec::new()
        };

        let endpoint = format!("{}/api/chat", self.ollama_url.trim_end_matches('/'));
        let mut request_body = json!({
            "model": model,
            "messages": messages,
            "stream": true,
            "options": {
                "temperature": 0.3
            }
        });

        if enable_tools && !tools_json.is_empty() {
            request_body["tools"] = json!(tools_json);
        }

        let response = self
            .client
            .post(&endpoint)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Sub-agent Ollama request error: {}", e))?;

        if !response.status().is_success() {
            let err_text = response.text().await.unwrap_or_default();
            return Err(format!("Sub-agent model error: {}", err_text));
        }

        let mut stream = response.bytes_stream();
        let mut accumulated_text = String::new();
        let mut line_buffer = String::new();

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
                                accumulated_text.push_str(content);
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

                        if enable_tools {
                            if let Some(tcs) = msg.get("tool_calls").and_then(|tc| tc.as_array()) {
                                for tc in tcs {
                                    if let Some(func) = tc.get("function") {
                                        let tool_name =
                                            func.get("name").and_then(|n| n.as_str()).unwrap_or("");
                                        let tool_args =
                                            func.get("arguments").cloned().unwrap_or(json!({}));

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

                                        tool_calls_executed.push(ToolCallInfo {
                                            tool_name: tool_name.to_string(),
                                            arguments: tool_args,
                                            result: result_json,
                                            duration_ms: t_dur,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

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
