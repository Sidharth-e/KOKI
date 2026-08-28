import { ChatMessage } from "@/lib/types";
import { ToolCallCard } from "./ToolCallCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Bot, Check, Copy, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === "assistant";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className={cn(
        "flex gap-3 max-w-4xl w-full mx-auto py-3 px-4 rounded-xl transition-colors",
        isAssistant ? "bg-card/60 border border-border/60" : "bg-transparent"
      )}
    >
      <div className="shrink-0 mt-0.5">
        {isAssistant ? (
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <Bot className="h-4 w-4" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground border border-border flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {isAssistant ? "KOKI Assistant" : "You"}
            </span>
            {message.model && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                {message.model}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
              title="Copy message"
            >
              {copied ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1 my-2">
            {message.toolCalls.map((toolCall, idx) => (
              <ToolCallCard key={idx} toolCall={toolCall} />
            ))}
          </div>
        )}

        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
}
