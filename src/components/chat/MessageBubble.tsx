import { ChatMessage } from "@/lib/types";
import { ToolCallCard } from "./ToolCallCard";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

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

  if (!isAssistant) {
    return (
      <div className="flex justify-end w-full group">
        <div className="relative max-w-[85%] rounded-2xl bg-secondary/80 hover:bg-secondary/95 border border-border/60 px-4 py-3 text-foreground transition-colors shadow-xs">
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
          <div className="absolute right-2 -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Copy message"
            >
              {copied ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5 group">
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="space-y-1.5 my-2 max-w-full">
          {message.toolCalls.map((toolCall, idx) => (
            <ToolCallCard key={idx} toolCall={toolCall} />
          ))}
        </div>
      )}

      <MarkdownRenderer content={message.content} />

      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {message.model && (
            <span className="font-mono text-muted-foreground/80">
              {message.model}
            </span>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Copy response"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


