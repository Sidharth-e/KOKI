"use client";

import { invokeCommand } from "@/lib/tauri";
import { SystemMetrics } from "@/lib/types";
import { formatBytes, formatUptime } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Activity, Clock, Cpu, HardDrive, Laptop } from "lucide-react";

export function SystemMonitor() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["system-metrics"],
    queryFn: async () => {
      return await invokeCommand<SystemMetrics>("get_system_metrics");
    },
    refetchInterval: 3000,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-1">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Hardware & Telemetry Monitor
        </h2>
        <p className="text-xs text-muted-foreground">
          Real-time resource utilization to monitor host overhead and local LLM performance.
        </p>
      </div>

      {isLoading || !metrics ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Reading system telemetry...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-primary" />
                  CPU Load
                </CardTitle>
                <Badge variant={metrics.cpu_usage_percent > 80 ? "error" : "secondary"}>
                  {metrics.cpu_count} Cores
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-foreground">
                {metrics.cpu_usage_percent.toFixed(1)}%
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(metrics.cpu_usage_percent, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-primary" />
                  RAM Usage
                </CardTitle>
                <Badge variant={metrics.memory_usage_percent > 85 ? "warning" : "secondary"}>
                  {metrics.memory_usage_percent.toFixed(0)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-foreground">
                {formatBytes(metrics.used_memory_mb * 1024 * 1024, 1)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                of {formatBytes(metrics.total_memory_mb * 1024 * 1024, 1)} total
              </p>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(metrics.memory_usage_percent, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Laptop className="h-4 w-4 text-primary" />
                  Host Platform
                </CardTitle>
                <Badge variant="secondary">OS</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold font-mono text-foreground truncate">
                {metrics.os_name}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Version: {metrics.os_version || "Native"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Host Uptime
                </CardTitle>
                <Badge variant="secondary">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-foreground">
                {formatUptime(metrics.uptime_seconds)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">System running</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
