"use client";

import { useAppStore, NavTab } from "@/store/useAppStore";
import { useChatStore } from "@/store/useChatStore";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Activity,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";

export function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen } = useAppStore();
  const { messages, resetSession, clearMessages } = useChatStore();

  const navItems: { id: NavTab; label: string; icon: typeof MessageSquare }[] = [
    { id: "chat", label: "Assistant Chat", icon: MessageSquare },
    { id: "tools", label: "Agent Tools", icon: Wrench },
    { id: "system", label: "System Monitor", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (!sidebarOpen) {
    return null;
  }

  return (
    <aside className="w-64 border-r border-border bg-card/40 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none">
      <div className="p-3 border-b border-border">
        <Button
          variant="primary"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={resetSession}
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto p-3 border-t border-border space-y-2">
        <div className="p-2.5 rounded-lg bg-secondary/60 border border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium text-foreground">Rig Engine</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Native IPC</span>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-error hover:bg-error/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Message History
          </Button>
        )}
      </div>
    </aside>
  );
}
