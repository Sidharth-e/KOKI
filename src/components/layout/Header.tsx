"use client";

import { useAppStore } from "@/store/useAppStore";
import { invokeCommand } from "@/lib/tauri";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { Bot, Cpu, Menu, RefreshCw, Zap } from "lucide-react";

export function Header() {
  const { toggleSidebar, selectedModel, ollamaEndpoint } = useAppStore();

  const { data: isOllamaOnline, isLoading: isCheckingOllama, refetch: checkAgain } = useQuery({
    queryKey: ["ollama-status", ollamaEndpoint],
    queryFn: async () => {
      try {
        return await invokeCommand<boolean>("check_ollama_status", { endpoint: ollamaEndpoint });
      } catch {
        return false;
      }
    },
    refetchInterval: 10000,
  });

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
              KOKI
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono font-medium">
                RIG v2
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-secondary border border-border text-xs">
          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Model:</span>
          <span className="font-mono font-medium text-foreground">{selectedModel}</span>
        </div>

        <button
          onClick={() => checkAgain()}
          className="flex items-center gap-1 cursor-pointer"
          title="Click to re-check Ollama status"
        >
          {isCheckingOllama ? (
            <Badge variant="outline" className="gap-1 text-[11px]">
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
              Checking
            </Badge>
          ) : isOllamaOnline ? (
            <Badge variant="success" className="gap-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-success-foreground animate-pulse" />
              Ollama Active
            </Badge>
          ) : (
            <Badge variant="error" className="gap-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-error-foreground" />
              Ollama Offline
            </Badge>
          )}
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
