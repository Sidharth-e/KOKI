"use client";

import { useAppStore } from "@/store/useAppStore";
import { EdgeUsageDock } from "@/components/layout/EdgeUsageDock";
import { EdgeWindowModal } from "@/components/layout/EdgeWindowModal";
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

      <EdgeWindowModal />
      <EdgeUsageDock />
      <CommandPalette />
    </div>
  );
}
