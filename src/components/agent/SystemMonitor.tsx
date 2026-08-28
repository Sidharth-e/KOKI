"use client";

import { invokeCommand } from "@/lib/tauri";
import { SystemMetrics } from "@/lib/types";
import { formatBytes, formatUptime } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Clock, Cpu, HardDrive, Laptop, Server, Zap } from "lucide-react";

export function SystemMonitor() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["system-metrics"],
    queryFn: async () => {
      return await invokeCommand<SystemMetrics>("get_system_metrics");
    },
    refetchInterval: 2500,
  });

  if (isLoading || !metrics) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
        <Zap className="w-5 h-5 text-primary animate-pulse" />
        Reading system telemetry...
      </div>
    );
  }

  const freeMemoryMb = Math.max(metrics.total_memory_mb - metrics.used_memory_mb, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Cpu className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-semibold text-foreground">
                CPU Utilization
              </CardTitle>
            </div>
            <Badge variant={metrics.cpu_usage_percent > 80 ? "error" : "secondary"} className="text-[10px] font-mono">
              {metrics.cpu_count} Cores
            </Badge>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {metrics.cpu_usage_percent.toFixed(1)}%
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(metrics.cpu_usage_percent, 100)}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <HardDrive className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-semibold text-foreground">
                RAM Consumption
              </CardTitle>
            </div>
            <Badge variant={metrics.memory_usage_percent > 85 ? "warning" : "secondary"} className="text-[10px] font-mono">
              {metrics.memory_usage_percent.toFixed(0)}%
            </Badge>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {formatBytes(metrics.used_memory_mb * 1024 * 1024, 1)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              of {formatBytes(metrics.total_memory_mb * 1024 * 1024, 1)} total
            </p>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(metrics.memory_usage_percent, 100)}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Laptop className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-semibold text-foreground">
                Host OS & Kernel
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono">
              Native
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold font-mono text-foreground truncate">
              {metrics.os_name}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Kernel Build: {metrics.os_version || "Darwin ARM64"}
            </p>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-semibold text-foreground">
                Host Uptime
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono">
              Running
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {formatUptime(metrics.uptime_seconds)}
            </div>
            <p className="text-[11px] text-muted-foreground">Continuous system runtime</p>
          </div>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">
              Hardware Telemetry Summary
            </h4>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            Auto-refresh: 2.5s
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-secondary/50 border border-border space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Available RAM</span>
            <div className="text-xs font-mono font-semibold text-foreground">
              {formatBytes(freeMemoryMb * 1024 * 1024, 1)}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/50 border border-border space-y-0.5">
            <span className="text-[10px] text-muted-foreground">CPU Core Pool</span>
            <div className="text-xs font-mono font-semibold text-foreground">
              {metrics.cpu_count} Logical Cores
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/50 border border-border space-y-0.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-muted-foreground">Local Inference</span>
            <div className="text-xs font-mono font-semibold text-success">
              Metal / Apple Silicon
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
