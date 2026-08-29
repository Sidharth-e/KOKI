"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { EdgeDock } from "@/components/layout/EdgeDock";
import { EdgePanel } from "@/components/layout/EdgePanel";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { invokeCommand } from "@/lib/tauri";

export default function Home() {
  const { activePanel, setActivePanel, commandPaletteOpen } = useAppStore();

  useEffect(() => {
    let mode = "dock";
    if (commandPaletteOpen) {
      mode = "palette";
    } else if (activePanel) {
      mode = "panel";
    }
    invokeCommand("set_window_mode", { mode }).catch(() => {});
  }, [activePanel, commandPaletteOpen]);

  return (
    <div className="w-screen h-screen overflow-hidden relative select-none pointer-events-none bg-transparent">
      {activePanel && (
        <div
          onClick={() => setActivePanel(null)}
          className="absolute inset-0 pointer-events-auto cursor-default bg-transparent"
        />
      )}

      <EdgePanel />
      <EdgeDock />
      <CommandPalette />
    </div>
  );
}
