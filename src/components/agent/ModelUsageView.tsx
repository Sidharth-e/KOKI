"use client";

import { useAppStore } from "@/store/useAppStore";
import { invokeCommand } from "@/lib/tauri";
import { OllamaModel } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Check,
  Cpu,
  HardDrive,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";

export function ModelUsageView() {
  const { selectedModel, setSelectedModel, ollamaEndpoint } = useAppStore();

  const {
    data: localModels,
    isLoading: loadingModels,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ollama-models", ollamaEndpoint],
    queryFn: async () => {
      return await invokeCommand<OllamaModel[]>("list_ollama_models", {
        endpoint: ollamaEndpoint,
      });
    },
  });

  const activeModelDetails = localModels?.find((m) => m.name === selectedModel);

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-5 pb-8 space-y-4">
      <Card className="p-4 bg-primary/5 border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Active Inference Engine
              </span>
              <h4 className="text-sm font-bold font-mono text-foreground">
                {selectedModel}
              </h4>
            </div>
          </div>
          <Badge variant="default" className="text-[10px] font-mono gap-1">
            <Check className="w-3 h-3" />
            Ready
          </Badge>
        </div>

        {activeModelDetails && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-primary/15 text-xs">
            {activeModelDetails.parameter_size && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {activeModelDetails.parameter_size}
              </Badge>
            )}
            {activeModelDetails.quantization_level && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {activeModelDetails.quantization_level}
              </Badge>
            )}
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto font-mono">
              <HardDrive className="w-3 h-3" />
              {formatBytes(activeModelDetails.size)}
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">
              Installed Ollama Models ({localModels?.length || 0})
            </h4>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-7 text-xs gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw
              className={cn("w-3 h-3", loadingModels && "animate-spin")}
            />
            Scan Runtime
          </Button>
        </div>

        {loadingModels ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            Scanning local Ollama models...
          </div>
        ) : isError ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
            <p className="font-semibold">Ollama Daemon Unreachable</p>
            <p className="text-muted-foreground">
              Make sure Ollama is running (`ollama serve`) at {ollamaEndpoint}.
            </p>
          </div>
        ) : !localModels || localModels.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <p>No models detected on host.</p>
            <code className="px-2 py-1 rounded bg-secondary text-foreground text-[11px] font-mono">
              ollama run llama3.2
            </code>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {localModels.map((model) => {
              const isCurrent = selectedModel === model.name;
              return (
                <button
                  key={model.name}
                  onClick={() => setSelectedModel(model.name)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrent
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-secondary/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="space-y-1 min-w-0">
                      <span className="text-xs font-mono font-bold text-foreground block truncate">
                        {model.name}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {model.parameter_size && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 font-mono"
                          >
                            {model.parameter_size}
                          </Badge>
                        )}
                        {model.quantization_level && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 font-mono"
                          >
                            {model.quantization_level}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {isCurrent && (
                      <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1.5 border-t border-border/40 font-mono">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatBytes(model.size)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
