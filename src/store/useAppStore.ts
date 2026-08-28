import { create } from "zustand";

export type ActiveDockWindow = "chat" | "usage" | "tools" | "system" | "settings" | null;
export type ThemeMode = "dark" | "light";

interface AppState {
  theme: ThemeMode;
  activeWindow: ActiveDockWindow;
  selectedModel: string;
  ollamaEndpoint: string;
  systemPrompt: string;
  audioMuted: boolean;
  agentModeEnabled: boolean;
  commandPaletteOpen: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setActiveWindow: (window: ActiveDockWindow) => void;
  toggleWindow: (window: NonNullable<ActiveDockWindow>) => void;
  setSelectedModel: (model: string) => void;
  setOllamaEndpoint: (endpoint: string) => void;
  setSystemPrompt: (prompt: string) => void;
  toggleAudioMuted: () => void;
  toggleAgentMode: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "dark",
  activeWindow: "chat",
  selectedModel: "gemma4:e2b-mlx",
  ollamaEndpoint: "http://127.0.0.1:11434",
  systemPrompt: "You are KOKI, a fast, proactive, and intelligent local AI personal assistant powered by gemma4:e2b-mlx, Rig, and Tauri.",
  audioMuted: false,
  agentModeEnabled: true,
  commandPaletteOpen: false,
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "dark" ? "light" : "dark",
    })),
  setActiveWindow: (activeWindow) => set({ activeWindow }),
  toggleWindow: (window) =>
    set((state) => ({
      activeWindow: state.activeWindow === window ? null : window,
    })),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setOllamaEndpoint: (ollamaEndpoint) => set({ ollamaEndpoint }),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  toggleAudioMuted: () => set((state) => ({ audioMuted: !state.audioMuted })),
  toggleAgentMode: () => set((state) => ({ agentModeEnabled: !state.agentModeEnabled })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
}));
