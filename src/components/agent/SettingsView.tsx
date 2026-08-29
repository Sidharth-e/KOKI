"use client";

import { useAppStore } from "@/store/useAppStore";
import { invokeCommand } from "@/lib/tauri";
import { Neo4jStatus, OllamaModel } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Check, Cpu, Database, Moon, RefreshCw, Server, Sparkles } from "lucide-react";
import { useState } from "react";

export function SettingsView() {
  const {
    ollamaEndpoint,
    setOllamaEndpoint,
    systemPrompt,
    setSystemPrompt,
    selectedModel,
    setSelectedModel,
    theme,
  } = useAppStore();
  const [endpointInput, setEndpointInput] = useState(ollamaEndpoint);
  const [promptInput, setPromptInput] = useState(systemPrompt);
  const [saved, setSaved] = useState(false);

  const { data: models } = useQuery({
    queryKey: ["ollama-models", ollamaEndpoint],
    queryFn: async () => {
      return await invokeCommand<OllamaModel[]>("list_ollama_models", {
        endpoint: ollamaEndpoint,
      });
    },
  });

  const { data: neo4jStatus, refetch: refetchNeo4j, isFetching: isCheckingNeo4j } = useQuery({
    queryKey: ["neo4j-status"],
    queryFn: async () => {
      return await invokeCommand<Neo4jStatus>("check_neo4j_status");
    },
  });

  const handleSave = () => {
    setOllamaEndpoint(endpointInput);
    setSystemPrompt(promptInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-semibold text-foreground">
                Default Local Model
              </CardTitle>
              <CardDescription className="text-[11px]">
                Active model used for local inference and agents
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {selectedModel}
          </Badge>
        </div>

        {models && models.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-secondary/60 px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.name} value={m.name} className="bg-card text-foreground">
                  {m.name} {m.parameter_size ? `(${m.parameter_size})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Moon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-semibold text-foreground">
                Appearance Theme
              </CardTitle>
              <CardDescription className="text-[11px]">
                Mode: <span className="capitalize font-mono text-foreground">{theme}</span>
              </CardDescription>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-xs font-semibold text-foreground">
              Ollama Server Endpoint
            </CardTitle>
            <CardDescription className="text-[11px]">
              Local daemon URL for model execution
            </CardDescription>
          </div>
        </div>

        <div className="pt-1">
          <Input
            value={endpointInput}
            onChange={(e) => setEndpointInput(e.target.value)}
            placeholder="http://127.0.0.1:11434"
            className="font-mono text-xs h-9"
          />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-semibold text-foreground">
                Neo4j Graph Memory
              </CardTitle>
              <CardDescription className="text-[11px]">
                NVIDIA AVO lineage and persistent knowledge graph
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={neo4jStatus?.connected ? "success" : "error"}
              className="text-[10px] font-mono capitalize"
            >
              {neo4jStatus?.connected ? "Connected" : "Disconnected"}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchNeo4j()}
              disabled={isCheckingNeo4j}
              className="h-7 w-7"
            >
              <RefreshCw className={`h-3 w-3 ${isCheckingNeo4j ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="pt-1 text-xs space-y-1 font-mono text-muted-foreground">
          <div className="flex justify-between">
            <span>URI:</span>
            <span className="text-foreground">{neo4jStatus?.uri || "127.0.0.1:7687"}</span>
          </div>
          <div className="flex justify-between">
            <span>Graph Nodes:</span>
            <span className="text-foreground">{neo4jStatus?.node_count ?? 0}</span>
          </div>
          {neo4jStatus?.error && (
            <div className="text-[10px] text-destructive pt-1">
              {neo4jStatus.error}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-xs font-semibold text-foreground">
              Agent System Preamble
            </CardTitle>
            <CardDescription className="text-[11px]">
              Base instructions for the Rig AI reasoning agent
            </CardDescription>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-secondary/30 p-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring custom-scrollbar"
          />
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSave} className="gap-1.5 text-xs h-8">
              {saved ? <Check className="h-3.5 w-3.5 text-primary-foreground" /> : null}
              {saved ? "Saved" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
