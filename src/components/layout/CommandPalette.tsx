"use client";

import { useAppStore } from "@/store/useAppStore";
import { useChatStore } from "@/store/useChatStore";
import { Badge } from "@/components/ui/Badge";
import {
  Activity,
  Cpu,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActivePanel,
    setSelectedModel,
    selectedModel,
  } = useAppStore();
  const { resetSession } = useChatStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const actions = [
    {
      id: "tab-chat",
      title: "Assistant Chat",
      category: "Navigation",
      icon: MessageSquare,
      perform: () => setActivePanel("chat"),
    },
    {
      id: "tab-usage",
      title: "Model Quotas & Engines",
      category: "Navigation",
      icon: Sparkles,
      perform: () => setActivePanel("usage"),
    },
    {
      id: "tab-tools",
      title: "Agent Tools",
      category: "Navigation",
      icon: Wrench,
      perform: () => setActivePanel("tools"),
    },
    {
      id: "tab-system",
      title: "System Monitor",
      category: "Navigation",
      icon: Activity,
      perform: () => setActivePanel("system"),
    },
    {
      id: "tab-settings",
      title: "Settings & Config",
      category: "Navigation",
      icon: Settings,
      perform: () => setActivePanel("settings"),
    },
    {
      id: "model-gemma",
      title: "Switch to Gemma 4 (2B MLX)",
      category: "Models",
      icon: Cpu,
      perform: () => setSelectedModel("gemma4:e2b-mlx"),
    },
    {
      id: "model-llama",
      title: "Switch to Llama 3.2",
      category: "Models",
      icon: Cpu,
      perform: () => setSelectedModel("llama3.2:latest"),
    },
    {
      id: "new-session",
      title: "Start New Session",
      category: "Actions",
      icon: Sparkles,
      perform: () => {
        resetSession();
        setActivePanel("chat");
      },
    },
  ];

  const filtered = actions.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-background/60 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center px-4 py-3 border-b border-border gap-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search models, tools..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No matching commands or models found.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.perform();
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs hover:bg-secondary transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-foreground">
                      {item.title}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {item.category}
                  </Badge>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-secondary/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Active: {selectedModel}</span>
          <span className="font-mono text-[10px]">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
