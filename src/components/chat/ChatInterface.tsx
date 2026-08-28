"use client";

import { useAppStore } from "@/store/useAppStore";
import { useChatStore } from "@/store/useChatStore";
import { invokeCommand, listenToEvent } from "@/lib/tauri";
import { AgentResponse, StreamChunkPayload, ToolCallInfo, ToolStatusPayload } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ChatInterface() {
  const { selectedModel, systemPrompt } = useAppStore();
  const {
    messages,
    isStreaming,
    streamingContent,
    activeToolStatus,
    currentSessionId,
    addMessage,
    updateMessageContent,
    setIsStreaming,
    appendStreamContent,
    clearStreamingContent,
    setActiveToolStatus,
  } = useChatStore();

  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCallInfo[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unlistenChunk: (() => void) | undefined;
    let unlistenTool: (() => void) | undefined;
    let isCancelled = false;

    const setupListeners = async () => {
      const unChunk = await listenToEvent<StreamChunkPayload>(
        "assistant-stream-chunk",
        (event) => {
          if (event.payload.session_id === useChatStore.getState().currentSessionId) {
            if (event.payload.chunk) {
              useChatStore.getState().appendStreamContent(event.payload.chunk);
            }
          }
        }
      );

      if (isCancelled) {
        unChunk();
      } else {
        unlistenChunk = unChunk;
      }

      const unTool = await listenToEvent<ToolStatusPayload>(
        "assistant-tool-status",
        (event) => {
          if (event.payload.session_id === useChatStore.getState().currentSessionId) {
            useChatStore.getState().setActiveToolStatus(event.payload);
          }
        }
      );

      if (isCancelled) {
        unTool();
      } else {
        unlistenTool = unTool;
      }
    };

    setupListeners();

    return () => {
      isCancelled = true;
      if (unlistenChunk) unlistenChunk();
      if (unlistenTool) unlistenTool();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, activeToolStatus]);

  const handleSendMessage = async (prompt: string) => {
    addMessage({
      role: "user",
      content: prompt,
    });

    setIsStreaming(true);
    clearStreamingContent();
    setActiveToolStatus(null);
    setCurrentToolCalls([]);

    const historyPayload = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await invokeCommand<AgentResponse>("ask_assistant", {
        sessionId: currentSessionId,
        request: {
          prompt,
          model: selectedModel,
          system_prompt: systemPrompt,
          temperature: 0.7,
          history: historyPayload,
        },
      });

      addMessage({
        role: "assistant",
        content: response.response,
        model: response.model,
        toolCalls: response.tool_calls,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addMessage({
        role: "assistant",
        content: `Error invoking local agent: ${errorMessage}. Make sure Ollama is running ('ollama serve') with model '${selectedModel}' installed.`,
        model: "error",
      });
    } finally {
      setIsStreaming(false);
      clearStreamingContent();
      setActiveToolStatus(null);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden bg-transparent">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">KOKI AI Assistant</h2>
              <p className="text-xs text-muted-foreground max-w-sm">
                Local-first agent powered by Rig and Tauri v2. Ask questions or run native tools without cloud latency.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}

        {isStreaming && (
          <div className="w-full space-y-2.5">
            {activeToolStatus && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border/80 text-xs font-mono text-foreground">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>Executing {activeToolStatus.tool_name}...</span>
              </div>
            )}

            {streamingContent ? (
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                {streamingContent}
              </div>
            ) : (
              <div className="py-2">
                <LoadingAnimation size="md" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 bg-card/40 backdrop-blur-md">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}

