"use client";

import { useAppStore } from "@/store/useAppStore";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ToolInspector } from "@/components/agent/ToolInspector";
import { SystemMonitor } from "@/components/agent/SystemMonitor";
import { SettingsView } from "@/components/agent/SettingsView";

export default function Home() {
  const { activeTab } = useAppStore();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          {activeTab === "chat" && <ChatInterface />}
          {activeTab === "tools" && (
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="max-w-5xl mx-auto">
                <ToolInspector />
              </div>
            </div>
          )}
          {activeTab === "system" && (
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="max-w-5xl mx-auto">
                <SystemMonitor />
              </div>
            </div>
          )}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="max-w-5xl mx-auto">
                <SettingsView />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
