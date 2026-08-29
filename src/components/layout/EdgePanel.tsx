"use client";

import { useAppStore, ActiveDockPanel } from "@/store/useAppStore";
import { useChatStore } from "@/store/useChatStore";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ModelUsageView } from "@/components/agent/ModelUsageView";
import { ToolInspector } from "@/components/agent/ToolInspector";
import { SystemMonitor } from "@/components/agent/SystemMonitor";
import { SettingsView } from "@/components/agent/SettingsView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { panelMotion, microSpring } from "@/lib/animations";
import { AnimatePresence, motion } from "motion/react";
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

interface PanelMeta {
  title: string;
  subtitle: string;
  icon: typeof MessageSquare;
  arrowClass: string;
}

const PANEL_META: Record<NonNullable<ActiveDockPanel>, PanelMeta> = {
  chat: {
    title: "KOKI Assistant",
    subtitle: "Rig v2 Local Agent",
    icon: Bot,
    arrowClass: "top-[calc(50%-104px)]",
  },
  usage: {
    title: "Model Quotas & Engines",
    subtitle: "Session Limits & Local LLMs",
    icon: Sparkles,
    arrowClass: "top-[calc(50%-52px)]",
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
    arrowClass: "top-[calc(50%+52px)]",
  },
  settings: {
    title: "Configuration",
    subtitle: "Ollama Endpoints & System Prompts",
    icon: Settings,
    arrowClass: "top-[calc(50%+104px)]",
  },
};

export function EdgePanel() {
  const { activePanel, setActivePanel, selectedModel } = useAppStore();
  const { messages, clearMessages, resetSession } = useChatStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activePanel) {
        setActivePanel(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePanel, setActivePanel]);

  const meta = activePanel ? PANEL_META[activePanel] : null;
  const Icon = meta ? meta.icon : null;

  return (
    <AnimatePresence mode="wait">
      {activePanel && meta && Icon && (
        <div
          key="edge-panel-positioner"
          className="fixed right-[72px] top-1/2 -translate-y-1/2 z-40 flex items-center pointer-events-auto"
        >
          <motion.div
            ref={panelRef}
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-[620px] h-[78vh] max-h-[720px] rounded-2xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl flex flex-col overflow-hidden select-text"
          >
            <div
              className={cn(
                "absolute -right-2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[8px] border-l-card transition-all duration-300 pointer-events-none",
                meta.arrowClass
              )}
            />

            <div className="h-14 px-4 border-b border-border bg-card/90 backdrop-blur-md flex items-center justify-between shrink-0">
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
                {activePanel === "chat" && (
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

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={microSpring}
                  onClick={() => setActivePanel(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="Close panel (ESC)"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activePanel}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="h-full w-full"
                >
                  {activePanel === "chat" && <ChatInterface />}
                  {activePanel === "usage" && <ModelUsageView />}
                  {activePanel === "tools" && (
                    <div className="h-full overflow-y-auto p-5 pb-8 custom-scrollbar">
                      <ToolInspector />
                    </div>
                  )}
                  {activePanel === "system" && (
                    <div className="h-full overflow-y-auto p-5 pb-8 custom-scrollbar">
                      <SystemMonitor />
                    </div>
                  )}
                  {activePanel === "settings" && (
                    <div className="h-full overflow-y-auto p-5 pb-8 custom-scrollbar">
                      <SettingsView />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
