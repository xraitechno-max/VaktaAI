# Instrumentation & Monitoring Integration Guide

Complete guide to integrate OpenTelemetry tracing, Prometheus metrics, and PostgreSQL analytics into your VaktaAI deployment.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Metrics Endpoint Setup](#metrics-endpoint-setup)
3. [OpenTelemetry Configuration](#opentelemetry-configuration)
4. [Prometheus Setup](#prometheus-setup)
5. [Grafana Dashboards](#grafana-dashboards)
6. [PostgreSQL Analytics](#postgresql-analytics)
7. [Alert Configuration](#alert-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Install Dependencies

```bash
cd prompt-system
npm install
```

Dependencies added to `package.json`:
- `@opentelemetry/api` - OpenTelemetry tracing API
- `prom-client` - Prometheus metrics library

### 2. Build the System

```bash
npm run build
```

### 3. Verify Instrumentation

The orchestrator is now automatically instrumented with:
- **OTEL spans** for distributed tracing
- **Prometheus metrics** for production monitoring
- All metrics recorded during orchestration flow

---

## Metrics Endpoint Setup

### Express.js Integration

Add `/metrics` endpoint to your Express server:

```typescript
import express from 'express';
import { getPrometheusMetrics, getPrometheusContentType } from '@vaktaai/prompt-system';

const app = express();

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await getPrometheusMetrics();
    res.set('Content-Type', getPrometheusContentType());
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Metrics available at http://localhost:3000/metrics');
});
```

### Verify Metrics Endpoint

```bash
curl http://localhost:3000/metrics
```

Expected output:
```
# HELP vaktaai_responses_total Total orchestrator responses
# TYPE vaktaai_responses_total counter
vaktaai_responses_total{mode="explain",subject="Physics",lang="hinglish",model="gpt-4o",status="ok"} 42

# HELP vaktaai_confidence Final confidence distribution
# TYPE vaktaai_confidence histogram
vaktaai_confidence_bucket{le="0.82",mode="solve",subject="Math",model="grok-2-math"} 5
vaktaai_confidence_bucket{le="0.9",mode="solve",subject="Math",model="grok-2-math"} 38
...
```

---

## OpenTelemetry Configuration

### Spans Automatically Created

The orchestrator creates the following spans:

| Span Name | Description | Attributes |
|-----------|-------------|------------|
| `orchestrator.run` | Main orchestration flow | mode, subject, board, class |
| `lang.detect` | Language detection | text_length, requested_lang |
| `router.decide` | Model routing decision | mode, numeric, safety_critical |
| `rag.retrieve` | RAG evidence retrieval | mode, subject |
| `prompt.build` | Prompt construction | mode, language |
| `llm.generate` | LLM API call | model, mode, attempt |
| `gate.verify` | Acceptance gate verification | mode, attempt |

### Viewing Traces (Optional)

If you have an OpenTelemetry collector (Jaeger, Zipkin, etc.), configure the SDK:

```typescript
// otel-setup.ts (create this file)
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

const provider = new NodeTracerProvider();

const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

console.log('OpenTelemetry tracing enabled');
```

Then import before running orchestrator:
```typescript
import './otel-setup.js';
import { runOrchestrator } from '@vaktaai/prompt-system';
```

---

## Prometheus Setup

### 1. Install Prometheus

**macOS:**
```bash
brew install prometheus
```

**Linux:**
```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

### 2. Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Load alert rules
rule_files:
  - "alerts/prometheus-alerts.yml"

scrape_configs:
  - job_name: 'vaktaai-orchestrator'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### 3. Copy Alert Rules

```bash
cp prompt-system/alerts/prometheus-alerts.yml /path/to/prometheus/alerts/
```

### 4. Start Prometheus

```bash
prometheus --config.file=prometheus.yml
```

Open Prometheus UI: **http://localhost:9090**

### 5. Verify Metrics Collection

In Prometheus UI, run query:
```
vaktaai_responses_total
```

You should see your metrics appearing.

---

## Grafana Dashboards

### 1. Install Grafana

**macOS:**
```bash
brew install grafana
brew services start grafana
```

**Linux:**
```bash
sudo apt-get install -y grafana
sudo systemctl start grafana-server
```

Open Grafana: **http://localhost:3000** (default user/pass: admin/admin)

### 2. Add Prometheus Data Source

1. Go to **Configuration → Data Sources**
2. Click **Add data source**
3. Select **Prometheus**
4. URL: `http://localhost:9090`
5. Click **Save & Test**

### 3. Create Dashboard

Create a new dashboard with these panels:

#### Panel 1: Confidence ≥0.82 Ratio (Target: 95%+)

```promql
(
  sum(rate(vaktaai_confidence_bucket{le="0.82"}[5m]))
  /
  sum(rate(vaktaai_confidence_count[5m]))
)
```

- **Visualization**: Stat
- **Thresholds**: Red < 0.95, Green ≥ 0.95
- **Unit**: Percent (0.0-1.0)

#### Panel 2: Regeneration Rate (Target: <15%)

```promql
(
  sum(rate(vaktaai_regenerations_total[10m]))
  /
  sum(rate(vaktaai_responses_total[10m]))
)
```

- **Visualization**: Time series
- **Thresholds**: Green < 0.15, Yellow 0.15-0.20, Red > 0.20
- **Unit**: Percent (0.0-1.0)

#### Panel 3: Hinglish Detection Accuracy

```promql
sum(rate(vaktaai_language_detect_total{detected="hinglish"}[5m]))
by (conf_bucket)
```

- **Visualization**: Pie chart
- **Legend**: Show conf_bucket labels

#### Panel 4: Citations Valid Ratio (Target: 95%+)

```promql
(
  sum(rate(vaktaai_citations_ok_total[5m]))
  /
  (sum(rate(vaktaai_citations_ok_total[5m])) + sum(rate(vaktaai_citations_fail_total[5m])))
)
```

- **Visualization**: Gauge
- **Min**: 0, **Max**: 1
- **Thresholds**: Red < 0.95, Green ≥ 0.95

#### Panel 5: p95 Latency (Target: 1.7-4.2s)

```promql
histogram_quantile(0.95,
  sum(rate(vaktaai_e2e_latency_ms_bucket[5m])) by (le, mode)
)
```

- **Visualization**: Time series
- **Unit**: milliseconds
- **Thresholds**: Green 1700-4200, Yellow 4200-6000, Red > 6000

#### Panel 6: Model Usage Distribution

```promql
sum(rate(vaktaai_model_calls_total[5m])) by (model)
```

- **Visualization**: Pie chart
- **Legend**: Show model names

#### Panel 7: Active Requests

```promql
sum(vaktaai_active_requests) by (mode)
```

- **Visualization**: Time series
- **Legend**: Show by mode

#### Panel 8: Token Consumption Rate

```promql
sum(rate(vaktaai_tokens_total[1h])) by (type)
```

- **Visualization**: Time series
- **Stack**: True
- **Legend**: prompt vs completion tokens

### 4. Save Dashboard

Save as **"VaktaAI Prompt System - Production Metrics"**

---

## PostgreSQL Analytics

### 1. Run Database Migrations

```bash
cd prompt-system/migrations

# Apply schema
psql -U your_user -d your_database -f 001_quality_metrics.sql

# Verify tables created
psql -U your_user -d your_database -c "\dt quality_metrics_daily orchestrator_events"
```

### 2. Insert Event Data

During orchestration, insert events to `orchestrator_events`:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function logOrchestratorEvent(result: OrchestratorResult, task: OrchestratorTask) {
  await pool.query(`
    INSERT INTO orchestrator_events (
      ts, user_id, session_id, mode, subject, board, class,
      user_msg, lang_requested, lang_detected, lang_switched,
      model_selected, confidence, regenerations, regen_reasons,
      fact_check_passed, math_check_passed, lang_check_passed,
      citations_valid, citations_count,
      start_ms, end_ms, latency_ms,
      prompt_tokens, completion_tokens, total_tokens,
      status
    ) VALUES (
      NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
    )
  `, [
    task.user_id,
    task.session_id,
    task.mode,
    task.subject,
    task.board,
    task.class,
    task.user_msg,
    task.lang,
    result.metadata.language_detected,
    langSwitched,
    result.metadata.model_used,
    result.metadata.confidence_score,
    result.metadata.regeneration_count,
    regenReasons,
    factCheckPassed,
    mathCheckPassed,
    langCheckPassed,
    citationsValid,
    citationsCount,
    startMs,
    endMs,
    latencyMs,
    promptTokens,
    completionTokens,
    totalTokens,
    result.success ? 'ok' : 'fail'
  ]);
}
```

### 3. Schedule Daily Aggregation

Create a cron job to run daily at 00:30 UTC:

```bash
crontab -e
```

Add:
```
30 0 * * * psql -U your_user -d your_database -f /path/to/migrations/002_daily_rollup.sql >> /var/log/vaktaai-rollup.log 2>&1
```

Or use a Node.js scheduler:

```typescript
import cron from 'node-cron';
import { exec } from 'child_process';

// Run daily at 00:30
cron.schedule('30 0 * * *', () => {
  exec('psql -U user -d db -f migrations/002_daily_rollup.sql', (err, stdout) => {
    if (err) {
      console.error('Daily rollup failed:', err);
    } else {
      console.log('Daily rollup complete:', stdout);
    }
  });
});
```

### 4. Query Daily Metrics

```sql
SELECT
  day,
  responses_total,
  ROUND(conf_ge_082_ratio * 100, 1) || '%' AS confidence_target,
  ROUND(regen_rate * 100, 1) || '%' AS regen_rate,
  ROUND(citations_pass_ratio * 100, 1) || '%' AS citations_pass,
  latency_p95_ms,
  CASE
    WHEN conf_ge_082_ratio >= 0.95 AND regen_rate < 0.15 AND citations_pass_ratio >= 0.95
      THEN '✅ ALL TARGETS MET'
    ELSE '⚠️ SOME TARGETS MISSED'
  END AS status
FROM quality_metrics_daily
WHERE day >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY day DESC;
```

---

## Alert Configuration

### Alerts Included

Located in `alerts/prometheus-alerts.yml`:

| Alert | Severity | Condition | Duration | Action |
|-------|----------|-----------|----------|--------|
| **LowConfidenceBurst** | page | >5% responses with confidence <0.82 | 10m | Page on-call |
| **HighRegenRate** | ticket | >15% regeneration rate | 15m | Create ticket |
| **CitationFailures** | ticket | >3 citation failures/sec | 10m | Investigate RAG |
| **LatencySLOViolation** | page | p95 latency >4.2s | 15m | Check LLM provider |
| **HighErrorRate** | page | >1% error rate | 10m | Check logs |
| **ModelLatencySpike** | ticket | Model p95 >7s | 10m | Check provider status |
| **LowRAGChunks** | ticket | Median <2 chunks retrieved | 20m | Check vector DB |

### Configure AlertManager

Create `alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'team-slack'

  routes:
    - match:
        severity: page
      receiver: 'pagerduty'

    - match:
        severity: ticket
      receiver: 'team-slack'

receivers:
  - name: 'team-slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#vaktaai-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

Start AlertManager:
```bash
alertmanager --config.file=alertmanager.yml
```

### Test Alerts

Manually trigger low confidence:
```bash
# Send low confidence responses to trigger alert
for i in {1..10}; do
  curl -X POST http://localhost:3000/orchestrator \
    -H "Content-Type: application/json" \
    -d '{"user_msg": "test", "mode": "explain", "subject": "Physics", "board": "CBSE", "class": 11}'
done
```

---

## Troubleshooting

### Cannot Find Module Errors

**Error:**
```
Error: Cannot find module './telemetry/otel.js'
```

**Fix:**
```bash
cd prompt-system
npm run build
```

### Low Confidence Scores

**Symptom:** Alert `LowConfidenceBurst` firing

**Diagnosis:**
1. Check Grafana panel "Confidence ≥0.82 Ratio"
2. Query failing gates:
```promql
sum(rate(vaktaai_gate_failures_total[10m])) by (gate, reason)
```

**Common Causes:**
- RAG retrieving insufficient evidence → Check `LowRAGChunks` alert
- Fact-check failures → Review citation coverage
- Math errors → Check unit consistency validation
- Language mismatch → Verify Hinglish detection

**Fix:**
```sql
-- Find failing verification reasons
SELECT
  regen_reasons,
  COUNT(*) as occurrences
FROM orchestrator_events
WHERE ts > NOW() - INTERVAL '1 hour'
  AND regenerations > 0
GROUP BY regen_reasons
ORDER BY occurrences DESC;
```

### High Regeneration Rate

**Symptom:** Alert `HighRegenRate` firing (>15%)

**Diagnosis:**
```promql
sum(rate(vaktaai_regenerations_total[10m])) by (mode, reason)
```

**Common Reasons:**
- `fact_unsupported` → RAG quality issue
- `math_fail` → Unit verification too strict
- `citation_missing` → Template not enforcing citations
- `low_conf` → Acceptance threshold too high

**Fix:**
Adjust acceptance gate in `policy/vaktaai-policy.yaml`:
```yaml
acceptance:
  confidence_min: 0.82  # Lower to 0.78 if needed
  auto_regenerate_below: 0.72  # Lower to 0.68
```

### Latency Spikes

**Symptom:** Alert `LatencySLOViolation` or `ModelLatencySpike`

**Diagnosis:**
```promql
histogram_quantile(0.95,
  sum(rate(vaktaai_model_latency_ms_bucket[5m])) by (le, model)
)
```

**Common Causes:**
- LLM provider rate limiting
- Large context (too many RAG chunks)
- Network latency

**Fix:**
1. Check LLM provider status page
2. Reduce RAG `top_k` in policy:
```yaml
tools:
  rag:
    top_k: 4  # Reduce from 6
```
3. Add timeout handling in LLM service wrapper

### Metrics Not Appearing in Prometheus

**Check:**
1. `/metrics` endpoint is accessible:
```bash
curl http://localhost:3000/metrics
```

2. Prometheus scraping:
```bash
# Check Prometheus targets
open http://localhost:9090/targets
```

3. Orchestrator is actually running:
```typescript
// Verify with health check
const health = healthCheck();
console.log(health);  // llm_service: true, rag_service: true
```

### PostgreSQL Daily Rollup Failing

**Error:**
```
ERROR:  column "day" does not exist
```

**Fix:**
Ensure migration `001_quality_metrics.sql` was run first:
```bash
psql -U user -d db -c "SELECT * FROM quality_metrics_daily LIMIT 1"
```

If table doesn't exist:
```bash
psql -U user -d db -f migrations/001_quality_metrics.sql
```

---

## Next Steps

1. ✅ **Metrics endpoint exposed** at `/metrics`
2. ✅ **Prometheus scraping** configured
3. ✅ **Grafana dashboards** created
4. ✅ **PostgreSQL analytics** running daily
5. ✅ **Alerts configured** in AlertManager

### Additional Enhancements

- **Cost tracking**: Add billing metrics per model
- **User analytics**: Track usage by user_id, session_id
- **A/B testing**: Compare model performance
- **Custom SLIs**: Define service-level indicators for your use case

---

## Support

For issues with instrumentation:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Prometheus UI: http://localhost:9090
3. Check Grafana dashboards for anomalies
4. Query `orchestrator_events` table for detailed logs

**Documentation:**
- Prometheus: https://prometheus.io/docs
- Grafana: https://grafana.com/docs
- OpenTelemetry: https://opentelemetry.io/docs
