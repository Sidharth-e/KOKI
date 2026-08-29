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

export type ProviderType =
  | "ollama_local"
  | "ollama_cloud"
  | "openrouter";

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  mode: "local" | "cloud";
  endpoint: string;
  api_key?: string;
  model_name: string;
  temperature?: number;
  max_tokens?: number;
  custom_headers?: Record<string, string>;
  is_active: boolean;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  parameter_size?: string;
  quantization_level?: string;
}

export interface ChatAttachment {
  name: string;
  size: number;
  type: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  toolCalls?: ToolCallInfo[];
  attachment?: ChatAttachment;
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
  config?: ModelConfig;
}

export interface AgentResponse {
  response: string;
  model: string;
  tool_calls: ToolCallInfo[];
  total_duration_ms: number;
}

export interface Neo4jConfig {
  uri: string;
  user: string;
  pass: string;
  database?: string;
  enabled: boolean;
}

export interface Neo4jStatus {
  connected: boolean;
  uri: string;
  node_count: number;
  error?: string;
}

export interface LineageNodeInfo {
  id: string;
  label: string;
  node_type: string;
  iteration?: number;
  score?: number;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface LineageEdgeInfo {
  source_id: string;
  target_id: string;
  relationship: string;
  metadata: Record<string, unknown>;
}

export interface LineageGraphPayload {
  session_id: string;
  nodes: LineageNodeInfo[];
  edges: LineageEdgeInfo[];
}

export interface SupervisorEventPayload {
  session_id: string;
  event_type: string;
  iteration: number;
  message: string;
  score?: number;
  data?: Record<string, unknown>;
}

export interface SubAgentSpawnRequest {
  session_id: string;
  role: string;
  goal: string;
  context?: string;
  model?: string;
  config?: ModelConfig;
}

export interface SubAgentExecutionResult {
  agent_id: string;
  role: string;
  output: string;
  tool_calls: ToolCallInfo[];
  duration_ms: number;
  success: boolean;
}
