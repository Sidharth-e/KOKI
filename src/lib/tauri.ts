import type { EventCallback, UnlistenFn } from "@tauri-apps/api/event";

export const isTauriEnvironment = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

export async function invokeCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauriEnvironment()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(cmd, args);
  }

  if (cmd === "get_system_metrics") {
    return {
      os_name: "Web Browser (Mock)",
      os_version: "1.0.0",
      cpu_count: 8,
      cpu_usage_percent: 18.5,
      total_memory_mb: 16384,
      used_memory_mb: 6144,
      memory_usage_percent: 37.5,
      uptime_seconds: 3600,
    } as T;
  }

  if (cmd === "set_window_mode") {
    return undefined as T;
  }

  if (cmd === "check_ollama_status") {
    return true as T;
  }

  if (cmd === "list_ollama_models") {
    const envModel = process.env.OLLAMA_MODEL || process.env.NEXT_PUBLIC_OLLAMA_MODEL;
    return (envModel
      ? [
          {
            name: envModel,
            size: 0,
            digest: "",
            modified_at: new Date().toISOString(),
            parameter_size: undefined,
            quantization_level: undefined,
          },
        ]
      : []) as T;
  }

  if (cmd === "get_available_tools") {
    return [
      {
        name: "get_system_metrics",
        description: "Retrieve real-time host system statistics including CPU usage, RAM utilization, and OS details",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "get_current_time",
        description: "Get the current date, time, and timezone",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "calculate_expression",
        description: "Perform basic mathematical calculations and expressions safely",
        parameters: { type: "object", properties: { expression: { type: "string" } } },
      },
      {
        name: "list_directory",
        description: "List files and directories in a specific folder path",
        parameters: { type: "object", properties: { path: { type: "string" } } },
      },
    ] as T;
  }

  throw new Error(`Command ${cmd} not implemented in mock mode`);
}

export async function listenToEvent<T>(
  eventName: string,
  handler: EventCallback<T>
): Promise<UnlistenFn> {
  if (isTauriEnvironment()) {
    const { listen } = await import("@tauri-apps/api/event");
    return listen<T>(eventName, handler);
  }

  return () => {};
}
