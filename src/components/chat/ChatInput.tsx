"use client";

import { useChatStore } from "@/store/useChatStore";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { KeyboardEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [input, setInput] = useState("");
  const { isStreaming } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  const canSubmit = input.trim().length > 0 && !isStreaming;

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className="relative rounded-2xl border border-border/80 bg-secondary/30 hover:bg-secondary/40 focus-within:bg-secondary/50 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all p-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Reply or ask a follow up question..."
          rows={1}
          disabled={isStreaming}
          className="w-full resize-none bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none custom-scrollbar max-h-40 disabled:opacity-50"
        />

        <div className="flex items-center justify-between pt-2 px-1">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer",
              canSubmit
                ? "bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95"
                : "bg-muted text-muted-foreground/50 cursor-not-allowed"
            )}
            title="Send message"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

