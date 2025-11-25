# VaktaAI Dynamic Prompt System - Build Progress

## ✅ COMPLETED (Phase 1)

### 1. Policy Configuration
- ✅ `policy/vaktaai-policy.yaml` (300+ lines)
  - Language policy with auto-switch (English default, confidence threshold 0.75)
  - Retrieval/RAG policy (top_k: 6, bilingual embeddings)
  - Routing rules for 4 scenarios (numeric_heavy, pedagogy_safety, fast_docchat, planning)
  - Temperature per mode (solve: 0.0, explain: 0.15, etc.)
  - Max tokens per mode
  - Acceptance gates (confidence_min: 0.82, max_regenerations: 2)
  - Tools required by mode
  - Safety and compliance rules
  - Performance SLAs

### 2. JSON Schemas (All 9)
- ✅ `schemas/OrchestratorTask.schema.json` - Input task contract
- ✅ `schemas/LanguageDetectionResult.schema.json` - Language detection output
- ✅ `schemas/RouterDecision.schema.json` - Model selection decision
- ✅ `schemas/EvidencePack.schema.json` - RAG retrieval results
- ✅ `schemas/PromptBuilderOutput.schema.json` - Assembled prompt
- ✅ `schemas/DraftAnswer.schema.json` - Initial LLM response
- ✅ `schemas/VerifierReport.schema.json` - Verification gate results
- ✅ `schemas/FinalAnswer.schema.json` - Verified final answer
- ✅ `schemas/PlanAnswer.schema.json` - Study plan structure

### 3. TypeScript Contracts
- ✅ `src/contracts.ts` (200+ lines)
  - All TypeScript types derived from JSON schemas
  - Type-safe interfaces for entire system
  - Union types for Answer (FinalAnswer | PlanAnswer)

### 4. Utility Modules
- ✅ `src/utils/log.ts` - Structured logging with levels
- ✅ `src/utils/citations.ts` - Citation extraction, validation, NCERT/PYQ parsing
- ✅ `src/utils/units.ts` - SI unit validation, dimensional analysis, sig fig checking
- ✅ `src/utils/validation.ts` - COT detection, language detection, quality scoring

### 5. Core Modules
- ✅ `src/languageDetector.ts` - Hindi/Hinglish/English detection with confidence
  - Devanagari script detection
  - Hinglish word detection
  - Hysteresis for stable detection
  - Confidence thresholding (0.75)

- ✅ `src/router.ts` - Model selection based on policy rules
  - 4 routing rules implemented
  - Fallback model selection
  - Temperature and max_tokens per mode

- ✅ `src/acceptanceGate.ts` - Verification gates
  - Fact-checking gate (citation verification)
  - Math gate (unit consistency, sig figs)
  - Language gate (COT leakage detection, formula language check)
  - Confidence calculation (0.82 threshold)
  - Regeneration strategy (max 2 attempts)

### 6. Prompt Templates
- ✅ `src/templates/explain.system.txt` - Concept explanation template
  - Hinglish/Hindi/English variants
  - Citation requirements
  - No COT leakage rules

- ✅ `src/templates/solve.system.txt` - Problem solving template
  - Temperature 0.0 (deterministic)
  - Unit verification requirements
  - Step-by-step format

- ✅ `src/templates/docchat.system.txt` - Document Q&A template
  - Evidence-only responses
  - Strict citation requirements
  - Fast, cost-effective

## 🚧 REMAINING WORK (Phase 2)

### Core Implementation (Critical)
- ⏳ `src/promptBuilder.ts` - Template loading & assembly
- ⏳ `src/toolplan.ts` - RAG/tool planning logic
- ⏳ `src/orchestrator.ts` - Main orchestration flow
- ⏳ `src/index.ts` - Public API exports

### Additional Templates
- ⏳ `src/templates/derive.system.txt` - Derivation template
- ⏳ `src/templates/revise.system.txt` - Revision notes template
- ⏳ `src/templates/strategy.system.txt` - Study strategy template
- ⏳ `src/templates/plan.system.txt` - Study plan template

### Infrastructure
- ⏳ `package.json` - Dependencies (zod/ajv, yaml parser, etc.)
- ⏳ `tsconfig.json` - TypeScript configuration
- ⏳ `README.md` - Documentation with exemplars

### Testing
- ⏳ `tests/orchestrator.spec.ts`
- ⏳ `tests/promptBuilder.spec.ts`
- ⏳ `tests/router.spec.ts`
- ⏳ `tests/acceptanceGate.spec.ts`
- ⏳ `tests/fixtures/` - Sample NCERT/PYQ chunks

## 📊 Progress Summary

**Completed:** ~60%
- ✅ All schemas and contracts (100%)
- ✅ All utilities (100%)
- ✅ Policy configuration (100%)
- ✅ 3/7 core modules (43%)
- ✅ 3/7 templates (43%)

**Remaining:** ~40%
- Main orchestration logic
- Prompt builder
- Tool planning
- 4 templates
- Tests & documentation

## 🔑 Key Features Implemented

1. **Language Auto-Detection**
   - Confidence-based switching (0.75 threshold)
   - Hysteresis to prevent oscillation
   - Devanagari + Hinglish word detection

2. **Intelligent Routing**
   - Numeric-heavy tasks → Grok-2-Math
   - Pedagogy/safety → Claude-3.5-Sonnet
   - Fast docchat → Gemini-1.5-Flash
   - Planning → Claude-3.5-Sonnet

3. **Acceptance Gates**
   - Fact verification with citation checking
   - Math verification with unit consistency
   - Language compliance (COT detection, formula language)
   - Regeneration with tightened constraints (max 2 attempts)

4. **Citation System**
   - NCERT format: `NCERT:phy_11_ch2:2.3.1`
   - PYQ format: `PYQ:JEE-Main:2023:APR:42`
   - Automatic extraction and validation

5. **Unit Verification**
   - SI unit enforcement
   - Dimensional analysis
   - Significant figures checking
   - Formula language validation (English-only)

## 🎯 Next Steps

1. Create `promptBuilder.ts` to load templates and inject evidence
2. Create `toolplan.ts` for RAG planning
3. Create `orchestrator.ts` as main entry point
4. Create remaining 4 templates
5. Add `package.json` with dependencies
6. Write comprehensive README with examples
7. Add test suite with fixtures

## 💡 Usage Preview (Once Complete)

```typescript
import { runOrchestrator } from './prompt-system';

const result = await runOrchestrator({
  user_msg: "What is Newton's second law?",
  mode: "explain",
  subject: "Physics",
  board: "CBSE",
  class: 11,
  lang: "hinglish",
  context: {
    doc_ids: ["ncert_phy_11_ch2"]
  },
  signals: {
    numeric: false,
    complexity: "medium"
  }
});

// Result includes:
// - Verified answer (passed all gates)
// - Citations
// - Confidence score (≥ 0.82)
// - Metadata (model used, latency, etc.)
```

---

**Status:** Core architecture complete. Orchestration logic and integration pending.
**Estimated Time to Complete:** ~2-3 hours for remaining implementation + testing.
