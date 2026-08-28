"use client";

import { useChatStore } from "@/store/useChatStore";
import { ArrowUp, FileText, Loader2, Paperclip, X } from "lucide-react";
import { KeyboardEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { parseDocument } from "@/lib/documentParser";
import { ChatAttachment } from "@/lib/types";

interface ChatInputProps {
  onSendMessage: (content: string, attachment?: ChatAttachment) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<ChatAttachment | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const { isStreaming } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const parsed = await parseDocument(file);
      setAttachedFile(parsed);
    } catch {
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.name.split(".").pop() || "doc",
        content: "[Unable to extract text from document]",
      });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || isStreaming || isParsing) return;

    onSendMessage(trimmed, attachedFile || undefined);
    setInput("");
    setAttachedFile(null);
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

  const canSubmit = (input.trim().length > 0 || attachedFile !== null) && !isStreaming && !isParsing;

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
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.odt,.ods,.odp,.epub,.rtf,.txt,.md,.markdown,.json,.csv,.tsv,.xml,.yaml,.yml,.py,.js,.ts,.tsx,.jsx,.rs,.go,.java,.c,.cpp,.h,.cs,.sh,.bash,.sql,.html,.css,.log,*/*"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || isParsing}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 cursor-pointer"
              title="Attach document"
            >
              {isParsing ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>
            {attachedFile && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 border border-border text-xs text-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[140px] truncate">{attachedFile.name}</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground ml-1 cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

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



