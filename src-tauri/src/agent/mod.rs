pub mod tools;

use crate::models::{AgentRequest, AgentResponse, StreamChunkPayload, ToolCallInfo, ToolStatusPayload};
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

pub struct AgentEngine {
    client: Client,
    ollama_url: String,
}

impl Default for AgentEngine {
    fn default() -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(120))
                .build()
                .unwrap_or_default(),
            ollama_url: "http://127.0.0.1:11434".to_string(),
        }
    }
}

impl AgentEngine {
    pub fn new(ollama_url: Option<String>) -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(120))
                .build()
                .unwrap_or_default(),
            ollama_url: ollama_url.unwrap_or_else(|| "http://127.0.0.1:11434".to_string()),
        }
    }

    pub async fn run_agent_prompt(
        &self,
        app: &AppHandle,
        session_id: &str,
        req: AgentRequest,
    ) -> Result<AgentResponse, String> {
        let start_time = Instant::now();
        let mut tool_calls_executed = Vec::new();

        let system_preamble = req.system_prompt.unwrap_or_else(|| {
            "You are KOKI, a fast, proactive, and intelligent local AI personal assistant powered by Rig and Tauri.".to_string()
        });

        let mut messages = Vec::new();
        messages.push(json!({
            "role": "system",
            "content": system_preamble
        }));

        if let Some(history) = req.history {
            for msg in history {
                messages.push(json!({
                    "role": msg.role,
                    "content": msg.content
                }));
            }
        }

        messages.push(json!({
            "role": "user",
            "content": req.prompt
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
                "temperature": req.temperature.unwrap_or(0.7)
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
        let mut accumulated_text = String::new();

        while let Some(chunk_result) = stream.next().await {
            let chunk_bytes = chunk_result.map_err(|e| e.to_string())?;
            let chunk_str = String::from_utf8_lossy(&chunk_bytes);

            for line in chunk_str.lines() {
                if line.trim().is_empty() {
                    continue;
                }

                if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
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

                        if let Some(tool_calls) = msg.get("tool_calls").and_then(|tc| tc.as_array()) {
                            for tc in tool_calls {
                                if let Some(func) = tc.get("function") {
                                    let tool_name = func.get("name").and_then(|n| n.as_str()).unwrap_or("");
                                    let tool_args = func.get("arguments").cloned().unwrap_or(json!({}));

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
                                    let tool_res = tools::execute_tool(tool_name, &tool_args).await;
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
            response: accumulated_text,
            model: req.model,
            tool_calls: tool_calls_executed,
            total_duration_ms: start_time.elapsed().as_millis() as u64,
        })
    }
}
