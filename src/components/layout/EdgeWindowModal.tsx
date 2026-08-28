"use client";

import { useAppStore, ActiveDockWindow } from "@/store/useAppStore";
import { useChatStore } from "@/store/useChatStore";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ModelUsageView } from "@/components/agent/ModelUsageView";
import { ToolInspector } from "@/components/agent/ToolInspector";
import { SystemMonitor } from "@/components/agent/SystemMonitor";
import { SettingsView } from "@/components/agent/SettingsView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bot,
  MessageSquare,
  Settings,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

interface WindowMeta {
  title: string;
  subtitle: string;
  icon: typeof MessageSquare;
  arrowClass: string;
}

const WINDOW_META: Record<NonNullable<ActiveDockWindow>, WindowMeta> = {
  chat: {
    title: "KOKI Assistant",
    subtitle: "Rig v2 Local Agent",
    icon: Bot,
    arrowClass: "top-[calc(50%-158px)]",
  },
  usage: {
    title: "Model Quotas & Engines",
    subtitle: "Session Limits & Local LLMs",
    icon: Sparkles,
    arrowClass: "top-[calc(50%-79px)]",
  },
  tools: {
    title: "Agent Tool Registry",
    subtitle: "Native Rig System Tools",
    icon: Wrench,
    arrowClass: "top-[calc(50%-0px)]",
  },
  system: {
    title: "Host System Monitor",
    subtitle: "Hardware & Memory Telemetry",
    icon: Activity,
    arrowClass: "top-[calc(50%+79px)]",
  },
  settings: {
    title: "Configuration",
    subtitle: "Ollama Endpoints & System Prompts",
    icon: Settings,
    arrowClass: "top-[calc(50%+158px)]",
  },
};

export function EdgeWindowModal() {
  const { activeWindow, setActiveWindow, selectedModel } = useAppStore();
  const { messages, clearMessages, resetSession } = useChatStore();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeWindow) {
        setActiveWindow(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeWindow, setActiveWindow]);

  if (!activeWindow) return null;

  const meta = WINDOW_META[activeWindow];
  const Icon = meta.icon;

  return (
    <div className="fixed right-20 top-1/2 -translate-y-1/2 z-40 flex items-center animate-in fade-in zoom-in-95 duration-200">
      <div
        ref={modalRef}
        className="relative w-[520px] lg:w-[640px] h-[78vh] max-h-[720px] rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl flex flex-col overflow-hidden select-none"
      >
        <div
          className={cn(
            "absolute -right-2.5 w-0 h-0 border-y-[9px] border-y-transparent border-l-[10px] border-l-card transition-all duration-300 pointer-events-none",
            meta.arrowClass
          )}
        />

        <div className="h-13 px-4 border-b border-border bg-card/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-foreground tracking-tight">
                  {meta.title}
                </h3>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                  {selectedModel}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{meta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {activeWindow === "chat" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetSession}
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                  title="New Session"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-primary" />
                  New
                </Button>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearMessages}
                    className="h-7 text-xs px-2 text-muted-foreground hover:text-error"
                    title="Clear Messages"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </>
            )}

            <button
              onClick={() => setActiveWindow(null)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Close window (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeWindow === "chat" && <ChatInterface />}
          {activeWindow === "usage" && <ModelUsageView />}
          {activeWindow === "tools" && (
            <div className="h-full overflow-y-auto p-5 custom-scrollbar">
              <ToolInspector />
            </div>
          )}
          {activeWindow === "system" && (
            <div className="h-full overflow-y-auto p-5 custom-scrollbar">
              <SystemMonitor />
            </div>
          )}
          {activeWindow === "settings" && (
            <div className="h-full overflow-y-auto p-5 custom-scrollbar">
              <SettingsView />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
