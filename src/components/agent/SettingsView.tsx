"use client";

import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ModelPicker } from "./ModelPicker";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Check, Moon, Settings, Sparkles } from "lucide-react";
import { useState } from "react";

export function SettingsView() {
  const { ollamaEndpoint, setOllamaEndpoint, systemPrompt, setSystemPrompt, theme } = useAppStore();
  const [endpointInput, setEndpointInput] = useState(ollamaEndpoint);
  const [promptInput, setPromptInput] = useState(systemPrompt);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setOllamaEndpoint(endpointInput);
    setSystemPrompt(promptInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col space-y-1">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Assistant Configuration
        </h2>
        <p className="text-xs text-muted-foreground">
          Manage your local runtime connections, models, and agent instructions.
        </p>
      </div>

      <ModelPicker />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Moon className="h-4 w-4 text-primary" />
                Appearance Theme
              </CardTitle>
              <CardDescription className="text-xs">
                Switch between dark and light appearance modes (Current: {theme})
              </CardDescription>
            </div>
            <ThemeToggle />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Ollama Server Endpoint</CardTitle>
          <CardDescription className="text-xs">
            HTTP URL where your local Ollama daemon is hosted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={endpointInput}
            onChange={(e) => setEndpointInput(e.target.value)}
            placeholder="http://127.0.0.1:11434"
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Agent System Preamble
          </CardTitle>
          <CardDescription className="text-xs">
            Base persona and instructions provided to the Rig agent engine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSave} className="gap-1.5 text-xs">
              {saved ? <Check className="h-3.5 w-3.5 text-success-foreground" /> : null}
              {saved ? "Saved" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
