import { create } from "zustand";
import { ModelConfig, ProviderType } from "@/lib/types";
import { invokeCommand } from "@/lib/tauri";

export type ActiveDockPanel = "chat" | "usage" | "tools" | "system" | "settings" | null;
export type ThemeMode = "dark" | "light";

interface AppState {
  theme: ThemeMode;
  activePanel: ActiveDockPanel;
  modelConfig: ModelConfig;
  selectedModel: string;
  ollamaEndpoint: string;
  systemPrompt: string;
  audioMuted: boolean;
  agentModeEnabled: boolean;
  commandPaletteOpen: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setActivePanel: (panel: ActiveDockPanel) => void;
  togglePanel: (panel: NonNullable<ActiveDockPanel>) => void;
  setModelConfig: (config: ModelConfig) => void;
  updateModelConfig: (partial: Partial<ModelConfig>) => void;
  setSelectedModel: (model: string) => void;
  setOllamaEndpoint: (endpoint: string) => void;
  setSystemPrompt: (prompt: string) => void;
  toggleAudioMuted: () => void;
  toggleAgentMode: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  syncBackendConfig: () => Promise<void>;
  saveConfigToBackend: (config: ModelConfig) => Promise<void>;
}

const getInitialModelConfig = (): ModelConfig => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("koki_model_config");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse error
    }
  }

  const isCloud = process.env.OLLAMA_MODE === "cloud";
  const defaultEndpoint = isCloud
    ? process.env.OLLAMA_CLOUD_URL || "https://api.ollama.com"
    : process.env.OLLAMA_URL || "http://127.0.0.1:11434";

  return {
    id: "default",
    name: "Default Profile",
    provider: isCloud ? "ollama_cloud" : "ollama_local",
    mode: isCloud ? "cloud" : "local",
    endpoint: defaultEndpoint,
    api_key: process.env.OLLAMA_API_KEY || "",
    model_name: process.env.OLLAMA_MODEL || process.env.NEXT_PUBLIC_OLLAMA_MODEL || "",
    temperature: 0.3,
    is_active: true,
  };
};

const initialConfig = getInitialModelConfig();

export const useAppStore = create<AppState>((set, get) => ({
  theme: "dark",
  activePanel: "chat",
  modelConfig: initialConfig,
  selectedModel: initialConfig.model_name,
  ollamaEndpoint: initialConfig.endpoint,
  systemPrompt: "You are KOKI, a fast, proactive, and intelligent AI personal assistant powered by Rig and Tauri.",
  audioMuted: false,
  agentModeEnabled: true,
  commandPaletteOpen: false,
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "dark" ? "light" : "dark",
    })),
  setActivePanel: (activePanel) => set({ activePanel }),
  togglePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    })),
  setModelConfig: (modelConfig) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("koki_model_config", JSON.stringify(modelConfig));
      } catch {
        // Ignore storage error
      }
    }
    set({
      modelConfig,
      selectedModel: modelConfig.model_name,
      ollamaEndpoint: modelConfig.endpoint,
    });
    get().saveConfigToBackend(modelConfig);
  },
  updateModelConfig: (partial) => {
    const updated = { ...get().modelConfig, ...partial };
    get().setModelConfig(updated);
  },
  setSelectedModel: (selectedModel) => {
    const updated = { ...get().modelConfig, model_name: selectedModel };
    get().setModelConfig(updated);
  },
  setOllamaEndpoint: (ollamaEndpoint) => {
    const updated = { ...get().modelConfig, endpoint: ollamaEndpoint };
    get().setModelConfig(updated);
  },
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  toggleAudioMuted: () => set((state) => ({ audioMuted: !state.audioMuted })),
  toggleAgentMode: () => set((state) => ({ agentModeEnabled: !state.agentModeEnabled })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  syncBackendConfig: async () => {
    try {
      const backendConfig = await invokeCommand<ModelConfig>("get_model_config");
      if (backendConfig) {
        set({
          modelConfig: backendConfig,
          selectedModel: backendConfig.model_name,
          ollamaEndpoint: backendConfig.endpoint,
        });
      }
    } catch {
      // Fallback to local
    }
  },
  saveConfigToBackend: async (config: ModelConfig) => {
    try {
      await invokeCommand<ModelConfig>("save_model_config", { config });
    } catch {
      // Ignore backend save error in browser
    }
  },
}));
