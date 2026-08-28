"use client";

import { useAppStore, ActiveDockPanel } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bot,
  Settings,
  Wrench,
} from "lucide-react";

interface DockMeterItem {
  id: "claude" | "openai" | "rig";
  panelTarget: NonNullable<ActiveDockPanel>;
  label: string;
  percent: number;
  colorClass: string;
  ringClass: string;
}

const DOCK_METERS: DockMeterItem[] = [
  {
    id: "claude",
    panelTarget: "usage",
    label: "73%",
    percent: 73,
    colorClass: "text-warning",
    ringClass: "stroke-warning",
  },
  {
    id: "openai",
    panelTarget: "usage",
    label: "21%",
    percent: 21,
    colorClass: "text-success",
    ringClass: "stroke-success",
  },
  {
    id: "rig",
    panelTarget: "usage",
    label: "52%",
    percent: 52,
    colorClass: "text-primary",
    ringClass: "stroke-primary",
  },
];

function ModelIcon({ id, className }: { id: string; className?: string }) {
  if (id === "claude") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("w-4 h-4", className)}
      >
        <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
      </svg>
    );
  }
  if (id === "openai") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("w-4 h-4", className)}
      >
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
        <path d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function EdgeDock() {
  const { activePanel, togglePanel } = useAppStore();

  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center select-none pointer-events-auto">
      <div className="relative flex flex-col items-center">
        <svg
          className="w-6 h-6 text-card dark:text-neutral-950 fill-current absolute -top-6 right-0 pointer-events-none drop-shadow-sm"
          viewBox="0 0 24 24"
        >
          <path d="M24 0 C24 13.255 13.255 24 0 24 L24 24 Z" />
        </svg>

        <svg
          className="w-6 h-6 text-card dark:text-neutral-950 fill-current absolute -bottom-6 right-0 pointer-events-none drop-shadow-sm"
          viewBox="0 0 24 24"
        >
          <path d="M24 24 C24 10.745 13.255 0 0 0 L24 0 Z" />
        </svg>

        <div className="w-16 py-6 rounded-l-3xl bg-card dark:bg-neutral-950 shadow-2xl border-y border-l border-border/60 flex flex-col items-center gap-4">
          <button
            onClick={() => togglePanel("chat")}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer",
              activePanel === "chat"
                ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/40 scale-105"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:scale-105"
            )}
            title="KOKI Assistant Chat"
          >
            <Bot className="w-5 h-5" />
          </button>

          <div className="w-8 h-px bg-border/80 my-0.5" />

          {DOCK_METERS.map((item) => {
            const isTargetActive = activePanel === item.panelTarget;
            const strokeDashoffset =
              circumference - (item.percent / 100) * circumference;

            return (
              <button
                key={item.id}
                onClick={() => togglePanel(item.panelTarget)}
                className="group relative flex flex-col items-center gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full p-0.5"
                title={`${item.id.toUpperCase()} Usage (${item.percent}%)`}
              >
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-10 h-10 -rotate-90 transform" viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r={radius}
                      className="stroke-secondary/80"
                      strokeWidth="2.5"
                      fill="transparent"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r={radius}
                      className={cn("transition-all duration-500", item.ringClass)}
                      strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  <div
                    className={cn(
                      "absolute inset-1.5 rounded-full bg-secondary flex items-center justify-center transition-all group-hover:scale-105",
                      isTargetActive && "ring-2 ring-primary bg-primary/20"
                    )}
                  >
                    <ModelIcon
                      id={item.id}
                      className={cn(
                        "transition-colors",
                        isTargetActive ? "text-primary" : item.colorClass
                      )}
                    />
                  </div>
                </div>

                <span
                  className={cn(
                    "text-[10px] font-semibold font-mono tracking-tight transition-colors",
                    isTargetActive
                      ? "text-primary font-bold"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          <div className="w-8 h-px bg-border/80 my-0.5" />

          <button
            onClick={() => togglePanel("tools")}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer",
              activePanel === "tools"
                ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/40"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            title="Rig Agent Tools"
          >
            <Wrench className="w-4 h-4" />
          </button>

          <button
            onClick={() => togglePanel("system")}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer",
              activePanel === "system"
                ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/40"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            title="System Telemetry"
          >
            <Activity className="w-4 h-4" />
          </button>

          <button
            onClick={() => togglePanel("settings")}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer",
              activePanel === "settings"
                ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/40"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            title="Settings & Config"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
