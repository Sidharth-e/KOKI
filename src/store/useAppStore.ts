import { create } from "zustand";

export type NavTab = "chat" | "tools" | "system" | "settings";
export type ThemeMode = "dark" | "light";

interface AppState {
  theme: ThemeMode;
  activeTab: NavTab;
  sidebarOpen: boolean;
  selectedModel: string;
  ollamaEndpoint: string;
  systemPrompt: string;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setActiveTab: (tab: NavTab) => void;
  toggleSidebar: () => void;
  setSelectedModel: (model: string) => void;
  setOllamaEndpoint: (endpoint: string) => void;
  setSystemPrompt: (prompt: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "dark",
  activeTab: "chat",
  sidebarOpen: true,
  selectedModel: "gemma4:e2b-mlx",
  ollamaEndpoint: "http://127.0.0.1:11434",
  systemPrompt: "You are KOKI, a fast, proactive, and intelligent local AI personal assistant powered by gemma4:e2b-mlx, Rig, and Tauri.",
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "dark" ? "light" : "dark",
    })),
  setActiveTab: (activeTab) => set({ activeTab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setOllamaEndpoint: (ollamaEndpoint) => set({ ollamaEndpoint }),
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
}));
