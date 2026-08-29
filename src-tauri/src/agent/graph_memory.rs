use crate::models::{LineageEdgeInfo, LineageGraphPayload, LineageNodeInfo, Neo4jConfig, Neo4jStatus};
use chrono::Utc;
use neo4rs::{query, Graph};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct GraphMemoryManager {
    config: Arc<RwLock<Neo4jConfig>>,
    graph: Arc<RwLock<Option<Arc<Graph>>>>,
}

impl GraphMemoryManager {
    pub fn new(config: Option<Neo4jConfig>) -> Self {
        Self {
            config: Arc::new(RwLock::new(config.unwrap_or_default())),
            graph: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn update_config(&self, new_config: Neo4jConfig) {
        let mut graph_lock = self.graph.write().await;
        *graph_lock = None;
        let mut config_lock = self.config.write().await;
        *config_lock = new_config;
    }

    pub async fn get_config(&self) -> Neo4jConfig {
        self.config.read().await.clone()
    }

    pub async fn get_connection(&self) -> Result<Arc<Graph>, String> {
        let read_lock = self.graph.read().await;
        if let Some(ref g) = *read_lock {
            return Ok(Arc::clone(g));
        }
        drop(read_lock);

        let mut write_lock = self.graph.write().await;
        if let Some(ref g) = *write_lock {
            return Ok(Arc::clone(g));
        }

        let cfg = self.config.read().await.clone();
        if !cfg.enabled {
            return Err("Neo4j Graph Memory is disabled in settings".to_string());
        }

        let uri = if !cfg.uri.is_empty() {
            &cfg.uri
        } else {
            "127.0.0.1:7687"
        };

        let user = if !cfg.user.is_empty() {
            &cfg.user
        } else {
            "neo4j"
        };

        let pass = if !cfg.pass.is_empty() {
            &cfg.pass
        } else {
            "AvoHarness2026!SecureGraph"
        };

        let g = Graph::new(uri, user, pass)
            .await
            .map_err(|e| format!("Failed to connect to Neo4j at {}: {}", uri, e))?;

        let arc_g = Arc::new(g);
        *write_lock = Some(Arc::clone(&arc_g));
        Ok(arc_g)
    }

    pub async fn check_status(&self) -> Neo4jStatus {
        let uri = self.config.read().await.uri.clone();
        match self.get_connection().await {
            Ok(graph) => {
                let q = query("MATCH (n) RETURN count(n) as total");
                match graph.execute(q).await {
                    Ok(mut result) => {
                        let mut count = 0u64;
                        if let Ok(Some(row)) = result.next().await {
                            if let Ok(c) = row.get::<i64>("total") {
                                count = c as u64;
                            }
                        }
                        Neo4jStatus {
                            connected: true,
                            uri,
                            node_count: count,
                            error: None,
                        }
                    }
                    Err(e) => Neo4jStatus {
                        connected: false,
                        uri,
                        node_count: 0,
                        error: Some(e.to_string()),
                    },
                }
            }
            Err(e) => Neo4jStatus {
                connected: false,
                uri,
                node_count: 0,
                error: Some(e),
            },
        }
    }

    pub async fn test_config(test_config: &Neo4jConfig) -> Neo4jStatus {
        if !test_config.enabled {
            return Neo4jStatus {
                connected: false,
                uri: test_config.uri.clone(),
                node_count: 0,
                error: Some("Disabled in configuration".to_string()),
            };
        }

        match Graph::new(&test_config.uri, &test_config.user, &test_config.pass).await {
            Ok(graph) => {
                let q = query("MATCH (n) RETURN count(n) as total");
                match graph.execute(q).await {
                    Ok(mut result) => {
                        let mut count = 0u64;
                        if let Ok(Some(row)) = result.next().await {
                            if let Ok(c) = row.get::<i64>("total") {
                                count = c as u64;
                            }
                        }
                        Neo4jStatus {
                            connected: true,
                            uri: test_config.uri.clone(),
                            node_count: count,
                            error: None,
                        }
                    }
                    Err(e) => Neo4jStatus {
                        connected: false,
                        uri: test_config.uri.clone(),
                        node_count: 0,
                        error: Some(e.to_string()),
                    },
                }
            }
            Err(e) => Neo4jStatus {
                connected: false,
                uri: test_config.uri.clone(),
                node_count: 0,
                error: Some(e.to_string()),
            },
        }
    }

    pub async fn init_schema(&self) -> Result<(), String> {
        let graph = self.get_connection().await?;
        let _ = graph
            .run(query(
                "CREATE CONSTRAINT task_id_unique IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE",
            ))
            .await;
        let _ = graph
            .run(query(
                "CREATE CONSTRAINT candidate_id_unique IF NOT EXISTS FOR (c:Candidate) REQUIRE c.id IS UNIQUE",
            ))
            .await;
        let _ = graph
            .run(query(
                "CREATE CONSTRAINT eval_id_unique IF NOT EXISTS FOR (e:Evaluation) REQUIRE e.id IS UNIQUE",
            ))
            .await;
        let _ = graph
            .run(query(
                "CREATE CONSTRAINT hint_id_unique IF NOT EXISTS FOR (h:SupervisorHint) REQUIRE h.id IS UNIQUE",
            ))
            .await;
        let _ = graph
            .run(query(
                "CREATE CONSTRAINT subagent_id_unique IF NOT EXISTS FOR (s:SubAgent) REQUIRE s.id IS UNIQUE",
            ))
            .await;
        Ok(())
    }

    pub async fn add_task(&self, session_id: &str, task_id: &str, prompt: &str) -> Result<(), String> {
        let graph = self.get_connection().await?;
        let ts = Utc::now().timestamp_millis();
        let q = query(
            "MERGE (s:Session {id: $session_id})
             CREATE (t:Task {id: $task_id, session_id: $session_id, prompt: $prompt, timestamp: $timestamp})
             CREATE (s)-[:HAS_TASK]->(t)",
        )
        .param("session_id", session_id)
        .param("task_id", task_id)
        .param("prompt", prompt)
        .param("timestamp", ts);

        graph.run(q).await.map_err(|e| format!("Neo4j error adding task: {}", e))
    }

    pub async fn add_candidate(
        &self,
        session_id: &str,
        task_id: &str,
        candidate_id: &str,
        iteration: u32,
        proposal: &str,
        parent_candidate_id: Option<&str>,
        mutation_description: Option<&str>,
    ) -> Result<(), String> {
        let graph = self.get_connection().await?;
        let ts = Utc::now().timestamp_millis();

        let q = query(
            "MATCH (t:Task {id: $task_id})
             CREATE (c:Candidate {
                 id: $candidate_id,
                 session_id: $session_id,
                 iteration: $iteration,
                 proposal: $proposal,
                 timestamp: $timestamp
             })
             CREATE (t)-[:HAS_CANDIDATE]->(c)",
        )
        .param("task_id", task_id)
        .param("candidate_id", candidate_id)
        .param("session_id", session_id)
        .param("iteration", iteration as i64)
        .param("proposal", proposal)
        .param("timestamp", ts);

        graph.run(q).await.map_err(|e| format!("Neo4j error adding candidate: {}", e))?;

        if let Some(parent_id) = parent_candidate_id {
            let desc = mutation_description.unwrap_or("mutated");
            let mut_q = query(
                "MATCH (p:Candidate {id: $parent_id}), (c:Candidate {id: $candidate_id})
                 CREATE (c)-[:MUTATED_FROM {action: $action, timestamp: $timestamp}]->(p)",
            )
            .param("parent_id", parent_id)
            .param("candidate_id", candidate_id)
            .param("action", desc)
            .param("timestamp", ts);

            let _ = graph.run(mut_q).await;
        }

        Ok(())
    }

    pub async fn add_evaluation(
        &self,
        session_id: &str,
        eval_id: &str,
        candidate_id: &str,
        score: f64,
        feedback: &str,
        metrics: serde_json::Value,
    ) -> Result<(), String> {
        let graph = self.get_connection().await?;
        let ts = Utc::now().timestamp_millis();

        let q = query(
            "MATCH (c:Candidate {id: $candidate_id})
             SET c.score = $score
             CREATE (e:Evaluation {
                 id: $eval_id,
                 session_id: $session_id,
                 score: $score,
                 feedback: $feedback,
                 metrics: $metrics,
                 timestamp: $timestamp
             })
             CREATE (c)-[:EVALUATED_BY]->(e)",
        )
        .param("candidate_id", candidate_id)
        .param("eval_id", eval_id)
        .param("session_id", session_id)
        .param("score", score)
        .param("feedback", feedback)
        .param("metrics", metrics.to_string())
        .param("timestamp", ts);

        graph.run(q).await.map_err(|e| format!("Neo4j error adding evaluation: {}", e))
    }

    pub async fn add_supervisor_hint(
        &self,
        session_id: &str,
        hint_id: &str,
        iteration: u32,
        hint: &str,
        target_candidate_id: Option<&str>,
    ) -> Result<(), String> {
        let graph = self.get_connection().await?;
        let ts = Utc::now().timestamp_millis();

        let q = query(
            "MERGE (s:Session {id: $session_id})
             CREATE (h:SupervisorHint {
                 id: $hint_id,
                 session_id: $session_id,
                 iteration: $iteration,
                 hint: $hint,
                 timestamp: $timestamp
             })
             CREATE (s)-[:HAS_HINT]->(h)",
        )
        .param("session_id", session_id)
        .param("hint_id", hint_id)
        .param("iteration", iteration as i64)
        .param("hint", hint)
        .param("timestamp", ts);

        graph.run(q).await.map_err(|e| format!("Neo4j error adding hint: {}", e))?;

        if let Some(cand_id) = target_candidate_id {
            let guide_q = query(
                "MATCH (h:SupervisorHint {id: $hint_id}), (c:Candidate {id: $cand_id})
                 CREATE (h)-[:GUIDED]->(c)",
            )
            .param("hint_id", hint_id)
            .param("cand_id", cand_id);

            let _ = graph.run(guide_q).await;
        }

        Ok(())
    }

    pub async fn add_subagent_run(
        &self,
        session_id: &str,
        agent_id: &str,
        role: &str,
        goal: &str,
        output: &str,
        duration_ms: u64,
        success: bool,
    ) -> Result<(), String> {
        let graph = self.get_connection().await?;
        let ts = Utc::now().timestamp_millis();

        let q = query(
            "MERGE (s:Session {id: $session_id})
             CREATE (a:SubAgent {
                 id: $agent_id,
                 session_id: $session_id,
                 role: $role,
                 goal: $goal,
                 output: $output,
                 duration_ms: $duration_ms,
                 success: $success,
                 timestamp: $timestamp
             })
             CREATE (s)-[:SPAWNED_AGENT]->(a)",
        )
        .param("session_id", session_id)
        .param("agent_id", agent_id)
        .param("role", role)
        .param("goal", goal)
        .param("output", output)
        .param("duration_ms", duration_ms as i64)
        .param("success", success)
        .param("timestamp", ts);

        graph.run(q).await.map_err(|e| format!("Neo4j error adding subagent run: {}", e))
    }

    pub async fn get_recent_scores(&self, session_id: &str, limit: u32) -> Result<Vec<f64>, String> {
        let graph = self.get_connection().await?;
        let q = query(
            "MATCH (c:Candidate {session_id: $session_id})
             WHERE c.score IS NOT NULL
             RETURN c.score as score, c.iteration as iter
             ORDER BY c.iteration DESC
             LIMIT $limit",
        )
        .param("session_id", session_id)
        .param("limit", limit as i64);

        let mut result = graph.execute(q).await.map_err(|e| e.to_string())?;
        let mut scores = Vec::new();
        while let Ok(Some(row)) = result.next().await {
            if let Ok(s) = row.get::<f64>("score") {
                scores.push(s);
            }
        }
        scores.reverse();
        Ok(scores)
    }

    pub async fn get_best_candidate(&self, session_id: &str) -> Result<Option<(String, f64, String)>, String> {
        let graph = self.get_connection().await?;
        let q = query(
            "MATCH (c:Candidate {session_id: $session_id})
             WHERE c.score IS NOT NULL
             RETURN c.id as id, c.score as score, c.proposal as proposal
             ORDER BY c.score DESC
             LIMIT 1",
        )
        .param("session_id", session_id);

        let mut result = graph.execute(q).await.map_err(|e| e.to_string())?;
        if let Ok(Some(row)) = result.next().await {
            let id: String = row.get("id").unwrap_or_default();
            let score: f64 = row.get("score").unwrap_or(0.0);
            let proposal: String = row.get("proposal").unwrap_or_default();
            return Ok(Some((id, score, proposal)));
        }

        Ok(None)
    }

    pub async fn get_session_lineage(&self, session_id: &str) -> Result<LineageGraphPayload, String> {
        let graph = self.get_connection().await?;
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        let n_query = query(
            "MATCH (n {session_id: $session_id})
             RETURN n.id as id, labels(n)[0] as node_type, n.iteration as iter, n.score as score, n.timestamp as ts, properties(n) as props",
        )
        .param("session_id", session_id);

        if let Ok(mut result) = graph.execute(n_query).await {
            while let Ok(Some(row)) = result.next().await {
                let id: String = row.get("id").unwrap_or_default();
                let node_type: String = row.get("node_type").unwrap_or_else(|_| "Node".to_string());
                let iter: Option<i64> = row.get("iter").ok();
                let score: Option<f64> = row.get("score").ok();
                let ts: i64 = row.get("ts").unwrap_or(0);

                nodes.push(LineageNodeInfo {
                    id: id.clone(),
                    label: format!("{}: {}", node_type, id.chars().take(8).collect::<String>()),
                    node_type,
                    iteration: iter.map(|i| i as u32),
                    score,
                    data: json!({}),
                    timestamp: ts,
                });
            }
        }

        let e_query = query(
            "MATCH (a {session_id: $session_id})-[r]->(b {session_id: $session_id})
             RETURN a.id as src, b.id as tgt, type(r) as rel, properties(r) as props",
        )
        .param("session_id", session_id);

        if let Ok(mut result) = graph.execute(e_query).await {
            while let Ok(Some(row)) = result.next().await {
                let src: String = row.get("src").unwrap_or_default();
                let tgt: String = row.get("tgt").unwrap_or_default();
                let rel: String = row.get("rel").unwrap_or_else(|_| "RELATED".to_string());

                edges.push(LineageEdgeInfo {
                    source_id: src,
                    target_id: tgt,
                    relationship: rel,
                    metadata: json!({}),
                });
            }
        }

        Ok(LineageGraphPayload {
            session_id: session_id.to_string(),
            nodes,
            edges,
        })
    }
}
