"use client";

import { invokeCommand } from "@/lib/tauri";
import { ToolDefinition } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Play, Terminal, Wrench } from "lucide-react";
import { useState } from "react";

export function ToolInspector() {
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [toolResults, setToolResults] = useState<Record<string, unknown>>({});

  const { data: tools, isLoading } = useQuery({
    queryKey: ["rig-tools"],
    queryFn: async () => {
      return await invokeCommand<ToolDefinition[]>("get_available_tools");
    },
  });

  const handleTestTool = async (toolName: string) => {
    setRunningTool(toolName);
    try {
      let args: Record<string, unknown> = {};
      if (toolName === "calculate_expression") {
        args = { expression: "128 * 4 + 512" };
      } else if (toolName === "list_directory") {
        args = { path: "." };
      }

      const result = await invokeCommand<unknown>("run_tool_direct", {
        toolName,
        arguments: args,
      });

      setToolResults((prev) => ({ ...prev, [toolName]: result }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setToolResults((prev) => ({ ...prev, [toolName]: { error: msg } }));
    } finally {
      setRunningTool(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
        <Wrench className="w-5 h-5 text-primary animate-spin" />
        Loading native tool registry...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Registered Rust Tools ({tools?.length || 0})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools?.map((tool) => {
          const hasResult = tool.name in toolResults;
          const isExecuting = runningTool === tool.name;

          return (
            <Card key={tool.name} className="p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Terminal className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-mono font-bold text-foreground truncate">
                      {tool.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                    Rust Native
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-snug">
                  {tool.description}
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border/50">
                {hasResult && (
                  <div className="p-2 rounded-lg bg-secondary/80 border border-border text-[11px] font-mono space-y-1">
                    <div className="flex items-center gap-1 text-success text-[10px] font-semibold">
                      <CheckCircle2 className="h-3 w-3" />
                      Output
                    </div>
                    <pre className="overflow-x-auto text-foreground custom-scrollbar max-h-24">
                      {JSON.stringify(toolResults[tool.name], null, 2)}
                    </pre>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5 h-8"
                  disabled={isExecuting}
                  onClick={() => handleTestTool(tool.name)}
                >
                  <Play className="h-3 w-3 text-primary" />
                  {isExecuting ? "Executing..." : "Test Run Tool"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
