import { create } from "zustand";
import { ModelConfig, Neo4jConfig, Neo4jStatus, ProviderType } from "@/lib/types";
import { invokeCommand } from "@/lib/tauri";

export type ActiveDockPanel = "chat" | "usage" | "tools" | "system" | "settings" | null;
export type ThemeMode = "dark" | "light";

interface AppState {
  theme: ThemeMode;
  activePanel: ActiveDockPanel;
  modelConfig: ModelConfig;
  neo4jConfig: Neo4jConfig;
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
  setNeo4jConfig: (config: Neo4jConfig) => void;
  updateNeo4jConfig: (partial: Partial<Neo4jConfig>) => void;
  setSelectedModel: (model: string) => void;
  setOllamaEndpoint: (endpoint: string) => void;
  setSystemPrompt: (prompt: string) => void;
  toggleAudioMuted: () => void;
  toggleAgentMode: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  syncBackendConfig: () => Promise<void>;
  saveConfigToBackend: (config: ModelConfig) => Promise<void>;
  saveNeo4jConfigToBackend: (config: Neo4jConfig) => Promise<void>;
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

  return {
    id: "default",
    name: "Default Profile",
    provider: "ollama_local",
    mode: "local",
    endpoint: "http://127.0.0.1:11434",
    api_key: "",
    model_name: "gemma4:31b",
    temperature: 0.3,
    is_active: true,
  };
};

const getInitialNeo4jConfig = (): Neo4jConfig => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("koki_neo4j_config");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse error
    }
  }

  return {
    uri: "127.0.0.1:7687",
    user: "neo4j",
    pass: "AvoHarness2026!SecureGraph",
    database: "neo4j",
    enabled: true,
  };
};

const initialModelConfig = getInitialModelConfig();
const initialNeo4jConfig = getInitialNeo4jConfig();

export const useAppStore = create<AppState>((set, get) => ({
  theme: "dark",
  activePanel: "chat",
  modelConfig: initialModelConfig,
  neo4jConfig: initialNeo4jConfig,
  selectedModel: initialModelConfig.model_name,
  ollamaEndpoint: initialModelConfig.endpoint,
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
  setNeo4jConfig: (neo4jConfig) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("koki_neo4j_config", JSON.stringify(neo4jConfig));
      } catch {
        // Ignore storage error
      }
    }
    set({ neo4jConfig });
    get().saveNeo4jConfigToBackend(neo4jConfig);
  },
  updateNeo4jConfig: (partial) => {
    const updated = { ...get().neo4jConfig, ...partial };
    get().setNeo4jConfig(updated);
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
      const backendNeo4j = await invokeCommand<Neo4jConfig>("get_neo4j_config");
      if (backendNeo4j) {
        set({ neo4jConfig: backendNeo4j });
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
  saveNeo4jConfigToBackend: async (config: Neo4jConfig) => {
    try {
      await invokeCommand<Neo4jStatus>("save_neo4j_config", { config });
    } catch {
      // Ignore backend save error in browser
    }
  },
}));
