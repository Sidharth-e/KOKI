"use client";

import { useAppStore } from "@/store/useAppStore";
import { useChatStore } from "@/store/useChatStore";
import { invokeCommand, listenToEvent } from "@/lib/tauri";
import { AgentResponse, StreamChunkPayload, ToolCallInfo, ToolStatusPayload } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { Badge } from "@/components/ui/Badge";
import { Bot, Loader2, Sparkles, Wrench } from "lucide-react";
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

    const setupListeners = async () => {
      unlistenChunk = await listenToEvent<StreamChunkPayload>(
        "assistant-stream-chunk",
        (event) => {
          if (event.payload.session_id === currentSessionId) {
            if (event.payload.chunk) {
              appendStreamContent(event.payload.chunk);
            }
          }
        }
      );

      unlistenTool = await listenToEvent<ToolStatusPayload>(
        "assistant-tool-status",
        (event) => {
          if (event.payload.session_id === currentSessionId) {
            setActiveToolStatus(event.payload);
          }
        }
      );
    };

    setupListeners();

    return () => {
      if (unlistenChunk) unlistenChunk();
      if (unlistenTool) unlistenTool();
    };
  }, [currentSessionId, appendStreamContent, setActiveToolStatus]);

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
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
          <div className="flex gap-3 max-w-4xl w-full mx-auto py-3 px-4 rounded-xl bg-card/60 border border-border/60">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">KOKI Assistant</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono gap-1 text-primary">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Streaming
                </Badge>
              </div>

              {activeToolStatus && (
                <div className="p-2.5 rounded-lg bg-secondary/80 border border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span className="font-mono text-[11px] text-foreground">
                      Running tool: <strong className="text-primary">{activeToolStatus.tool_name}</strong>
                    </span>
                  </div>
                  <Badge variant="info" className="text-[10px] uppercase tracking-wider">
                    {activeToolStatus.status}
                  </Badge>
                </div>
              )}

              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                {streamingContent || (
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    Thinking and orchestrating tools...
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card/30 backdrop-blur-md">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}
