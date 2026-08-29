"use client";

import { useAppStore, ActiveDockPanel } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { microSpring } from "@/lib/animations";
import { motion } from "motion/react";
import {
  Activity,
  Bot,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";

interface DockNavItem {
  id: NonNullable<ActiveDockPanel>;
  label: string;
  icon: typeof Bot;
}

const DOCK_NAV_ITEMS: DockNavItem[] = [
  { id: "chat", label: "KOKI Assistant Chat", icon: Bot },
  { id: "usage", label: "Model Quotas & Engines", icon: Sparkles },
  { id: "tools", label: "Rig Agent Tools", icon: Wrench },
  { id: "system", label: "Host System Telemetry", icon: Activity },
  { id: "settings", label: "Configuration & Settings", icon: Settings },
];

export function EdgeDock() {
  const { activePanel, togglePanel } = useAppStore();

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center select-none pointer-events-auto">
      <div className="relative flex flex-col items-center">
        <svg
          className="w-6 h-6 text-card fill-current absolute -top-6 right-0 pointer-events-none drop-shadow-sm"
          viewBox="0 0 24 24"
        >
          <path d="M24 0 C24 13.255 13.255 24 0 24 L24 24 Z" />
        </svg>

        <svg
          className="w-6 h-6 text-card fill-current absolute -bottom-6 right-0 pointer-events-none drop-shadow-sm"
          viewBox="0 0 24 24"
        >
          <path d="M24 24 C24 10.745 13.255 0 0 0 L24 0 Z" />
        </svg>

        <div className="w-16 py-5 rounded-l-3xl bg-card shadow-2xl border-y border-l border-border/60 flex flex-col items-center gap-3">
          {DOCK_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => togglePanel(item.id)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                transition={microSpring}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer relative transition-colors",
                  isActive
                    ? "text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                )}
                title={item.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDockIndicator"
                    className="absolute inset-0 rounded-full bg-primary shadow-lg ring-2 ring-primary/40"
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 32,
                    }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
