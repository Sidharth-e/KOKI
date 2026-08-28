"use client";

import { useAppStore } from "@/store/useAppStore";
import { EdgeDock } from "@/components/layout/EdgeDock";
import { EdgePanel } from "@/components/layout/EdgePanel";
import { CommandPalette } from "@/components/layout/CommandPalette";

export default function Home() {
  const { activeWindow, setActiveWindow } = useAppStore();

  return (
    <div className="w-screen h-screen overflow-hidden relative select-none pointer-events-none bg-transparent">
      {activeWindow && (
        <div
          onClick={() => setActiveWindow(null)}
          className="absolute inset-0 pointer-events-auto cursor-default bg-transparent"
        />
      )}

      <EdgePanel />
      <EdgeDock />
      <CommandPalette />
    </div>
  );
}
