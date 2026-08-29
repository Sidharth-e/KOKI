import { create } from "zustand";

export type ActiveDockPanel = "chat" | "usage" | "tools" | "system" | "settings" | null;
export type ThemeMode = "dark" | "light";

interface AppState {
  theme: ThemeMode;
  activePanel: ActiveDockPanel;
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
  setSelectedModel: (model: string) => void;
  setOllamaEndpoint: (endpoint: string) => void;
  setSystemPrompt: (prompt: string) => void;
  toggleAudioMuted: () => void;
  toggleAgentMode: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

const initialModel = process.env.OLLAMA_MODEL || process.env.NEXT_PUBLIC_OLLAMA_MODEL || "";
const initialEndpoint = process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_URL || "http://127.0.0.1:11434";

export const useAppStore = create<AppState>((set) => ({
  theme: "dark",
  activePanel: "chat",
  selectedModel: initialModel,
  ollamaEndpoint: initialEndpoint,
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
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setOllamaEndpoint: (ollamaEndpoint) => set({ ollamaEndpoint }),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  toggleAudioMuted: () => set((state) => ({ audioMuted: !state.audioMuted })),
  toggleAgentMode: () => set((state) => ({ agentModeEnabled: !state.agentModeEnabled })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
}));
