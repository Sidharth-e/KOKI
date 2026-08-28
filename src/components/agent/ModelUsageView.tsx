"use client";

import { useAppStore } from "@/store/useAppStore";
import { invokeCommand } from "@/lib/tauri";
import { OllamaModel } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Check,
  Clock,
  Cpu,
  HardDrive,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface ModelPreset {
  id: string;
  name: string;
  key: string;
  sessionUsage: number;
  sessionReset: string;
  allModelsUsage: number;
  allModelsReset: string;
  colorClass: string;
  barColorClass: string;
  type: "local" | "cloud";
}

const PRESETS: ModelPreset[] = [
  {
    id: "claude",
    name: "Claude 3.5 Sonnet",
    key: "claude-3.5-sonnet",
    sessionUsage: 73,
    sessionReset: "Resets in 51 min",
    allModelsUsage: 7,
    allModelsReset: "Resets Thu 12:00 AM",
    colorClass: "text-warning",
    barColorClass: "bg-warning",
    type: "cloud",
  },
  {
    id: "openai",
    name: "GPT-4o Mini",
    key: "gpt-4o-mini",
    sessionUsage: 21,
    sessionReset: "Resets in 3h 12m",
    allModelsUsage: 14,
    allModelsReset: "Resets Sat 12:00 AM",
    colorClass: "text-success",
    barColorClass: "bg-success",
    type: "cloud",
  },
  {
    id: "rig",
    name: "Rig v2 Local (Gemma)",
    key: "gemma4:e2b-mlx",
    sessionUsage: 52,
    sessionReset: "Active MLX Metal Cache",
    allModelsUsage: 38,
    allModelsReset: "RAM: 6.1 GB / 16 GB",
    colorClass: "text-primary",
    barColorClass: "bg-primary",
    type: "local",
  },
];

export function ModelUsageView() {
  const { selectedModel, setSelectedModel, ollamaEndpoint } = useAppStore();
  const [selectedPresetId, setSelectedPresetId] = useState<string>("claude");

  const currentPreset =
    PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  const {
    data: localModels,
    isLoading: loadingModels,
    refetch,
  } = useQuery({
    queryKey: ["ollama-models", ollamaEndpoint],
    queryFn: async () => {
      return await invokeCommand<OllamaModel[]>("list_ollama_models", {
        endpoint: ollamaEndpoint,
      });
    },
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-5 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              AI Engines & Quotas
            </h3>
            <p className="text-xs text-muted-foreground">
              Monitor real-time session limits, cloud quotas, and local LLM runtimes
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="h-8 gap-1 text-xs"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", loadingModels && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => {
          const isActive = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setSelectedPresetId(preset.id)}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5",
                isActive
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:bg-secondary/60"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {preset.name.split(" ")[0]}
                </span>
                <span
                  className={cn("text-xs font-bold font-mono", preset.colorClass)}
                >
                  {preset.sessionUsage}%
                </span>
              </div>
              <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", preset.barColorClass)}
                  style={{ width: `${preset.sessionUsage}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "p-1.5 rounded-lg bg-secondary",
                currentPreset.colorClass
              )}
            >
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground">
                {currentPreset.name}
              </h4>
              <p className="text-[11px] text-muted-foreground font-mono">
                {currentPreset.key}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant={selectedModel === currentPreset.key ? "secondary" : "primary"}
            className="h-7 text-xs gap-1"
            onClick={() => setSelectedModel(currentPreset.key)}
          >
            {selectedModel === currentPreset.key ? (
              <>
                <Check className="w-3 h-3 text-success" />
                Active Model
              </>
            ) : (
              "Set Active"
            )}
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                Current session
              </span>
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {currentPreset.sessionReset}
              </span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  currentPreset.barColorClass
                )}
                style={{ width: `${currentPreset.sessionUsage}%` }}
              />
            </div>
            <div className="text-xs font-semibold text-foreground font-mono">
              {currentPreset.sessionUsage}% Used
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                All models / System pool
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {currentPreset.allModelsReset}
              </span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-300"
                style={{ width: `${currentPreset.allModelsUsage}%` }}
              />
            </div>
            <div className="text-xs font-semibold text-foreground font-mono">
              {currentPreset.allModelsUsage}% Used
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            Detected Local Ollama Models
          </h4>
          <span className="text-[11px] text-muted-foreground">
            {localModels ? `${localModels.length} models ready` : "Scanning..."}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {localModels?.map((model) => {
            const isCurrent = selectedModel === model.name;
            return (
              <div
                key={model.name}
                onClick={() => setSelectedModel(model.name)}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2",
                  isCurrent
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:bg-secondary/60"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {model.name}
                    </span>
                    {model.parameter_size && (
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 font-mono"
                        >
                          {model.parameter_size}
                        </Badge>
                        {model.quantization_level && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 font-mono"
                          >
                            {model.quantization_level}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {isCurrent && (
                    <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <HardDrive className="h-3 w-3" />
                  <span>{formatBytes(model.size)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
