"use client";

import { useChatStore } from "@/store/useChatStore";
import { Button } from "@/components/ui/Button";
import { ArrowUp, Loader2, Sparkles, Terminal } from "lucide-react";
import { KeyboardEvent, useRef, useState } from "react";

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

  const quickPrompts = [
    "Check system CPU and RAM metrics",
    "Calculate 145 * 38 + 920",
    "What tools are available in the Rig agent?",
  ];

  return (
    <div className="max-w-4xl w-full mx-auto p-4 space-y-3">
      {quickPrompts.length > 0 && !isStreaming && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mr-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Quick:</span>
          </div>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(prompt);
                textareaRef.current?.focus();
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-tertiary transition-colors border border-border cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="relative rounded-xl border border-border bg-card shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask KOKI anything or run agent commands (Enter to send, Shift+Enter for new line)..."
          rows={1}
          disabled={isStreaming}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none custom-scrollbar max-h-44 disabled:opacity-50"
        />

        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-secondary/30">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Terminal className="h-3 w-3 text-primary" />
            <span>Rig Local Agent</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className="h-8 px-3 rounded-lg"
          >
            {isStreaming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
