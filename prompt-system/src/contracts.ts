/**
 * TypeScript contracts derived from JSON Schemas
 * Auto-generated types for VaktaAI Dynamic Prompt System
 */

// ============================================================================
// ORCHESTRATOR TASK
// ============================================================================
export type TaskMode = "explain" | "solve" | "derive" | "revise" | "docchat" | "strategy" | "plan";
export type Subject = "Physics" | "Chemistry" | "Biology" | "Mathematics" | "General";
export type Board = "CBSE" | "ICSE" | "State" | "JEE" | "NEET";
export type Language = "en" | "hi" | "hinglish" | "auto";

export interface OrchestratorTask {
  user_msg: string;
  mode: TaskMode;
  subject: Subject;
  board: Board;
  class: number; // 6-12
  exam?: string;
  lang?: Language;
  context?: {
    conversation_history?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    doc_ids?: string[];
    chapter?: string;
  };
  signals?: {
    numeric?: boolean;
    safety_critical?: boolean;
    requires_images?: boolean;
    complexity?: "low" | "medium" | "high";
  };
  session?: {
    user_id?: string;
    session_id?: string;
    timestamp?: string;
  };
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================
export type DetectedLanguage = "english" | "hindi" | "hinglish";
export type ScriptType = "latin" | "devanagari" | "mixed";

export interface LanguageDetectionResult {
  label: DetectedLanguage;
  confidence: number; // 0.0-1.0
  detected_from?: string;
  script?: ScriptType;
  char_count?: number;
  should_switch: boolean;
  metadata?: {
    hindi_char_ratio?: number;
    english_word_count?: number;
    hindi_word_count?: number;
  };
}

// ============================================================================
// ROUTER DECISION
// ============================================================================
export type ModelName =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "claude-3.5-sonnet"
  | "claude-3-opus"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "grok-2-math";

export interface RouterDecision {
  selected_model: ModelName;
  fallback_models: ModelName[];
  temperature: number; // 0.0-1.0
  max_tokens: number;
  rationale: string;
  matched_rule?: string;
  routing_signals?: {
    numeric?: boolean;
    safety_critical?: boolean;
    requires_speed?: boolean;
  };
  estimated_cost?: number;
  estimated_latency_ms?: number;
}

// ============================================================================
// EVIDENCE PACK (RAG)
// ============================================================================
export interface EvidenceChunk {
  chunk_id: string;
  text: string;
  citation: string; // NCERT:doc_id:section or PYQ:exam:year:slot:qid
  metadata?: {
    doc_title?: string;
    page?: number;
    chapter?: string;
    board?: Board;
    class?: number;
    subject?: Subject;
  };
  similarity_score: number; // 0.0-1.0
}

export interface EvidencePack {
  chunks: EvidenceChunk[];
  total_retrieved: number;
  retrieval_query?: string;
  filters_applied?: {
    board?: string;
    class?: number;
    subject?: string;
    chapter?: string;
  };
  has_sufficient_evidence: boolean;
  avg_similarity?: number;
}

// ============================================================================
// PROMPT BUILDER OUTPUT
// ============================================================================
export type ToolName =
  | "calculator"
  | "unit_checker"
  | "latex_formatter"
  | "citation_lookup"
  | "rag_search"
  | "citation_check"
  | "pyq_analyzer"
  | "weightage_calc"
  | "date_calculator"
  | "revision_cycler";

export interface PromptBuilderOutput {
  system_prompt: string;
  user_prompt: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  mode: TaskMode;
  language: DetectedLanguage;
  evidence_included: boolean;
  evidence_summary?: {
    chunk_count?: number;
    citation_count?: number;
    sources?: string[];
  };
  tools_declared?: ToolName[];
  constraints?: {
    formulas_in_english?: boolean;
    require_citations?: boolean;
    no_cot_leakage?: boolean;
    verify_units?: boolean;
  };
  metadata?: {
    template_file?: string;
    prompt_tokens_estimate?: number;
    built_at?: string;
  };
}

// ============================================================================
// DRAFT ANSWER
// ============================================================================
export interface DraftAnswer {
  raw_text: string;
  model_used: string;
  mode: TaskMode;
  language_detected?: "english" | "hindi" | "hinglish" | "mixed";
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms?: number;
  preliminary_checks?: {
    has_citations?: boolean;
    citation_count?: number;
    has_formulas?: boolean;
    has_cot_leakage?: boolean;
    estimated_quality_score?: number;
  };
  extracted_citations?: string[];
  extracted_formulas?: string[];
  metadata?: {
    generated_at?: string;
    temperature?: number;
    max_tokens?: number;
    stop_reason?: "stop" | "length" | "content_filter" | "error";
  };
}

// ============================================================================
// VERIFIER REPORT
// ============================================================================
export interface GateResult {
  enabled: boolean;
  passed: boolean;
  score: number; // 0.0-1.0
  details?: any;
  errors?: string[];
}

export interface VerifierReport {
  overall_pass: boolean;
  confidence_score: number; // 0.0-1.0
  should_regenerate: boolean;
  gates: {
    fact_check: GateResult & {
      details?: {
        total_claims?: number;
        cited_claims?: number;
        uncited_claims?: number;
        invalid_citations?: string[];
        unsupported_sentences?: string[];
      };
    };
    math_check: GateResult & {
      details?: {
        formulas_found?: number;
        unit_consistency?: boolean;
        sig_figs_consistent?: boolean;
        dimensional_analysis?: boolean;
        unit_errors?: string[];
        calculation_errors?: string[];
      };
    };
    language_check: GateResult & {
      details?: {
        target_language?: DetectedLanguage;
        detected_language?: "english" | "hindi" | "hinglish" | "mixed";
        language_match?: boolean;
        formulas_in_english?: boolean;
        units_in_english?: boolean;
        has_cot_leakage?: boolean;
        cot_markers_found?: string[];
        non_english_formulas?: string[];
      };
    };
  };
  regeneration_strategy?: {
    attempt_number?: number;
    action?: "none" | "tighten_constraints" | "switch_model_and_tighten" | "escalate";
    switch_model?: boolean;
    suggested_model?: string;
    tightened_instructions?: string;
  };
  metadata?: {
    verified_at?: string;
    verification_latency_ms?: number;
  };
}

// ============================================================================
// FINAL ANSWER (Generic Modes)
// ============================================================================
export interface Citation {
  citation_id: string;
  doc_title?: string;
  page?: number;
  excerpt?: string;
}

export interface FinalAnswer {
  answer_text: string;
  mode: Exclude<TaskMode, "plan">; // All except plan
  language: DetectedLanguage;
  confidence: number; // >= 0.82
  citations: Citation[];
  formulas?: string[];
  key_concepts?: string[];
  verification_summary?: {
    fact_check_passed?: boolean;
    math_check_passed?: boolean;
    language_check_passed?: boolean;
    regeneration_count?: number; // 0-2
  };
  metadata?: {
    model_used?: string;
    total_tokens?: number;
    total_latency_ms?: number;
    generated_at?: string;
    context?: {
      board?: string;
      class?: number;
      subject?: string;
      chapter?: string;
    };
  };
}

// ============================================================================
// PLAN ANSWER (Plan Mode)
// ============================================================================
export interface TopicResource {
  type: "NCERT" | "PYQ" | "Reference Book" | "Video" | "Notes";
  reference: string;
}

export interface Topic {
  topic_name: string;
  chapter?: string;
  estimated_hours: number;
  priority: "high" | "medium" | "low";
  weightage?: number;
  resources?: TopicResource[];
  practice_problems?: number;
}

export interface Phase {
  phase_number: number;
  phase_name: string;
  duration_days: number;
  goals?: string[];
  topics: Topic[];
  milestones?: string[];
}

export interface RevisionCycle {
  cycle_number: number;
  timing: string;
  duration_hours?: number;
  focus?: string;
}

export interface TimeSlot {
  time_slot: string;
  activity: string;
}

export interface MockTest {
  day: number;
  type: string;
  duration_hours?: number;
}

export interface PlanAnswer {
  plan_title: string;
  mode: "plan";
  language: DetectedLanguage;
  duration: {
    total_days: number;
    start_date?: string;
    end_date?: string;
    daily_study_hours: number;
  };
  phases: Phase[];
  revision_schedule?: {
    cycles?: RevisionCycle[];
    strategy?: string;
  };
  daily_schedule_template?: {
    morning?: TimeSlot[];
    afternoon?: TimeSlot[];
    evening?: TimeSlot[];
  };
  assessment_strategy?: {
    weekly_tests?: boolean;
    mock_tests?: MockTest[];
    self_evaluation_frequency?: string;
  };
  tips_and_strategy?: string[];
  confidence: number; // >= 0.82
  citations?: string[];
  metadata?: {
    model_used?: string;
    generated_at?: string;
    context?: {
      board?: string;
      class?: number;
      subject?: string;
      exam?: string;
    };
  };
}

// ============================================================================
// UNION TYPES FOR ORCHESTRATOR
// ============================================================================
export type Answer = FinalAnswer | PlanAnswer;

export interface OrchestratorResult {
  success: boolean;
  answer?: Answer;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    total_latency_ms: number;
    model_used: string;
    regeneration_count: number;
    language_detected: DetectedLanguage;
    confidence_score: number;
  };
}
