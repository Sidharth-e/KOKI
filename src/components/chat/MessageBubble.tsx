import { ChatMessage } from "@/lib/types";
import { ToolCallCard } from "./ToolCallCard";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { gentleSpring, microSpring } from "@/lib/animations";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, ChevronUp, Copy, FileText } from "lucide-react";
import { useState } from "react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={gentleSpring}
        className="flex flex-col items-end w-full group space-y-2"
      >
        {message.attachment && (
          <div className="max-w-[85%] rounded-xl bg-secondary/90 border border-border px-3.5 py-2.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate max-w-[200px] sm:max-w-[280px]">
                    {message.attachment.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(message.attachment.size)} • {message.attachment.type.toUpperCase()}
                  </p>
                </div>
              </div>

              {message.attachment.content && (
                <button
                  type="button"
                  onClick={() => setShowDocPreview(!showDocPreview)}
                  className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/10 cursor-pointer shrink-0"
                >
                  <span>{showDocPreview ? "Hide" : "Preview"}</span>
                  {showDocPreview ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>

            <AnimatePresence>
              {showDocPreview && message.attachment.content && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-lg bg-background/80 border border-border/80 p-2.5 max-h-48 overflow-y-auto custom-scrollbar"
                >
                  <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono break-words">
                    {message.attachment.content.slice(0, 3000)}
                    {message.attachment.content.length > 3000 && "\n... [truncated for preview]"}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {message.content && (
          <div className="relative max-w-[85%] rounded-2xl bg-secondary/80 hover:bg-secondary/95 border border-border/60 px-4 py-3 text-foreground transition-colors shadow-xs">
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
            <div className="absolute right-2 -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                transition={microSpring}
                onClick={handleCopy}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                title="Copy message"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-success" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
      className="w-full space-y-2.5 group"
    >
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
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={microSpring}
            onClick={handleCopy}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Copy response"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}



