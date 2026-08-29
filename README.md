# KOKI — Keeps Ollama Kinda Intelligent

> **K.O.K.I.** (**K**eeps **O**llama **K**inda **I**ntelligent) is a local-first AI personal assistant desktop application built with **Tauri v2 (Rust)** and **Next.js 15 (React 19 / TypeScript)** in a unified single repository.

Powered by a native Rust agentic engine inspired by **Rig**, KOKI connects directly to local inference runtimes like **Ollama** to provide token streaming, type-safe native tool execution, and real-time hardware telemetry with zero cloud latency and complete data privacy.

---

## ⚡ Key Features

- **Blazing Fast & Low Footprint**: Native Rust core uses ~30MB RAM, preserving all GPU VRAM and system memory for local LLMs.
- **Local-First Privacy**: Connects directly to local Ollama endpoints (`127.0.0.1:11434`) — your data never leaves your computer.
- **Native Rust Agentic Tools**: Sub-millisecond tool execution (hardware metrics, math engine, time utilities, directory inspector) through type-safe Rust functions.
- **Real-Time Token Streaming**: Streamlined Tauri event bridge pushes tokens directly to the Next.js UI as they generate.
- **Hardware & Telemetry Monitor**: Live polling of CPU load, RAM usage, host platform, and system uptime.
- **Modern Next.js App Router UI**: Clean, responsive desktop workspace with dark/light themes, model selector, tool execution inspector, and session management.

---

## 🏗️ Architecture Overview

```
KOKI/
├── src-tauri/                     # Native Rust Backend (Tauri v2)
│   ├── Cargo.toml                 # Rust dependencies (tauri, tokio, reqwest, sysinfo, serde)
│   ├── tauri.conf.json            # Desktop window and build configurations
│   ├── build.rs                   # Tauri build script
│   ├── capabilities/              # Tauri IPC security capabilities
│   └── src/
│       ├── lib.rs                 # Tauri initialization & command registry
│       ├── main.rs                # Native binary entrypoint
│       ├── models.rs              # Shared Rust data models
│       ├── agent/
│       │   ├── mod.rs             # Rig-compatible agent runner & streaming logic
│       │   └── tools.rs           # Native agent tool implementations
│       └── commands/
│           ├── agent_cmds.rs      # Agent IPC commands (ask_assistant, get_available_tools)
│           └── system_cmds.rs     # Telemetry & Ollama IPC commands
│
├── src/                           # Frontend (Next.js 15 App Router)
│   ├── app/
│   │   ├── layout.tsx             # Root layout with QueryProvider and theme tokens
│   │   ├── page.tsx               # Main assistant multi-view dashboard
│   │   └── globals.css            # Standardized theme design tokens (light & dark)
│   ├── components/
│   │   ├── ui/                    # Reusable UI primitives (Button, Card, Input, Badge)
│   │   ├── chat/                  # ChatInterface, MessageBubble, ChatInput, ToolCallCard
│   │   ├── agent/                 # ModelPicker, ToolInspector, SystemMonitor, SettingsView
│   │   └── layout/                # Header, Sidebar, ThemeToggle
│   ├── lib/
│   │   ├── api.ts                 # Centralized Axios client instance
│   │   ├── tauri.ts               # Safe Tauri IPC invoker with browser fallback
│   │   ├── utils.ts               # Styling & byte/time formatting helpers
│   │   └── types.ts               # TypeScript interfaces
│   ├── store/
│   │   ├── useAppStore.ts         # Zustand store for client UI & configuration state
│   │   └── useChatStore.ts        # Zustand store for chat messages & streaming state
│   └── providers/
│       └── QueryProvider.tsx      # TanStack React Query provider
│
├── package.json                   # Frontend dependencies (managed via pnpm)
├── next.config.ts                 # Next.js static export config (output: 'export')
├── tailwind.config.ts             # Tailwind CSS token definitions
└── tsconfig.json                  # Strict TypeScript configuration
```

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Desktop Shell** | **Tauri v2** | Lightweight native webview wrapper with secure IPC |
| **Backend Engine** | **Rust** | Async Tokio runtime with fast HTTP, IPC streaming & system tools |
| **Frontend Framework**| **Next.js 15** | App Router static export (`output: 'export'`) |
| **UI Library** | **React 19** | Component-driven declarative UI |
| **Styling** | **Tailwind CSS** | Design token system with light and dark mode support |
| **Client State** | **Zustand** | UI preferences, active sessions, and streaming buffers |
| **Server State** | **TanStack Query** | Async caching and polling for hardware metrics and Ollama models |
| **HTTP Client** | **Axios** | Centralized API client with interceptors |
| **Package Manager** | **pnpm** | Fast, disk-efficient package management |

---

## 📋 Prerequisites

Before running the application, make sure the following tools are installed on your system:

1. **Node.js**: v18+ (v22 recommended)
2. **pnpm**: `npm install -g pnpm`
3. **Rust & Cargo**: [rustup.rs](https://rustup.rs/) (Rust 1.78+)
4. **Ollama**: [ollama.com](https://ollama.com/) (for running local LLM models)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
# Navigate to project directory
cd KOKI

# Install frontend dependencies using pnpm
pnpm install
```

### 2. Start Ollama and Pull a Model

Make sure your local Ollama daemon is running:

```bash
# Start Ollama service
ollama serve

# In another terminal, pull your preferred model (e.g. Llama 3.2, Mistral, Phi-3, Qwen)
ollama pull llama3.2
```

### 3. Run in Development Mode

Launch the desktop application with live hot-reloading:

```bash
pnpm tauri:dev
```

This concurrently starts:
- Next.js development server on `http://localhost:3000`
- Native Tauri desktop window attached to the local development server

---

## 📦 Building for Production

To create an optimized, standalone desktop bundle (`.app` / `.dmg` on macOS, `.exe` / `.msi` on Windows, `.deb` / `.AppImage` on Linux):

```bash
# 1. Compile Next.js static export
pnpm build

# 2. Package the native desktop binary
pnpm tauri:build
```

The compiled binaries will be output to `src-tauri/target/release/bundle/`.

---

## 🧩 Built-in Agent Tools

The Rust agent core includes built-in type-safe tools that the assistant can execute autonomously during conversation:

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `get_system_metrics` | None | Returns live host CPU usage, RAM utilization, and OS details |
| `get_current_time` | `timezone?` | Provides formatted local time, UTC timestamp, and date |
| `calculate_expression`| `expression` | Evaluates arithmetic math operations safely |
| `list_directory` | `path` | Inspects and lists files/directories at the target folder path |

---

## ⚙️ Adding New Native Tools

To add a new tool to your assistant:

1. Define the tool function in `src-tauri/src/agent/tools.rs`:
   - Add tool metadata to `get_available_tools_definitions()`
   - Add execution branch in `execute_tool()`
2. The agent automatically exposes the new tool definition to Ollama and executes it when prompted.

---

## 🔒 Security & Privacy

- **No Remote Telemetry**: All conversations and model inferences remain on `localhost`.
- **Sandboxed Tauri Permissions**: Desktop IPC permissions are explicitly governed through `src-tauri/capabilities/default.json`.
- **Type-Safe Memory Management**: Memory safety and concurrency guarantees provided natively by Rust.

---

## 📜 Available Scripts

- `pnpm dev`: Start standalone Next.js web dev server.
- `pnpm build`: Generate static production export to `out/`.
- `pnpm tauri:dev`: Launch full native desktop app with live reload.
- `pnpm tauri:build`: Build release desktop installer.
- `cargo check --manifest-path src-tauri/Cargo.toml`: Check Rust backend compilation.
