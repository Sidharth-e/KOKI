"use client";

import { invokeCommand } from "@/lib/tauri";
import { ToolDefinition } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-1">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Rig Agent Native Tools
        </h2>
        <p className="text-xs text-muted-foreground">
          Type-safe native tools registered in the Rust backend for zero-latency execution.
        </p>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Loading tools...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools?.map((tool) => {
            const hasResult = tool.name in toolResults;
            const isExecuting = runningTool === tool.name;

            return (
              <Card key={tool.name} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono text-foreground flex items-center gap-1.5">
                      <Terminal className="h-4 w-4 text-primary" />
                      {tool.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      Rust Native
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{tool.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="p-2 rounded bg-secondary/60 border border-border/60 text-[11px] font-mono overflow-x-auto text-muted-foreground">
                    <pre>{JSON.stringify(tool.parameters, null, 2)}</pre>
                  </div>

                  {hasResult && (
                    <div className="p-2.5 rounded bg-background border border-border text-[11px] font-mono space-y-1">
                      <div className="flex items-center gap-1 text-success text-[10px] font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        Output Result
                      </div>
                      <pre className="overflow-x-auto text-foreground">
                        {JSON.stringify(toolResults[tool.name], null, 2)}
                      </pre>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    disabled={isExecuting}
                    onClick={() => handleTestTool(tool.name)}
                  >
                    <Play className="h-3 w-3 text-primary" />
                    {isExecuting ? "Executing..." : "Test Run Tool"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
