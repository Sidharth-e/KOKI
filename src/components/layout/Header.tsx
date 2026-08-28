"use client";

import { useAppStore } from "@/store/useAppStore";
import { invokeCommand } from "@/lib/tauri";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "./ThemeToggle";
import {
  Bot,
  Cpu,
  RefreshCw,
  Search,
  SlidersHorizontal,
  User,
  Volume2,
  VolumeX,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const {
    selectedModel,
    ollamaEndpoint,
    audioMuted,
    toggleAudioMuted,
    agentModeEnabled,
    toggleAgentMode,
    setCommandPaletteOpen,
  } = useAppStore();

  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const dayName = days[now.getDay()];
      const dayNum = now.getDate();
      const monthName = months[now.getMonth()];
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTimeString(`${dayName} ${dayNum} ${monthName} ${hours}.${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const {
    data: isOllamaOnline,
    isLoading: isCheckingOllama,
    refetch: checkAgain,
  } = useQuery({
    queryKey: ["ollama-status", ollamaEndpoint],
    queryFn: async () => {
      try {
        return await invokeCommand<boolean>("check_ollama_status", {
          endpoint: ollamaEndpoint,
        });
      } catch {
        return false;
      }
    },
    refetchInterval: 10000,
  });

  return (
    <header className="h-11 px-4 flex items-center justify-between pointer-events-auto select-none">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 dark:bg-neutral-950/80 backdrop-blur-xl border border-border/60 shadow-lg text-muted-foreground">
          <button
            onClick={toggleAudioMuted}
            className="p-1 rounded-md hover:text-foreground hover:bg-secondary/60 transition-colors"
            title={audioMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {audioMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-error" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>

          <div
            className="p-1 rounded-md hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Local Network & IPC: Online"
          >
            <Wifi className="h-3.5 w-3.5" />
          </div>

          <div
            className="p-1 rounded-md hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="User Session Active"
          >
            <User className="h-3.5 w-3.5" />
          </div>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-1 rounded-md hover:text-foreground hover:bg-secondary/60 transition-colors flex items-center gap-1 text-xs"
            title="Command Palette (Cmd+K)"
          >
            <Search className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={toggleAgentMode}
            className="p-1 rounded-md hover:text-foreground hover:bg-secondary/60 transition-colors"
            title={`Agent Auto-Execution: ${agentModeEnabled ? "ON" : "OFF"}`}
          >
            <SlidersHorizontal
              className={`h-3.5 w-3.5 ${
                agentModeEnabled ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </button>

          {timeString && (
            <span className="text-xs font-medium text-foreground tracking-tight ml-1 pl-2 border-l border-border/60">
              {timeString}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 dark:bg-neutral-950/80 backdrop-blur-xl border border-border/60 shadow-lg text-xs">
          <div className="flex items-center gap-1">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground tracking-tight">KOKI</span>
          </div>

          <span className="text-muted-foreground">|</span>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Cpu className="h-3.5 w-3.5" />
            <span className="font-mono font-medium text-foreground text-[11px]">
              {selectedModel}
            </span>
          </div>

          <button
            onClick={() => checkAgain()}
            className="cursor-pointer ml-1"
            title="Click to refresh Ollama connection status"
          >
            {isCheckingOllama ? (
              <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 rounded-full">
                <RefreshCw className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
              </Badge>
            ) : isOllamaOnline ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
            ) : (
              <span className="inline-flex rounded-full h-2 w-2 bg-error" />
            )}
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
