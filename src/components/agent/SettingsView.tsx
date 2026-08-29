"use client";

import { useAppStore } from "@/store/useAppStore";
import { invokeCommand } from "@/lib/tauri";
import { ModelConfig, Neo4jConfig, Neo4jStatus, OllamaModel, ProviderType } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
  RefreshCw,
  Sliders,
  Sparkles,
  User,
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
    id: "openrouter",
    name: "OpenRouter",
    mode: "cloud",
    defaultEndpoint: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
    description: "Unified AI gateway with model listing API",
    badge: "Cloud",
  },
];

export function SettingsView() {
  const {
    modelConfig,
    setModelConfig,
    neo4jConfig,
    setNeo4jConfig,
    systemPrompt,
    setSystemPrompt,
  } = useAppStore();

  const [formConfig, setFormConfig] = useState<ModelConfig>(modelConfig);
  const [formNeo4j, setFormNeo4j] = useState<Neo4jConfig>(neo4jConfig);
  const [promptInput, setPromptInput] = useState(systemPrompt);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showNeo4jPass, setShowNeo4jPass] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isCustomModelMode, setIsCustomModelMode] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [neo4jTestStatus, setNeo4jTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [neo4jTestResult, setNeo4jTestResult] = useState<Neo4jStatus | null>(null);

  useEffect(() => {
    setFormConfig(modelConfig);
  }, [modelConfig]);

  useEffect(() => {
    setFormNeo4j(neo4jConfig);
  }, [neo4jConfig]);

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

  const handleTestNeo4j = async () => {
    setNeo4jTestStatus("testing");
    try {
      const res = await invokeCommand<Neo4jStatus>("test_neo4j_connection", {
        config: formNeo4j,
      });
      setNeo4jTestResult(res);
      setNeo4jTestStatus(res.connected ? "success" : "error");
    } catch (err: unknown) {
      setNeo4jTestStatus("error");
      setNeo4jTestResult({
        connected: false,
        uri: formNeo4j.uri,
        node_count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleSave = () => {
    setModelConfig(formConfig);
    setNeo4jConfig(formNeo4j);
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
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                Active Model Name
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-primary truncate max-w-[160px]">
                  {formConfig.model_name}
                </span>
                {discoveredModels && discoveredModels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCustomModelMode(!isCustomModelMode)}
                    className="text-[10px] text-primary hover:underline font-mono"
                  >
                    {isCustomModelMode ? "← API Catalog" : "+ Custom Tag"}
                  </button>
                )}
              </div>
            </div>

            {discoveredModels && discoveredModels.length > 0 && !isCustomModelMode ? (
              <div className="space-y-1.5">
                <select
                  value={formConfig.model_name}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomModelMode(true);
                    } else {
                      setFormConfig((prev) => ({ ...prev, model_name: e.target.value }));
                    }
                  }}
                  className="w-full h-9 rounded-lg border border-border bg-secondary/50 px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  {!discoveredModels.some((m) => m.name === formConfig.model_name) && formConfig.model_name && (
                    <option value={formConfig.model_name} className="bg-card text-foreground">
                      {formConfig.model_name} (Custom)
                    </option>
                  )}
                  {discoveredModels.map((m) => (
                    <option key={m.name} value={m.name} className="bg-card text-foreground">
                      {m.name} {m.parameter_size ? `(${m.parameter_size})` : ""}
                    </option>
                  ))}
                  <option value="__custom__" className="bg-card text-primary font-semibold">
                    + Enter custom / unlisted model...
                  </option>
                </select>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{discoveredModels.length} models detected from endpoint</span>
                  <button
                    type="button"
                    onClick={() => setIsCustomModelMode(true)}
                    className="text-primary hover:underline"
                  >
                    Add custom tag
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Input
                  value={formConfig.model_name}
                  onChange={(e) => setFormConfig((prev) => ({ ...prev, model_name: e.target.value }))}
                  placeholder={activePreset.defaultModel}
                  className="font-mono text-xs h-9 bg-secondary/40"
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    {discoveredModels && discoveredModels.length > 0
                      ? "Custom model tag input"
                      : "Type model name or test connection to discover models"}
                  </span>
                  {discoveredModels && discoveredModels.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCustomModelMode(false)}
                      className="text-primary hover:underline"
                    >
                      Browse {discoveredModels.length} discovered models
                    </button>
                  )}
                </div>
              </div>
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

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-semibold text-foreground">
                Neo4j Graph Memory Configuration
              </CardTitle>
              <CardDescription className="text-[11px]">
                Persistent AVO lineage graph & autonomous reasoning memory
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                neo4jTestResult?.connected ?? neo4jStatus?.connected
                  ? "success"
                  : "error"
              }
              className="text-[10px] font-mono capitalize"
            >
              {neo4jTestResult?.connected ?? neo4jStatus?.connected
                ? "Connected"
                : "Disconnected"}
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

        <div className="space-y-3 pt-1 border-t border-border/50">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-muted-foreground" />
                Neo4j Bolt URI / Cloud Host
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormNeo4j((p) => ({ ...p, uri: "127.0.0.1:7687" }))}
                  className="text-[10px] text-primary hover:underline"
                >
                  Local (127.0.0.1:7687)
                </button>
              </div>
            </div>
            <Input
              value={formNeo4j.uri}
              onChange={(e) => setFormNeo4j((p) => ({ ...p, uri: e.target.value }))}
              placeholder="127.0.0.1:7687 or neo4j+s://xxxx.databases.neo4j.io"
              className="font-mono text-xs h-9 bg-secondary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground" />
                Username
              </label>
              <Input
                value={formNeo4j.user}
                onChange={(e) => setFormNeo4j((p) => ({ ...p, user: e.target.value }))}
                placeholder="neo4j"
                className="font-mono text-xs h-9 bg-secondary/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <Database className="h-3 w-3 text-muted-foreground" />
                Database
              </label>
              <Input
                value={formNeo4j.database || "neo4j"}
                onChange={(e) => setFormNeo4j((p) => ({ ...p, database: e.target.value }))}
                placeholder="neo4j"
                className="font-mono text-xs h-9 bg-secondary/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              <Key className="h-3 w-3 text-muted-foreground" />
              Password
            </label>
            <div className="relative flex items-center">
              <Input
                type={showNeo4jPass ? "text" : "password"}
                value={formNeo4j.pass}
                onChange={(e) => setFormNeo4j((p) => ({ ...p, pass: e.target.value }))}
                placeholder="Database Password"
                className="font-mono text-xs h-9 pr-10 bg-secondary/40"
              />
              <button
                type="button"
                onClick={() => setShowNeo4jPass(!showNeo4jPass)}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNeo4jPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNeo4j}
              disabled={neo4jTestStatus === "testing"}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className={`h-3 w-3 ${neo4jTestStatus === "testing" ? "animate-spin" : ""}`} />
              {neo4jTestStatus === "testing" ? "Testing Connection..." : "Test Neo4j Connection"}
            </Button>

            <div className="text-xs font-mono text-muted-foreground">
              <span>Nodes: </span>
              <span className="text-foreground font-semibold">
                {neo4jTestResult?.node_count ?? neo4jStatus?.node_count ?? 0}
              </span>
            </div>
          </div>

          {(neo4jTestResult?.error || neo4jStatus?.error) && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-[11px] text-destructive">
              {neo4jTestResult?.error || neo4jStatus?.error}
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
              {saved ? "Saved & Applied All Settings" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
