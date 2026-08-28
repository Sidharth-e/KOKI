import { ToolCallInfo } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, ChevronDown, ChevronRight, Terminal, Wrench } from "lucide-react";
import { useState } from "react";

export function ToolCallCard({ toolCall }: { toolCall: ToolCallInfo }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-border/80 bg-secondary/40 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-secondary/70 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center">
            <Wrench className="h-3 w-3" />
          </div>
          <span className="font-mono font-medium text-foreground">
            {toolCall.tool_name}
          </span>
          <Badge variant="success" className="h-4 px-1 text-[10px] gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" />
            {toolCall.duration_ms}ms
          </Badge>
        </div>
        <div className="text-muted-foreground">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-border/80 bg-background/50 space-y-2 font-mono text-[11px]">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Terminal className="h-3 w-3" />
              <span>Arguments:</span>
            </div>
            <pre className="p-2 rounded bg-secondary/80 border border-border overflow-x-auto text-foreground">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span>Result:</span>
            </div>
            <pre className="p-2 rounded bg-secondary/80 border border-border overflow-x-auto text-foreground">
              {JSON.stringify(toolCall.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
