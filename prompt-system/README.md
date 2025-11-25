# VaktaAI Dynamic Prompt System

Production-grade prompt orchestration for Indian EdTech platforms (CBSE 6-12 + JEE/NEET) with multi-LLM routing, evidence-first RAG, bilingual auto-switch, and strict verification gates.

## Features

🎯 **Multi-LLM Routing**
- Intelligent model selection based on task characteristics
- Numeric-heavy → Grok-2-Math
- Pedagogy/Safety → Claude-3.5-Sonnet
- Fast DocChat → Gemini-1.5-Flash
- Planning → Claude-3.5-Sonnet

🌐 **Bilingual Auto-Switch**
- Default: English
- Auto-detects Hindi/Hinglish (confidence ≥ 0.75)
- Hysteresis to prevent oscillation
- Formulas/units ALWAYS in English

✅ **Acceptance Gates**
- **Fact Check**: All claims must have citations (`NCERT:doc_id:section` or `PYQ:exam:year:slot:qid`)
- **Math Check**: Unit consistency, significant figures, dimensional analysis
- **Language Check**: No COT leakage, formulas in English only
- Confidence threshold: 0.82 (auto-regenerate below 0.72)
- Max 2 regenerations with tightened constraints

📚 **Evidence-First RAG**
- Top-k retrieval (default: 6 chunks)
- Strict syllabus filtering (board/class/subject/chapter)
- Bilingual embeddings support
- Citation format validation

## Installation

```bash
npm install @vaktaai/prompt-system
```

## Quick Start

### 1. Basic Usage (with Mock Services)

```typescript
import { runOrchestrator } from '@vaktaai/prompt-system';

const result = await runOrchestrator({
  user_msg: "What is Newton's second law?",
  mode: "explain",
  subject: "Physics",
  board: "CBSE",
  class: 11,
  lang: "hinglish",  // or "en", "hi", "auto"
  signals: {
    numeric: false,
    complexity: "medium"
  }
});

if (result.success) {
  console.log(result.answer.answer_text);
  console.log("Confidence:", result.metadata.confidence_score);
  console.log("Citations:", result.answer.citations);
}
```

### 2. Configure with Real LLM Service

```typescript
import { configureLLM, configureRAG, runOrchestrator } from '@vaktaai/prompt-system';
import OpenAI from 'openai';

// Configure LLM
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

configureLLM({
  async generate(messages, model, temperature, maxTokens) {
    const start = Date.now();

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      text: response.choices[0].message.content || '',
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      latency_ms: Date.now() - start,
    };
  }
});

// Configure RAG
configureRAG({
  async retrieve(query, filters, topK) {
    // Your vector DB query
    const results = await vectorDB.search({
      query,
      filters: {
        board: filters.board,
        class: filters.class,
        subject: filters.subject,
      },
      limit: topK,
    });

    return results.map(r => ({
      chunk_id: r.id,
      text: r.text,
      citation: r.metadata.citation,  // Must match NCERT or PYQ format
      metadata: r.metadata,
      similarity_score: r.score,
    }));
  }
});

// Now run orchestrator
const result = await runOrchestrator({...});
```

## Task Modes

### 1. `explain` - Concept Explanations

```typescript
const result = await runOrchestrator({
  user_msg: "Electric charge kya hota hai?",
  mode: "explain",
  subject: "Physics",
  board: "CBSE",
  class: 10,
  lang: "auto",  // Will detect Hinglish
  context: {
    chapter: "Electricity"
  }
});

// Output in natural Hinglish:
// "Dekho, electric charge ek fundamental property hai matter ki..."
// With citations: [NCERT:phy_10_ch1:1.2.1]
```

### 2. `solve` - Math/Physics Problems

```typescript
const result = await runOrchestrator({
  user_msg: "A car accelerates from rest at 2 m/s² for 10s. Find velocity and distance.",
  mode: "solve",
  subject: "Physics",
  board: "CBSE",
  class: 11,
  signals: {
    numeric: true  // Routes to Grok-2-Math
  }
});

// Output with step-by-step solution, unit verification
// Temperature: 0.0 (deterministic)
```

### 3. `docchat` - Document Q&A

```typescript
const result = await runOrchestrator({
  user_msg: "Photosynthesis ke baare me batao",
  mode: "docchat",
  subject: "Biology",
  board: "CBSE",
  class: 9,
  context: {
    doc_ids: ["ncert_bio_9_ch5"]
  }
});

// Evidence-only response with strict citations
// Routes to Gemini-1.5-Flash for speed
```

### 4. `plan` - Study Plans

```typescript
const result = await runOrchestrator({
  user_msg: "Create 30-day JEE Physics revision plan",
  mode: "plan",
  subject: "Physics",
  board: "JEE",
  class: 12,
  exam: "JEE-Main-2025"
});

// Returns PlanAnswer with phases, topics, revision cycles
```

## Routing Rules

The system automatically selects the best model based on task characteristics:

| Rule | Conditions | Primary Model | Fallbacks |
|------|-----------|---------------|-----------|
| **numeric_heavy** | `mode: solve/derive` OR `signals.numeric: true` | Grok-2-Math | Claude-3.5-Sonnet, GPT-4o |
| **pedagogy_safety** | `mode: explain/revise` OR `subject: Bio/Chem` | Claude-3.5-Sonnet | GPT-4o, Gemini-1.5-Pro |
| **fast_docchat** | `mode: docchat` | Gemini-1.5-Flash | GPT-4o-Mini, GPT-4o |
| **planning** | `mode: plan/strategy` | Claude-3.5-Sonnet | GPT-4o, Gemini-1.5-Pro |

## Temperature Settings

```typescript
{
  solve: 0.0,      // Deterministic math
  derive: 0.0,     // Deterministic derivations
  explain: 0.15,   // Slight creativity for analogies
  revise: 0.15,    // Variation in revision formats
  docchat: 0.1,    // Mostly factual
  strategy: 0.2,   // Creative study strategies
  plan: 0.15       // Structured but adaptive
}
```

## Citation Formats

### NCERT Citations
```
NCERT:phy_11_ch2:2.3.1
      └─doc_id─┘ └section┘

Example: "Force = ma [NCERT:phy_11_ch2:2.3.1]"
```

### PYQ Citations
```
PYQ:JEE-Main:2023:APR:42
    └─exam──┘ └year┘ └slot┘ └qid┘

Example: "This was asked in [PYQ:JEE-Main:2023:APR:42]"
```

## Verification Gates

### 1. Fact Check Gate
- ✅ All factual claims have citations
- ✅ Citations match NCERT/PYQ format
- ✅ No unsupported sentences

### 2. Math Check Gate (for `solve`/`derive` modes)
- ✅ Units shown in every step
- ✅ Dimensional analysis correct
- ✅ Significant figures consistent
- ✅ SI units enforced

### 3. Language Check Gate
- ✅ Output matches target language
- ✅ Formulas ALWAYS in English (F = ma, NOT F = द्रव्यमान × त्वरण)
- ✅ Units in English (kg, m/s², NOT किलोग्राम)
- ✅ No COT leakage ("Let me think", "First I will")

## Regeneration Strategy

If verification fails:

**Attempt 1:** Tighten constraints, same model
```typescript
// Adds strict instructions to prompt
"CRITICAL: Every factual claim MUST have citation..."
```

**Attempt 2:** Switch to fallback model + tighten
```typescript
// Switches from GPT-4o → Claude-3.5-Sonnet
// Adds STRICT MODE instructions
```

**Attempt 3:** Escalate
```typescript
// Returns error: MAX_REGENERATIONS_EXCEEDED
```

## Language Detection

```typescript
import { runOrchestrator } from '@vaktaai/prompt-system';

// Auto-detect Hinglish
const result1 = await runOrchestrator({
  user_msg: "Newton ka second law kya hai?",  // Hinglish detected
  mode: "explain",
  lang: "auto",  // confidence >= 0.75 → switches to hinglish
  // ...
});

// Auto-detect Hindi (Devanagari)
const result2 = await runOrchestrator({
  user_msg: "विद्युत आवेश क्या है?",  // Hindi detected
  mode: "explain",
  lang: "auto",  // switches to hindi
  // ...
});

// Force English
const result3 = await runOrchestrator({
  user_msg: "Newton ka second law kya hai?",
  mode: "explain",
  lang: "en",  // Forces English despite Hinglish input
  // ...
});
```

## Advanced Configuration

### Custom Logging

```typescript
import { setLogLevel, setLoggingEnabled } from '@vaktaai/prompt-system';

setLogLevel('debug');  // Show all logs
setLoggingEnabled(true);

// Logs output as structured JSON
// { "timestamp": "2025-01-15T10:30:00Z", "level": "INFO", "message": "..." }
```

### Health Check

```typescript
import { healthCheck } from '@vaktaai/prompt-system';

const status = healthCheck();
// {
//   configured: true,
//   llm_service: true,
//   rag_service: true,
//   version: "1.0.0"
// }
```

## Error Handling

```typescript
const result = await runOrchestrator({...});

if (!result.success) {
  switch (result.error?.code) {
    case 'INVALID_INPUT':
      console.error("Invalid task input:", result.error.message);
      break;

    case 'MAX_REGENERATIONS_EXCEEDED':
      console.error("Failed after 2 regeneration attempts");
      console.log("Last confidence:", result.metadata.confidence_score);
      break;

    case 'VERIFICATION_FAILED':
      console.error("Answer didn't pass verification gates");
      break;

    case 'ORCHESTRATION_ERROR':
      console.error("System error:", result.error.message);
      break;
  }
}
```

## Policy Configuration

The system behavior is controlled by `policy/vaktaai-policy.yaml`:

```yaml
language:
  default: english
  auto_switch: true
  detection:
    confidence_threshold: 0.75
    min_chars: 6

routing:
  rules:
    - name: numeric_heavy
      priority_order: [grok-2-math, claude-3.5-sonnet, gpt-4o]

acceptance:
  confidence_min: 0.82
  auto_regenerate_below: 0.72
  max_regenerations: 2

  gates:
    fact_check:
      require_citations: true
      reject_unsupported: true

    math_check:
      verify_units: true
      verify_sig_figs: true
```

## Example: Complete Integration

```typescript
import {
  configureLLM,
  configureRAG,
  runOrchestrator,
  setLogLevel
} from '@vaktaai/prompt-system';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// 1. Setup logging
setLogLevel('info');

// 2. Configure OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

configureLLM({
  async generate(messages, model, temperature, maxTokens) {
    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: model === 'grok-2-math' ? 'gpt-4o' : model, // Map Grok to GPT-4o
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      text: response.choices[0].message.content || '',
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      latency_ms: Date.now() - start,
    };
  }
});

// 3. Configure Supabase Vector Store
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

configureRAG({
  async retrieve(query, filters, topK) {
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: await getEmbedding(query),
      match_count: topK,
      filter: filters,
    });

    if (error) throw error;

    return data.map(item => ({
      chunk_id: item.id,
      text: item.content,
      citation: item.citation,
      metadata: item.metadata,
      similarity_score: item.similarity,
    }));
  }
});

// 4. Handle user query
async function handleUserQuery(userId: string, message: string) {
  const result = await runOrchestrator({
    user_msg: message,
    mode: "explain",
    subject: "Physics",
    board: "CBSE",
    class: 11,
    lang: "auto",
    session: {
      user_id: userId,
      session_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
  });

  if (result.success) {
    return {
      answer: result.answer.answer_text,
      confidence: result.metadata.confidence_score,
      citations: result.answer.citations,
      model: result.metadata.model_used,
      latency: result.metadata.total_latency_ms,
    };
  } else {
    throw new Error(result.error?.message);
  }
}
```

## Schema Validation

All inputs/outputs conform to JSON Schema Draft 2020-12. Schemas available in `schemas/`:

- `OrchestratorTask.schema.json` - Input contract
- `FinalAnswer.schema.json` - Output for generic modes
- `PlanAnswer.schema.json` - Output for plan mode
- `VerifierReport.schema.json` - Verification results
- And 5 more internal schemas

## TypeScript Types

```typescript
import type {
  OrchestratorTask,
  OrchestratorResult,
  FinalAnswer,
  PlanAnswer,
  EvidencePack,
  RouterDecision,
  VerifierReport,
} from '@vaktaai/prompt-system';
```

## Performance Targets

| Mode | Target Latency | Model | Cost |
|------|---------------|-------|------|
| solve | 3000ms | Grok-2-Math | $$$ |
| explain | 2500ms | Claude-3.5-Sonnet | $$ |
| docchat | 1500ms | Gemini-1.5-Flash | $ |
| plan | 4000ms | Claude-3.5-Sonnet | $$ |

## Testing

```bash
npm install
npm run build
npm test
```

Mock services are provided for testing without LLM/RAG:

```typescript
// Runs with mock LLM and RAG
const result = await runOrchestrator({...});
// Returns mock evidence and generated response
```

## License

MIT

## Contributing

See CONTRIBUTING.md

## Support

- Documentation: https://docs.vaktaai.com
- Issues: https://github.com/vaktaai/prompt-system/issues
- Email: support@vaktaai.com
