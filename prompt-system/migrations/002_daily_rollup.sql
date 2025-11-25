-- Daily Quality Metrics Aggregation
-- Run via cron job or worker (daily at 00:30 UTC)
-- Aggregates previous day's orchestrator_events into quality_metrics_daily

WITH base AS (
  SELECT
    DATE_TRUNC('day', ts)::DATE AS day,
    mode,
    subject,
    model_selected,
    confidence,
    latency_ms,
    regenerations,
    regen_reasons,
    lang_detected,
    lang_switched,
    citations_valid,
    citations_count,
    fact_check_passed,
    math_check_passed,
    lang_check_passed,
    prompt_tokens,
    completion_tokens,
    status
  FROM orchestrator_events
  WHERE ts >= CURRENT_DATE - INTERVAL '2 days'
    AND ts < CURRENT_DATE
),
agg AS (
  SELECT
    day,

    -- Volume
    COUNT(*) AS responses_total,

    -- Confidence metrics
    PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY confidence) AS conf_p50,
    PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY confidence) AS conf_p95,
    AVG((confidence >= 0.82)::INT)::NUMERIC(4,3) AS conf_ge_082_ratio,

    -- Regeneration metrics
    AVG((regenerations > 0)::INT)::NUMERIC(4,3) AS regen_rate,
    AVG(('fact_unsupported' = ANY(regen_reasons))::INT)::NUMERIC(4,3) AS regen_fact_ratio,
    AVG(('math_fail' = ANY(regen_reasons))::INT)::NUMERIC(4,3) AS regen_math_ratio,
    AVG(('citation_missing' = ANY(regen_reasons))::INT)::NUMERIC(4,3) AS regen_citation_ratio,

    -- Language metrics
    AVG((lang_switched AND lang_detected = 'hinglish')::INT)::NUMERIC(4,3) AS hinglish_switch_rate,
    AVG((lang_switched AND lang_detected = 'hindi')::INT)::NUMERIC(4,3) AS hindi_switch_rate,
    AVG((lang_detected IS NOT NULL)::INT)::NUMERIC(4,3) AS lang_detect_accuracy,

    -- Citation metrics
    AVG((citations_valid)::INT)::NUMERIC(4,3) AS citations_pass_ratio,
    AVG(citations_count)::NUMERIC(4,2) AS citations_avg_per_response,

    -- Latency metrics
    PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY latency_ms) AS latency_p50_ms,
    PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY latency_ms) AS latency_p95_ms,
    PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY latency_ms) AS latency_p99_ms,

    -- Model usage
    AVG((model_selected LIKE 'gpt-4%')::INT)::NUMERIC(4,3) AS model_gpt4o_ratio,
    AVG((model_selected LIKE 'claude%')::INT)::NUMERIC(4,3) AS model_claude_ratio,
    AVG((model_selected LIKE 'gemini%')::INT)::NUMERIC(4,3) AS model_gemini_ratio,
    AVG((model_selected LIKE 'grok%')::INT)::NUMERIC(4,3) AS model_grok_ratio,

    -- Tokens
    SUM(prompt_tokens) AS tokens_total_prompt,
    SUM(completion_tokens) AS tokens_total_completion

  FROM base
  GROUP BY day
)
INSERT INTO quality_metrics_daily (
  day,
  responses_total,
  conf_p50,
  conf_p95,
  conf_ge_082_ratio,
  regen_rate,
  regen_fact_ratio,
  regen_math_ratio,
  regen_citation_ratio,
  hinglish_switch_rate,
  hindi_switch_rate,
  lang_detect_accuracy,
  citations_pass_ratio,
  citations_avg_per_response,
  latency_p50_ms,
  latency_p95_ms,
  latency_p99_ms,
  model_gpt4o_ratio,
  model_claude_ratio,
  model_gemini_ratio,
  model_grok_ratio,
  tokens_total_prompt,
  tokens_total_completion
)
SELECT * FROM agg
ON CONFLICT (day) DO UPDATE SET
  responses_total = EXCLUDED.responses_total,
  conf_p50 = EXCLUDED.conf_p50,
  conf_p95 = EXCLUDED.conf_p95,
  conf_ge_082_ratio = EXCLUDED.conf_ge_082_ratio,
  regen_rate = EXCLUDED.regen_rate,
  regen_fact_ratio = EXCLUDED.regen_fact_ratio,
  regen_math_ratio = EXCLUDED.regen_math_ratio,
  regen_citation_ratio = EXCLUDED.regen_citation_ratio,
  hinglish_switch_rate = EXCLUDED.hinglish_switch_rate,
  hindi_switch_rate = EXCLUDED.hindi_switch_rate,
  lang_detect_accuracy = EXCLUDED.lang_detect_accuracy,
  citations_pass_ratio = EXCLUDED.citations_pass_ratio,
  citations_avg_per_response = EXCLUDED.citations_avg_per_response,
  latency_p50_ms = EXCLUDED.latency_p50_ms,
  latency_p95_ms = EXCLUDED.latency_p95_ms,
  latency_p99_ms = EXCLUDED.latency_p99_ms,
  model_gpt4o_ratio = EXCLUDED.model_gpt4o_ratio,
  model_claude_ratio = EXCLUDED.model_claude_ratio,
  model_gemini_ratio = EXCLUDED.model_gemini_ratio,
  model_grok_ratio = EXCLUDED.model_grok_ratio,
  tokens_total_prompt = EXCLUDED.tokens_total_prompt,
  tokens_total_completion = EXCLUDED.tokens_total_completion,
  updated_at = NOW();

-- Return summary
SELECT
  day,
  responses_total,
  ROUND(conf_ge_082_ratio * 100, 1) || '%' AS confidence_ge_082,
  ROUND(regen_rate * 100, 1) || '%' AS regen_rate_pct,
  ROUND(citations_pass_ratio * 100, 1) || '%' AS citations_pass_pct,
  latency_p95_ms,
  CASE
    WHEN conf_ge_082_ratio >= 0.95 AND regen_rate < 0.15 AND citations_pass_ratio >= 0.95
      THEN '✅ ALL TARGETS MET'
    ELSE '⚠️ SOME TARGETS MISSED'
  END AS status
FROM quality_metrics_daily
WHERE day = CURRENT_DATE - INTERVAL '1 day'
ORDER BY day DESC;
