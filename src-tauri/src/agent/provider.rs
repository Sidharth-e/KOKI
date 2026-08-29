use crate::agent::tools;
use crate::models::{
    ModelConfig, OllamaModel, OllamaTagsResponse, ProviderType, StreamChunkPayload, ToolCallInfo,
    ToolStatusPayload,
};
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAiModelsResponse {
    pub data: Vec<OpenAiModelItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAiModelItem {
    pub id: String,
    pub created: Option<u64>,
}

pub struct ModelFactory;

impl ModelFactory {
    pub fn build_client(config: &ModelConfig) -> Result<Client, String> {
        let builder = Client::builder().timeout(Duration::from_secs(180));
        let mut headers = HeaderMap::new();

        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        if let Some(ref key) = config.api_key {
            if !key.trim().is_empty() {
                let auth_val = format!("Bearer {}", key.trim());
                if let Ok(val) = HeaderValue::from_str(&auth_val) {
                    headers.insert(AUTHORIZATION, val);
                }
            }
        }

        if let Some(ref custom_headers) = config.custom_headers {
            for (k, v) in custom_headers {
                if let (Ok(name), Ok(val)) = (HeaderName::from_str(k), HeaderValue::from_str(v)) {
                    headers.insert(name, val);
                }
            }
        }

        builder
            .default_headers(headers)
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {}", e))
    }

    pub async fn check_health(config: &ModelConfig) -> Result<bool, String> {
        let client = Self::build_client(config)?;
        let base_url = config.endpoint.trim_end_matches('/');

        match config.provider {
            ProviderType::OllamaLocal | ProviderType::OllamaCloud => {
                let url = format!("{}/api/tags", base_url);
                match client.get(&url).timeout(Duration::from_secs(4)).send().await {
                    Ok(res) => Ok(res.status().is_success()),
                    Err(_) => Ok(false),
                }
            }
            ProviderType::Openrouter => {
                let url = if base_url.ends_with("/v1") {
                    format!("{}/models", base_url)
                } else {
                    format!("{}/v1/models", base_url)
                };
                match client.get(&url).timeout(Duration::from_secs(5)).send().await {
                    Ok(res) => Ok(res.status().is_success()),
                    Err(_) => Ok(false),
                }
            }
        }
    }

    pub async fn list_models(config: &ModelConfig) -> Result<Vec<OllamaModel>, String> {
        let client = Self::build_client(config)?;
        let base_url = config.endpoint.trim_end_matches('/');

        match config.provider {
            ProviderType::OllamaLocal | ProviderType::OllamaCloud => {
                let url = format!("{}/api/tags", base_url);
                let res = client
                    .get(&url)
                    .timeout(Duration::from_secs(8))
                    .send()
                    .await
                    .map_err(|e| format!("Failed to reach Ollama at {}: {}", url, e))?;

                if !res.status().is_success() {
                    return Err(format!("Ollama server returned HTTP {}", res.status()));
                }

                let tags_data = res
                    .json::<OllamaTagsResponse>()
                    .await
                    .map_err(|e| format!("Failed to parse Ollama models response: {}", e))?;

                let models = tags_data
                    .models
                    .into_iter()
                    .map(|m| OllamaModel {
                        name: m.name,
                        size: m.size,
                        digest: m.digest,
                        modified_at: m.modified_at,
                        parameter_size: m.details.as_ref().and_then(|d| d.parameter_size.clone()),
                        quantization_level: m.details.as_ref().and_then(|d| d.quantization_level.clone()),
                    })
                    .collect();

                Ok(models)
            }
            ProviderType::Openrouter => {
                let url = if base_url.ends_with("/v1") {
                    format!("{}/models", base_url)
                } else {
                    format!("{}/v1/models", base_url)
                };

                let res = client
                    .get(&url)
                    .timeout(Duration::from_secs(8))
                    .send()
                    .await
                    .map_err(|e| format!("Failed to reach OpenRouter at {}: {}", url, e))?;

                if !res.status().is_success() {
                    return Err(format!("OpenRouter returned HTTP {}", res.status()));
                }

                let data = res
                    .json::<OpenAiModelsResponse>()
                    .await
                    .map_err(|e| format!("Failed to parse OpenRouter models response: {}", e))?;

                let models = data
                    .data
                    .into_iter()
                    .map(|m| OllamaModel {
                        name: m.id,
                        size: 0,
                        digest: "".to_string(),
                        modified_at: chrono::Utc::now().to_rfc3339(),
                        parameter_size: None,
                        quantization_level: None,
                    })
                    .collect();

                Ok(models)
            }
        }
    }

    pub async fn execute_stream_chat(
        app: &AppHandle,
        session_id: &str,
        config: &ModelConfig,
        messages: Vec<serde_json::Value>,
        enable_tools: bool,
        temperature: f32,
    ) -> Result<(String, Vec<ToolCallInfo>), String> {
        let client = Self::build_client(config)?;
        let base_url = config.endpoint.trim_end_matches('/');

        match config.provider {
            ProviderType::OllamaLocal | ProviderType::OllamaCloud => {
                Self::execute_ollama_chat(
                    app,
                    session_id,
                    &client,
                    base_url,
                    &config.model_name,
                    messages,
                    enable_tools,
                    temperature,
                )
                .await
            }
            ProviderType::Openrouter => {
                Self::execute_openai_chat(
                    app,
                    session_id,
                    &client,
                    base_url,
                    &config.model_name,
                    messages,
                    enable_tools,
                    temperature,
                )
                .await
            }
        }
    }

    async fn execute_ollama_chat(
        app: &AppHandle,
        session_id: &str,
        client: &Client,
        base_url: &str,
        model_name: &str,
        messages: Vec<serde_json::Value>,
        enable_tools: bool,
        temperature: f32,
    ) -> Result<(String, Vec<ToolCallInfo>), String> {
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

        let endpoint = format!("{}/api/chat", base_url);
        let mut request_body = json!({
            "model": model_name,
            "messages": messages,
            "stream": true,
            "options": {
                "temperature": temperature
            }
        });

        if enable_tools && !tools_json.is_empty() {
            request_body["tools"] = json!(tools_json);
        }

        let response = client
            .post(&endpoint)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Ollama request error ({}): {}", endpoint, e))?;

        let status = response.status();
        if !status.is_success() {
            let err_text = response.text().await.unwrap_or_default();
            return Err(format!("Ollama returned status {}: {}", status, err_text));
        }

        let mut stream = response.bytes_stream();
        let mut accumulated_text = String::new();
        let mut line_buffer = String::new();
        let mut executed_tools = Vec::new();

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
                                        let tool_result =
                                            tools::execute_tool(tool_name, &tool_args).await;
                                        let dur_ms = t_start.elapsed().as_millis() as u64;

                                        let final_result = match tool_result {
                                            Ok(res) => {
                                                let _ = app.emit(
                                                    "assistant-tool-status",
                                                    ToolStatusPayload {
                                                        session_id: session_id.to_string(),
                                                        tool_name: tool_name.to_string(),
                                                        status: "completed".to_string(),
                                                        input: tool_args.clone(),
                                                        output: Some(res.clone()),
                                                    },
                                                );
                                                res
                                            }
                                            Err(e) => {
                                                let err_json = json!({ "error": e });
                                                let _ = app.emit(
                                                    "assistant-tool-status",
                                                    ToolStatusPayload {
                                                        session_id: session_id.to_string(),
                                                        tool_name: tool_name.to_string(),
                                                        status: "error".to_string(),
                                                        input: tool_args.clone(),
                                                        output: Some(err_json.clone()),
                                                    },
                                                );
                                                err_json
                                            }
                                        };

                                        executed_tools.push(ToolCallInfo {
                                            tool_name: tool_name.to_string(),
                                            arguments: tool_args,
                                            result: final_result,
                                            duration_ms: dur_ms,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // If tools were executed, ALWAYS feed the results back so the model can
        // see errors/successes and synthesize a final answer. Previously this only
        // ran when the model produced no text, which meant tool errors were never
        // visible to the model whenever it also emitted filler text alongside the
        // tool call.
        if enable_tools && !executed_tools.is_empty() {
            let mut followup_messages = messages.clone();

            // Append the assistant's tool-call turn (include any text it produced)
            let tool_calls_json: Vec<serde_json::Value> = executed_tools
                .iter()
                .map(|t: &ToolCallInfo| {
                    json!({
                        "function": {
                            "name": t.tool_name,
                            "arguments": t.arguments
                        }
                    })
                })
                .collect();

            followup_messages.push(json!({
                "role": "assistant",
                "content": accumulated_text,
                "tool_calls": tool_calls_json
            }));

            // Append tool results
            for t in &executed_tools {
                followup_messages.push(json!({
                    "role": "tool",
                    "name": t.tool_name,
                    "content": serde_json::to_string(&t.result).unwrap_or_else(|_| "{}".to_string())
                }));
            }

            followup_messages.push(json!({
                "role": "user",
                "content": "The tool results above are the ground truth from the environment. If a tool failed, do NOT retry the identical call — pivot to a different tool or strategy. Now synthesize the final answer for the user based on these results."
            }));

            // Second pass: stream the final response (no tools to avoid loops).
            let second_body = json!({
                "model": model_name,
                "messages": followup_messages,
                "stream": true,
                "options": { "temperature": temperature }
            });

            if let Ok(resp2) = client.post(&endpoint).json(&second_body).send().await {
                if resp2.status().is_success() {
                    // Only stream the second pass if the first pass produced no
                    // (or trivial) text; otherwise the final answer is streamed
                    // fresh and replaces filler text like "Let me read that file."
                    let skip_stream = !accumulated_text.trim().is_empty()
                        && accumulated_text.trim().chars().count() > 40;
                    let mut second_pass_text = String::new();
                    let mut line_buf2 = String::new();
                    let mut stream2 = resp2.bytes_stream();
                    while let Some(chunk_result) = stream2.next().await {
                        if let Ok(chunk_bytes) = chunk_result {
                            let chunk_str = String::from_utf8_lossy(&chunk_bytes);
                            line_buf2.push_str(&chunk_str);
                            while let Some(nl) = line_buf2.find('\n') {
                                let line = line_buf2[..nl].trim().to_string();
                                line_buf2.drain(..=nl);
                                if line.is_empty() { continue; }
                                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                                    if let Some(msg) = val.get("message") {
                                        if let Some(content) = msg.get("content").and_then(|c| c.as_str()) {
                                            if !content.is_empty() {
                                                if skip_stream {
                                                    // First pass already answered; keep its
                                                    // text and drop the second pass output.
                                                    continue;
                                                }
                                                second_pass_text.push_str(content);
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
                                    }
                                }
                            }
                        }
                    }
                    if !second_pass_text.is_empty() {
                        accumulated_text = second_pass_text;
                    }
                }
            }
        }

        let _ = app.emit(
            "assistant-stream-chunk",
            StreamChunkPayload {
                session_id: session_id.to_string(),
                chunk: "".to_string(),
                is_done: true,
                error: None,
            },
        );

        Ok((accumulated_text, executed_tools))
    }

    async fn execute_openai_chat(
        app: &AppHandle,
        session_id: &str,
        client: &Client,
        base_url: &str,
        model_name: &str,
        messages: Vec<serde_json::Value>,
        enable_tools: bool,
        temperature: f32,
    ) -> Result<(String, Vec<ToolCallInfo>), String> {
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

        let endpoint = if base_url.ends_with("/v1") {
            format!("{}/chat/completions", base_url)
        } else {
            format!("{}/v1/chat/completions", base_url)
        };

        let mut request_body = json!({
            "model": model_name,
            "messages": messages,
            "stream": true,
            "temperature": temperature
        });

        if enable_tools && !tools_json.is_empty() {
            request_body["tools"] = json!(tools_json);
        }

        let response = client
            .post(&endpoint)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("OpenAI request error ({}): {}", endpoint, e))?;

        let status = response.status();
        if !status.is_success() {
            let err_text = response.text().await.unwrap_or_default();
            return Err(format!("OpenAI returned status {}: {}", status, err_text));
        }

        let mut stream = response.bytes_stream();
        let mut accumulated_text = String::new();
        let mut line_buffer = String::new();
        let mut executed_tools = Vec::new();
        let mut pending_tool_calls: std::collections::HashMap<usize, (String, String)> =
            std::collections::HashMap::new();

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

                if line == "data: [DONE]" {
                    break;
                }

                if let Some(json_payload) = line.strip_prefix("data: ") {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(json_payload) {
                        if let Some(choices) = val.get("choices").and_then(|c| c.as_array()) {
                            for choice in choices {
                                if let Some(delta) = choice.get("delta") {
                                    if let Some(content) =
                                        delta.get("content").and_then(|c| c.as_str())
                                    {
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
                                        if let Some(tcs) = delta
                                            .get("tool_calls")
                                            .and_then(|tc| tc.as_array())
                                        {
                                            for (idx, tc) in tcs.iter().enumerate() {
                                                let index = tc
                                                    .get("index")
                                                    .and_then(|i| i.as_u64())
                                                    .map(|i| i as usize)
                                                    .unwrap_or(idx);

                                                let entry = pending_tool_calls
                                                    .entry(index)
                                                    .or_insert_with(|| {
                                                        (String::new(), String::new())
                                                    });

                                                if let Some(func) = tc.get("function") {
                                                    if let Some(name) = func
                                                        .get("name")
                                                        .and_then(|n| n.as_str())
                                                    {
                                                        entry.0.push_str(name);
                                                    }
                                                    if let Some(args) = func
                                                        .get("arguments")
                                                        .and_then(|a| a.as_str())
                                                    {
                                                        entry.1.push_str(args);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if enable_tools && !pending_tool_calls.is_empty() {
            for (_, (tool_name, args_str)) in pending_tool_calls {
                if tool_name.is_empty() {
                    continue;
                }

                let tool_args = serde_json::from_str::<serde_json::Value>(&args_str)
                    .unwrap_or(json!({ "raw": args_str }));

                let _ = app.emit(
                    "assistant-tool-status",
                    ToolStatusPayload {
                        session_id: session_id.to_string(),
                        tool_name: tool_name.clone(),
                        status: "running".to_string(),
                        input: tool_args.clone(),
                        output: None,
                    },
                );

                let t_start = Instant::now();
                let tool_result = tools::execute_tool(&tool_name, &tool_args).await;
                let dur_ms = t_start.elapsed().as_millis() as u64;

                let final_result = match tool_result {
                    Ok(res) => {
                        let _ = app.emit(
                            "assistant-tool-status",
                            ToolStatusPayload {
                                session_id: session_id.to_string(),
                                tool_name: tool_name.clone(),
                                status: "completed".to_string(),
                                input: tool_args.clone(),
                                output: Some(res.clone()),
                            },
                        );
                        res
                    }
                    Err(e) => {
                        let err_json = json!({ "error": e });
                        let _ = app.emit(
                            "assistant-tool-status",
                            ToolStatusPayload {
                                session_id: session_id.to_string(),
                                tool_name: tool_name.clone(),
                                status: "error".to_string(),
                                input: tool_args.clone(),
                                output: Some(err_json.clone()),
                            },
                        );
                        err_json
                    }
                };

                executed_tools.push(ToolCallInfo {
                    tool_name,
                    arguments: tool_args,
                    result: final_result,
                    duration_ms: dur_ms,
                });
            }
        }

        // Feed tool results back for a final synthesized answer. Always do this
        // when tools ran so the model can see error results; the second pass
        // replaces filler text from the first pass.
        if enable_tools && !executed_tools.is_empty() {
            let mut followup_messages = messages.clone();

            let tool_calls_json: Vec<serde_json::Value> = executed_tools
                .iter()
                .enumerate()
                .map(|(idx, t)| {
                    json!({
                        "id": format!("call_{}", idx),
                        "type": "function",
                        "function": {
                            "name": t.tool_name,
                            "arguments": serde_json::to_string(&t.arguments).unwrap_or_else(|_| "{}".into())
                        }
                    })
                })
                .collect();

            // Single assistant turn containing ALL tool calls (OpenAI spec:
            // every tool message must respond to a tool_call_id declared in a
            // preceding assistant message).
            followup_messages.push(json!({
                "role": "assistant",
                "content": accumulated_text,
                "tool_calls": tool_calls_json
            }));

            for (idx, t) in executed_tools.iter().enumerate() {
                followup_messages.push(json!({
                    "role": "tool",
                    "tool_call_id": format!("call_{}", idx),
                    "content": serde_json::to_string(&t.result).unwrap_or_else(|_| "{}".into())
                }));
            }

            followup_messages.push(json!({
                "role": "user",
                "content": "The tool results above are the ground truth from the environment. If a tool failed, do NOT retry the identical call. Now synthesize the final answer for the user based on these results."
            }));

            let second_body = json!({
                "model": model_name,
                "messages": followup_messages,
                "stream": true,
                "temperature": temperature
            });

            if let Ok(resp2) = client.post(&endpoint).json(&second_body).send().await {
                if resp2.status().is_success() {
                    let skip_stream = !accumulated_text.trim().is_empty()
                        && accumulated_text.trim().chars().count() > 40;
                    let mut second_pass_text = String::new();
                    let mut line_buf2 = String::new();
                    let mut stream2 = resp2.bytes_stream();
                    while let Some(chunk_result) = stream2.next().await {
                        if let Ok(chunk_bytes) = chunk_result {
                            let chunk_str = String::from_utf8_lossy(&chunk_bytes);
                            line_buf2.push_str(&chunk_str);
                            while let Some(nl) = line_buf2.find('\n') {
                                let line = line_buf2[..nl].trim().to_string();
                                line_buf2.drain(..=nl);
                                if line.is_empty() || line == "data: [DONE]" { continue; }
                                if let Some(payload) = line.strip_prefix("data: ") {
                                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(payload) {
                                        if let Some(choices) = val.get("choices").and_then(|c| c.as_array()) {
                                            for choice in choices {
                                                if let Some(content) = choice
                                                    .get("delta")
                                                    .and_then(|d| d.get("content"))
                                                    .and_then(|c| c.as_str())
                                                {
                                                    if !content.is_empty() {
                                                        if skip_stream {
                                                            continue;
                                                        }
                                                        second_pass_text.push_str(content);
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
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if !second_pass_text.is_empty() {
                        accumulated_text = second_pass_text;
                    }
                }
            }
        }

        let _ = app.emit(
            "assistant-stream-chunk",
            StreamChunkPayload {
                session_id: session_id.to_string(),
                chunk: "".to_string(),
                is_done: true,
                error: None,
            },
        );

        Ok((accumulated_text, executed_tools))
    }
}
