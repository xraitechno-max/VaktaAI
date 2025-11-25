-- Quality Metrics Daily Roll-up Table
-- Aggregates orchestrator performance metrics for analytics dashboard

CREATE TABLE IF NOT EXISTS quality_metrics_daily (
  day DATE PRIMARY KEY,

  -- Volume metrics
  responses_total INTEGER NOT NULL DEFAULT 0,

  -- Confidence metrics
  conf_p50 NUMERIC(4,3),
  conf_p95 NUMERIC(4,3),
  conf_ge_082_ratio NUMERIC(4,3), -- Target: >= 0.95 (95%+ responses above 0.82)

  -- Regeneration metrics
  regen_rate NUMERIC(4,3), -- Target: < 0.15 (15%)
  regen_fact_ratio NUMERIC(4,3),
  regen_math_ratio NUMERIC(4,3),
  regen_citation_ratio NUMERIC(4,3),

  -- Language detection metrics
  hinglish_switch_rate NUMERIC(4,3),
  hindi_switch_rate NUMERIC(4,3),
  lang_detect_accuracy NUMERIC(4,3),

  -- Citation metrics
  citations_pass_ratio NUMERIC(4,3), -- Target: >= 0.95
  citations_avg_per_response NUMERIC(4,2),

  -- Latency metrics (milliseconds)
  latency_p50_ms INTEGER,
  latency_p95_ms INTEGER, -- Target: 1700-4200ms depending on mode
  latency_p99_ms INTEGER,

  -- Model usage breakdown
  model_gpt4o_ratio NUMERIC(4,3),
  model_claude_ratio NUMERIC(4,3),
  model_gemini_ratio NUMERIC(4,3),
  model_grok_ratio NUMERIC(4,3),

  -- Token usage
  tokens_total_prompt BIGINT,
  tokens_total_completion BIGINT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_quality_metrics_day ON quality_metrics_daily(day DESC);

-- Comments
COMMENT ON TABLE quality_metrics_daily IS 'Daily aggregated quality metrics for VaktaAI prompt orchestrator';
COMMENT ON COLUMN quality_metrics_daily.conf_ge_082_ratio IS 'Ratio of responses with confidence >= 0.82 (target: 0.95)';
COMMENT ON COLUMN quality_metrics_daily.regen_rate IS 'Ratio of responses requiring regeneration (target: <0.15)';
COMMENT ON COLUMN quality_metrics_daily.citations_pass_ratio IS 'Ratio of responses with valid citations (target: 0.95)';
COMMENT ON COLUMN quality_metrics_daily.latency_p95_ms IS 'p95 latency in ms (target: 1700-4200 depending on mode)';

-- Events table for append-only logging (source of truth)
CREATE TABLE IF NOT EXISTS orchestrator_events (
  id SERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Request context
  user_id TEXT,
  session_id TEXT,
  mode TEXT NOT NULL,
  subject TEXT,
  board TEXT,
  class INTEGER,

  -- Input
  user_msg TEXT,
  lang_requested TEXT,

  -- Language detection
  lang_detected TEXT,
  lang_switched BOOLEAN,
  lang_confidence NUMERIC(4,3),

  -- Routing
  model_selected TEXT,
  model_rule TEXT,

  -- Evidence
  evidence_chunks INTEGER,
  evidence_avg_similarity NUMERIC(4,3),

  -- Response
  confidence NUMERIC(4,3),
  regenerations INTEGER DEFAULT 0,
  regen_reasons TEXT[], -- ['fact_unsupported', 'citation_missing', ...]

  -- Verification gates
  fact_check_passed BOOLEAN,
  math_check_passed BOOLEAN,
  lang_check_passed BOOLEAN,
  citations_valid BOOLEAN,
  citations_count INTEGER,

  -- Performance
  start_ms BIGINT,
  end_ms BIGINT,
  latency_ms INTEGER GENERATED ALWAYS AS (end_ms - start_ms) STORED,

  -- Tokens
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,

  -- Status
  status TEXT, -- 'ok' | 'regen' | 'fail'
  error_code TEXT,
  error_message TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orchestrator_events_ts ON orchestrator_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_events_mode ON orchestrator_events(mode);
CREATE INDEX IF NOT EXISTS idx_orchestrator_events_user_ts ON orchestrator_events(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_events_status ON orchestrator_events(status);

COMMENT ON TABLE orchestrator_events IS 'Append-only event log for all orchestrator runs (source of truth for analytics)';
