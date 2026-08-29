import type { Metadata } from "next";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "KOKI - Keeps Ollama Kinda Intelligent",
  description: "High-performance local AI personal assistant powered by Rig and Tauri v2 (Keeps Ollama Kinda Intelligent)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-transparent" suppressHydrationWarning>
      <body className="min-h-screen bg-transparent text-foreground antialiased overflow-hidden flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
