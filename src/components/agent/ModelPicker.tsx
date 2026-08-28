"use client";

import { useAppStore } from "@/store/useAppStore";
import { invokeCommand } from "@/lib/tauri";
import { OllamaModel } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Check, Cpu, HardDrive, RefreshCw } from "lucide-react";

export function ModelPicker() {
  const { selectedModel, setSelectedModel, ollamaEndpoint } = useAppStore();

  const { data: models, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ollama-models", ollamaEndpoint],
    queryFn: async () => {
      return await invokeCommand<OllamaModel[]>("list_ollama_models", { endpoint: ollamaEndpoint });
    },
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Local LLM Models
          </CardTitle>
          <CardDescription className="text-xs">
            Models detected from your local Ollama runtime
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 gap-1 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Scanning local models...
          </div>
        ) : isError ? (
          <div className="py-4 px-3 rounded-lg bg-error/10 border border-error/20 text-xs text-error">
            Failed to fetch models: {String(error)}. Ensure Ollama is running (`ollama serve`).
          </div>
        ) : !models || models.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No models found. Run <code className="bg-secondary px-1 py-0.5 rounded text-foreground">ollama pull llama3.2</code> in your terminal.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {models.map((model) => {
              const isSelected = selectedModel === model.name;
              return (
                <div
                  key={model.name}
                  onClick={() => setSelectedModel(model.name)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono font-semibold text-foreground">
                        {model.name}
                      </span>
                      {model.parameter_size && (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                            {model.parameter_size}
                          </Badge>
                          {model.quantization_level && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              {model.quantization_level}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatBytes(model.size)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
