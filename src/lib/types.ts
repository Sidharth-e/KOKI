export interface SystemMetrics {
  os_name: string;
  os_version: string;
  cpu_count: number;
  cpu_usage_percent: number;
  total_memory_mb: number;
  used_memory_mb: number;
  memory_usage_percent: number;
  uptime_seconds: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  parameter_size?: string;
  quantization_level?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  tool_name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
  duration_ms: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolStatusPayload {
  session_id: string;
  tool_name: string;
  status: "running" | "completed" | "error";
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface StreamChunkPayload {
  session_id: string;
  chunk: string;
  is_done: boolean;
  error?: string;
}

export interface AgentRequest {
  prompt: string;
  model: string;
  system_prompt?: string;
  temperature?: number;
  history?: { role: string; content: string }[];
}

export interface AgentResponse {
  response: string;
  model: string;
  tool_calls: ToolCallInfo[];
  total_duration_ms: number;
}
