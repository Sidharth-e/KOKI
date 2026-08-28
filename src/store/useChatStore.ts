import { create } from "zustand";
import { ChatMessage, ToolStatusPayload } from "@/lib/types";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  activeToolStatus: ToolStatusPayload | null;
  currentSessionId: string;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => string;
  updateMessageContent: (id: string, content: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  appendStreamContent: (chunk: string) => void;
  clearStreamingContent: () => void;
  setActiveToolStatus: (status: ToolStatusPayload | null) => void;
  clearMessages: () => void;
  resetSession: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      id: "welcome-1",
      role: "assistant",
      content: "Hello! I am KOKI, your high-performance local AI personal assistant powered by Rig and Tauri v2. I can run fast agentic tasks, execute system tools, and query your local Ollama models with zero cloud latency. How can I help you today?",
      timestamp: Date.now(),
      model: "system",
    },
  ],
  isStreaming: false,
  streamingContent: "",
  activeToolStatus: null,
  currentSessionId: `session-${Date.now()}`,
  addMessage: (msg) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id,
          timestamp: Date.now(),
        },
      ],
    }));
    return id;
  },
  updateMessageContent: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamContent: (chunk) =>
    set((state) => ({
      streamingContent: state.streamingContent + chunk,
    })),
  clearStreamingContent: () => set({ streamingContent: "" }),
  setActiveToolStatus: (activeToolStatus) => set({ activeToolStatus }),
  clearMessages: () => set({ messages: [] }),
  resetSession: () =>
    set({
      messages: [],
      currentSessionId: `session-${Date.now()}`,
      streamingContent: "",
      isStreaming: false,
      activeToolStatus: null,
    }),
}));
