"use client";

import { ToolCallInfo } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { modalMotion, overlayMotion, microSpring } from "@/lib/animations";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Clock,
  Cpu,
  Eye,
  FileCode,
  Globe,
  Keyboard,
  MousePointer,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";

function getToolIcon(name: string) {
  if (name.includes("screenshot")) return Camera;
  if (name.startsWith("mouse_")) return MousePointer;
  if (name.startsWith("type_") || name.startsWith("press_")) return Keyboard;
  if (name.includes("shell") || name.includes("command")) return Terminal;
  if (name.startsWith("browser_")) return Globe;
  if (name.includes("file") || name === "list_directory") return FileCode;
  if (name.startsWith("clipboard_")) return Clipboard;
  if (name === "get_system_metrics") return Cpu;
  if (name === "get_current_time") return Clock;
  if (name === "calculate_expression") return Calculator;
  return Wrench;
}

export function ToolCallCard({ toolCall }: { toolCall: ToolCallInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const Icon = getToolIcon(toolCall.tool_name);
  const result = toolCall.result as Record<string, unknown> | undefined;
  const isError = result && ("error" in result || result.success === false);
  const imageDataUri = (result?.image_data_uri as string) || undefined;
  const stdout = (result?.stdout as string) || undefined;
  const stderr = (result?.stderr as string) || undefined;
  const exitCode = typeof result?.exit_code === "number" ? result.exit_code : undefined;

  return (
    <>
      <div className="my-2 rounded-lg border border-border/80 bg-secondary/40 overflow-hidden text-xs">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-secondary/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-3 w-3" />
            </div>
            <span className="font-mono font-medium text-foreground truncate">
              {toolCall.tool_name}
            </span>
            <Badge
              variant={isError ? "error" : "success"}
              className="h-4 px-1.5 text-[10px] gap-1 shrink-0"
            >
              {isError ? (
                <AlertCircle className="h-2.5 w-2.5" />
              ) : (
                <CheckCircle2 className="h-2.5 w-2.5" />
              )}
              {toolCall.duration_ms}ms
            </Badge>
          </div>
          <div className="text-muted-foreground shrink-0 ml-2">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="p-3 border-t border-border/80 bg-background/50 space-y-3 font-mono text-[11px]"
            >
              <div>
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Terminal className="h-3 w-3" />
                  <span>Arguments:</span>
                </div>
                <pre className="p-2 rounded bg-secondary/80 border border-border overflow-x-auto text-foreground">
                  {JSON.stringify(toolCall.arguments, null, 2)}
                </pre>
              </div>

              {imageDataUri && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3 w-3 text-primary" />
                      <span>Captured Screenshot:</span>
                    </div>
                    <button
                      onClick={() => setShowImageModal(true)}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <Eye className="h-3 w-3" />
                      View Fullscreen
                    </button>
                  </div>
                  <div
                    onClick={() => setShowImageModal(true)}
                    className="cursor-pointer border border-border rounded-lg overflow-hidden bg-black/40 hover:opacity-90 transition-opacity max-h-48 flex items-center justify-center"
                  >
                    <img
                      src={imageDataUri}
                      alt="Tool Screenshot"
                      className="object-contain max-h-48 w-full"
                    />
                  </div>
                </div>
              )}

              {(stdout !== undefined || stderr !== undefined) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="h-3 w-3" />
                      <span>Terminal Output:</span>
                    </div>
                    {exitCode !== undefined && (
                      <Badge variant={exitCode === 0 ? "success" : "error"} className="text-[9px] h-4">
                        Exit Code {exitCode}
                      </Badge>
                    )}
                  </div>
                  {stdout && (
                    <pre className="p-2 rounded bg-secondary/80 border border-border overflow-x-auto text-foreground max-h-40 custom-scrollbar">
                      {stdout}
                    </pre>
                  )}
                  {stderr && (
                    <pre className="p-2 rounded bg-destructive/10 border border-destructive/30 overflow-x-auto text-destructive max-h-32 custom-scrollbar">
                      {stderr}
                    </pre>
                  )}
                </div>
              )}

              {!imageDataUri && stdout === undefined && stderr === undefined && (
                <div>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    <span>Result:</span>
                  </div>
                  <pre className="p-2 rounded bg-secondary/80 border border-border overflow-x-auto text-foreground max-h-48 custom-scrollbar">
                    {JSON.stringify(toolCall.result, null, 2)}
                  </pre>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showImageModal && imageDataUri && (
          <motion.div
            variants={overlayMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowImageModal(false)}
          >
            <motion.div
              variants={modalMotion}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative max-w-5xl max-h-[90vh] bg-background border border-border rounded-xl p-2 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-2 border-b border-border mb-2">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground font-mono">
                    {toolCall.tool_name} Preview
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={microSpring}
                  onClick={() => setShowImageModal(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
              <div className="overflow-auto max-h-[75vh] flex items-center justify-center bg-black/40 rounded-lg">
                <img
                  src={imageDataUri}
                  alt="Captured Screenshot Large"
                  className="max-h-[75vh] object-contain rounded"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

