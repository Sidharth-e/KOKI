"use client";

import { useAppStore } from "@/store/useAppStore";
import { invokeCommand } from "@/lib/tauri";
import { ModelConfig, Neo4jStatus, OllamaModel, ProviderType } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  Check,
  Cloud,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Globe,
  Key,
  Layers,
  Moon,
  RefreshCw,
  Server,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const PROVIDER_PRESETS: {
  id: ProviderType;
  name: string;
  mode: "local" | "cloud";
  defaultEndpoint: string;
  defaultModel: string;
  description: string;
  badge: string;
}[] = [
  {
    id: "ollama_local",
    name: "Ollama (Local Daemon)",
    mode: "local",
    defaultEndpoint: "http://127.0.0.1:11434",
    defaultModel: "gemma4:31b",
    description: "Local daemon running on this machine (zero latency, private)",
    badge: "Local",
  },
  {
    id: "ollama_cloud",
    name: "Ollama Cloud API",
    mode: "cloud",
    defaultEndpoint: "https://api.ollama.com",
    defaultModel: "glm-5.3-flash:cloud",
    description: "Remote cloud-accelerated Ollama inference cluster",
    badge: "Cloud",
  },
  {
    id: "openai",
    name: "OpenAI Compatible",
    mode: "cloud",
    defaultEndpoint: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    description: "Standard OpenAI /v1 endpoint format",
    badge: "Cloud",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    mode: "cloud",
    defaultEndpoint: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
    description: "Unified AI gateway to 200+ foundation models",
    badge: "Cloud",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    mode: "cloud",
    defaultEndpoint: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-7-sonnet-20250219",
    description: "Direct Claude model execution via x-api-key",
    badge: "Cloud",
  },
  {
    id: "custom",
    name: "Custom LLM Gateway",
    mode: "cloud",
    defaultEndpoint: "http://127.0.0.1:8000/v1",
    defaultModel: "custom-model",
    description: "vLLM, LM Studio, or self-hosted API gateway",
    badge: "Custom",
  },
];

export function SettingsView() {
  const {
    modelConfig,
    setModelConfig,
    systemPrompt,
    setSystemPrompt,
    theme,
  } = useAppStore();

  const [formConfig, setFormConfig] = useState<ModelConfig>(modelConfig);
  const [promptInput, setPromptInput] = useState(systemPrompt);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    setFormConfig(modelConfig);
  }, [modelConfig]);

  const { data: discoveredModels, refetch: refetchModels, isFetching: isScanningModels } = useQuery({
    queryKey: ["discovered-models", formConfig.provider, formConfig.endpoint, formConfig.api_key],
    queryFn: async () => {
      return await invokeCommand<OllamaModel[]>("list_models_for_config", {
        config: formConfig,
      });
    },
    enabled: false,
  });

  const { data: neo4jStatus, refetch: refetchNeo4j, isFetching: isCheckingNeo4j } = useQuery({
    queryKey: ["neo4j-status"],
    queryFn: async () => {
      return await invokeCommand<Neo4jStatus>("check_neo4j_status");
    },
  });

  const handleProviderChange = (providerId: ProviderType) => {
    const preset = PROVIDER_PRESETS.find((p) => p.id === providerId);
    if (!preset) return;

    setFormConfig((prev) => ({
      ...prev,
      provider: preset.id,
      mode: preset.mode,
      endpoint: preset.defaultEndpoint,
      model_name: prev.model_name || preset.defaultModel,
    }));
    setTestStatus("idle");
    setTestError(null);
  };

  const handleModeToggle = (mode: "local" | "cloud") => {
    if (mode === "local") {
      handleProviderChange("ollama_local");
    } else {
      handleProviderChange("ollama_cloud");
    }
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestError(null);
    try {
      const ok = await invokeCommand<boolean>("test_model_connection", {
        config: formConfig,
      });
      if (ok) {
        setTestStatus("success");
        refetchModels();
      } else {
        setTestStatus("error");
        setTestError("Endpoint is unreachable or returned an error status.");
      }
    } catch (err: unknown) {
      setTestStatus("error");
      setTestError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = () => {
    setModelConfig(formConfig);
    setSystemPrompt(promptInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activePreset = PROVIDER_PRESETS.find((p) => p.id === formConfig.provider) || PROVIDER_PRESETS[0];

  return (
    <div className="space-y-4 pb-4">
      <Card className="p-4 space-y-3 bg-secondary/20 border-border/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-semibold text-foreground">
                Inference Runtime Architecture
              </CardTitle>
              <CardDescription className="text-[11px]">
                Switch dynamically between local hardware and cloud providers
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={formConfig.mode === "cloud" ? "secondary" : "default"}
            className="text-[10px] font-mono capitalize gap-1"
          >
            {formConfig.mode === "cloud" ? <Cloud className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
            {formConfig.mode} Mode
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleModeToggle("local")}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              formConfig.mode === "local"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background/80 text-muted-foreground border-border hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Local Inference (Ollama)</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeToggle("cloud")}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              formConfig.mode === "cloud"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background/80 text-muted-foreground border-border hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <Cloud className="h-3.5 w-3.5" />
            <span>Cloud Model Provider</span>
          </button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-xs font-semibold text-foreground">
              Provider Factory Configuration
            </CardTitle>
            <CardDescription className="text-[11px]">
              Single source of truth for model endpoints and API keys
            </CardDescription>
          </div>
        </div>

        <div className="space-y-3 pt-1 border-t border-border/50">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
              <span>Provider Engine</span>
              <span className="text-[10px] text-muted-foreground">{activePreset.description}</span>
            </label>
            <select
              value={formConfig.provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
              className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              {PROVIDER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id} className="bg-card text-foreground">
                  {preset.name} [{preset.badge}]
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-muted-foreground" />
                Base Server Endpoint URL
              </span>
              <button
                type="button"
                onClick={() => setFormConfig((p) => ({ ...p, endpoint: activePreset.defaultEndpoint }))}
                className="text-[10px] text-primary hover:underline"
              >
                Reset to Default
              </button>
            </label>
            <Input
              value={formConfig.endpoint}
              onChange={(e) => {
                setFormConfig((prev) => ({ ...prev, endpoint: e.target.value }));
                setTestStatus("idle");
              }}
              placeholder={activePreset.defaultEndpoint}
              className="font-mono text-xs h-9 bg-secondary/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="h-3 w-3 text-muted-foreground" />
                Provider API Key
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formConfig.mode === "local" ? "Optional for local daemon" : "Required for cloud inference"}
              </span>
            </label>
            <div className="relative flex items-center">
              <Input
                type={showApiKey ? "text" : "password"}
                value={formConfig.api_key || ""}
                onChange={(e) => {
                  setFormConfig((prev) => ({ ...prev, api_key: e.target.value }));
                  setTestStatus("idle");
                }}
                placeholder={formConfig.mode === "local" ? "None required (local runtime)" : "Enter API key / bearer token"}
                className="font-mono text-xs h-9 pr-10 bg-secondary/40"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                Active Model Name
              </span>
              <span className="text-[10px] font-mono text-primary">{formConfig.model_name}</span>
            </label>

            {discoveredModels && discoveredModels.length > 0 ? (
              <select
                value={formConfig.model_name}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, model_name: e.target.value }))}
                className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                {discoveredModels.map((m) => (
                  <option key={m.name} value={m.name} className="bg-card text-foreground">
                    {m.name} {m.parameter_size ? `(${m.parameter_size})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={formConfig.model_name}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, model_name: e.target.value }))}
                placeholder={activePreset.defaultModel}
                className="font-mono text-xs h-9 bg-secondary/40"
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testStatus === "testing"}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className={`h-3 w-3 ${testStatus === "testing" || isScanningModels ? "animate-spin" : ""}`} />
              {testStatus === "testing" ? "Testing..." : "Test Connection & Models"}
            </Button>

            {testStatus === "success" && (
              <Badge variant="success" className="text-[10px] font-mono gap-1">
                <Check className="h-3 w-3" />
                Connected & Ready
              </Badge>
            )}

            {testStatus === "error" && (
              <Badge variant="error" className="text-[10px] font-mono">
                Connection Failed
              </Badge>
            )}
          </div>

          {testError && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-[11px] text-destructive">
              {testError}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-semibold text-foreground">
                Inference Parameters & Sampling
              </CardTitle>
              <CardDescription className="text-[11px]">
                Adjust temperature and reasoning parameters
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            T: {formConfig.temperature ?? 0.3}
          </Badge>
        </div>

        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Deterministic (0.0)</span>
            <span>Creative (1.0)</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={formConfig.temperature ?? 0.3}
            onChange={(e) =>
              setFormConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
            }
            className="w-full accent-primary cursor-pointer"
          />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
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
              {saved ? "Saved & Applied" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
