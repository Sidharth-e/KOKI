use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::Path;
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

pub fn get_available_tools_definitions() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "get_system_metrics".to_string(),
            description: "Retrieve real-time host system statistics including CPU usage, RAM utilization, and OS details".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {},
                "required": []
            }),
        },
        ToolDefinition {
            name: "get_current_time".to_string(),
            description: "Get the current date, time, and timezone".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Optional timezone identifier like 'local' or 'utc'"
                    }
                }
            }),
        },
        ToolDefinition {
            name: "calculate_expression".to_string(),
            description: "Perform basic mathematical calculations and expressions safely".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Math expression such as '25 * 4 + 10' or 'sqrt(144)'"
                    }
                },
                "required": ["expression"]
            }),
        },
        ToolDefinition {
            name: "list_directory".to_string(),
            description: "List files and directories in a specific folder path".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Target folder path to inspect"
                    }
                },
                "required": ["path"]
            }),
        },
    ]
}

pub async fn execute_tool(name: &str, args: &serde_json::Value) -> Result<serde_json::Value, String> {
    match name {
        "get_system_metrics" => {
            let mut sys = System::new_all();
            sys.refresh_all();
            let total_mem = sys.total_memory() / (1024 * 1024);
            let used_mem = sys.used_memory() / (1024 * 1024);
            let mem_pct = if total_mem > 0 { (used_mem as f32 / total_mem as f32) * 100.0 } else { 0.0 };
            let cpu_usage = sys.global_cpu_usage();

            Ok(json!({
                "os": System::name().unwrap_or_else(|| "Unknown".into()),
                "os_version": System::os_version().unwrap_or_else(|| "".into()),
                "cpu_count": sys.cpus().len(),
                "cpu_usage_percent": cpu_usage,
                "total_memory_mb": total_mem,
                "used_memory_mb": used_mem,
                "memory_usage_percent": mem_pct
            }))
        }
        "get_current_time" => {
            let now = chrono::Local::now();
            Ok(json!({
                "local_time": now.format("%Y-%m-%d %H:%M:%S %Z").to_string(),
                "utc_time": chrono::Utc::now().to_rfc3339(),
                "timestamp_ms": now.timestamp_millis()
            }))
        }
        "calculate_expression" => {
            let expr = args.get("expression").and_then(|v| v.as_str()).unwrap_or("0");
            let sanitized = expr.replace(' ', "");
            if let Some(pos) = sanitized.find('+') {
                let (a, b) = sanitized.split_at(pos);
                let num_a = a.parse::<f64>().map_err(|e| e.to_string())?;
                let num_b = b[1..].parse::<f64>().map_err(|e| e.to_string())?;
                return Ok(json!({ "result": num_a + num_b }));
            }
            if let Some(pos) = sanitized.find('-') {
                if pos > 0 {
                    let (a, b) = sanitized.split_at(pos);
                    let num_a = a.parse::<f64>().map_err(|e| e.to_string())?;
                    let num_b = b[1..].parse::<f64>().map_err(|e| e.to_string())?;
                    return Ok(json!({ "result": num_a - num_b }));
                }
            }
            if let Some(pos) = sanitized.find('*') {
                let (a, b) = sanitized.split_at(pos);
                let num_a = a.parse::<f64>().map_err(|e| e.to_string())?;
                let num_b = b[1..].parse::<f64>().map_err(|e| e.to_string())?;
                return Ok(json!({ "result": num_a * num_b }));
            }
            if let Some(pos) = sanitized.find('/') {
                let (a, b) = sanitized.split_at(pos);
                let num_a = a.parse::<f64>().map_err(|e| e.to_string())?;
                let num_b = b[1..].parse::<f64>().map_err(|e| e.to_string())?;
                if num_b == 0.0 {
                    return Err("Division by zero".to_string());
                }
                return Ok(json!({ "result": num_a / num_b }));
            }
            if let Ok(num) = sanitized.parse::<f64>() {
                return Ok(json!({ "result": num }));
            }
            Err("Expression evaluation failed".to_string())
        }
        "list_directory" => {
            let path_str = args.get("path").and_then(|v| v.as_str()).unwrap_or(".");
            let path = Path::new(path_str);
            if !path.exists() {
                return Err(format!("Path does not exist: {}", path_str));
            }
            let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
            let mut results = Vec::new();
            for entry in entries.flatten() {
                let file_type = entry.file_type().map_err(|e| e.to_string())?;
                let name = entry.file_name().to_string_lossy().to_string();
                results.push(json!({
                    "name": name,
                    "is_dir": file_type.is_dir(),
                    "is_file": file_type.is_file()
                }));
            }
            Ok(json!({ "path": path_str, "entries": results }))
        }
        _ => Err(format!("Unknown tool: {}", name)),
    }
}
