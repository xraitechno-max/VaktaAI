/**
 * Main Orchestrator for VaktaAI Dynamic Prompt System
 * Coordinates: language detection → routing → prompt building → LLM call → verification → final answer
 */

import type {
  OrchestratorTask,
  OrchestratorResult,
  DraftAnswer,
  FinalAnswer,
  PlanAnswer,
  Answer,
  DetectedLanguage,
} from "./contracts.js";
import { languageDetector } from "./languageDetector.js";
import { router } from "./router.js";
import { promptBuilder } from "./promptBuilder.js";
import { toolPlanner } from "./toolplan.js";
import { acceptanceGate } from "./acceptanceGate.js";
import { logger } from "./utils/log.js";
import { extractCitations, countCitations } from "./utils/citations.js";
import { extractFormulasWithUnits } from "./utils/units.js";
import { validateTaskInput } from "./utils/validation.js";
import { withSpan, addSpanEvent, setSpanAttribute } from "./telemetry/otel.js";
import {
  recordResponse,
  recordLanguageDetection,
  recordRAGRetrieval,
  recordModelCall,
  recordCitationValidation,
  regenTotal,
  activeRequests,
} from "./telemetry/metrics.js";

// Mock LLM service interface (to be implemented by integrator)
export interface LLMService {
  generate(messages: any[], model: string, temperature: number, maxTokens: number): Promise<{
    text: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    latency_ms: number;
  }>;
}

export class Orchestrator {
  private llmService: LLMService | null = null;
  private readonly MAX_REGENERATIONS = 2;

  /**
   * Set LLM service implementation
   */
  setLLMService(service: LLMService) {
    this.llmService = service;
  }

  /**
   * Main orchestration flow
   */
  async run(task: OrchestratorTask): Promise<OrchestratorResult> {
    return await withSpan(
      "orchestrator.run",
      {
        mode: task.mode,
        subject: task.subject,
        board: task.board,
        class: task.class,
      },
      async () => {
        const startTime = Date.now();
        activeRequests.labels(task.mode).inc();

        logger.info("Starting orchestrator", {
          mode: task.mode,
          subject: task.subject,
          class: task.class,
        });

        try {
          // 1. Validate input
          const validation = validateTaskInput(task);
          if (!validation.valid) {
            return this.createErrorResult("INVALID_INPUT", validation.errors.join("; "), startTime);
          }

          // 2. Detect language
          const langDetection = await withSpan(
            "lang.detect",
            { text_length: task.user_msg.length, requested_lang: task.lang || "auto" },
            async () => languageDetector.detect(task.user_msg, task.lang)
          );
          const targetLanguage: DetectedLanguage = langDetection.should_switch ? langDetection.label : "english";

          // Record language detection metrics
          recordLanguageDetection(langDetection.label, langDetection.should_switch, langDetection.confidence);

          logger.info("Language detected", {
            detected: langDetection.label,
            confidence: langDetection.confidence,
            target: targetLanguage,
          });

          // 3. Route to model
          const routingDecision = await withSpan(
            "router.decide",
            {
              mode: task.mode,
              numeric: task.signals?.numeric,
              safety_critical: task.signals?.safety_critical,
            },
            async () => router.route(task)
          );

          addSpanEvent("model_selected", {
            model: routingDecision.selected_model,
            rule: routingDecision.matched_rule,
          });

          logger.info("Model selected", {
            model: routingDecision.selected_model,
            rule: routingDecision.matched_rule,
          });

          // 4. Execute tool plan (RAG retrieval)
          const evidence = await withSpan(
            "rag.retrieve",
            { mode: task.mode, subject: task.subject },
            async () => toolPlanner.executePlan(task)
          );

          // Record RAG metrics
          recordRAGRetrieval(
            task.mode,
            task.subject,
            evidence.total_retrieved,
            evidence.chunks.reduce((sum: number, c: any) => sum + (c.similarity || 0), 0) / evidence.total_retrieved || 0
          );

          logger.info("Evidence retrieved", {
            chunks: evidence.total_retrieved,
            sufficient: evidence.has_sufficient_evidence,
          });

          // 5. Build prompt
          const promptOutput = await withSpan(
            "prompt.build",
            { mode: task.mode, language: targetLanguage },
            async () => promptBuilder.build(task, evidence, targetLanguage)
          );

          // 6. Generate draft with regeneration loop
          let regenerationCount = 0;
          let draft: DraftAnswer | null = null;
          let verifierReport: any = null;
          let currentModel = routingDecision.selected_model;

          while (regenerationCount <= this.MAX_REGENERATIONS) {
            // Generate draft
            draft = await withSpan(
              "llm.generate",
              {
                model: currentModel,
                mode: task.mode,
                attempt: regenerationCount + 1,
              },
              async () =>
                this.generateDraft(
                  promptOutput.messages,
                  currentModel,
                  routingDecision.temperature,
                  routingDecision.max_tokens,
                  task.mode,
                  regenerationCount > 0 ? verifierReport : undefined
                )
            );

            // 7. Run acceptance gate
            verifierReport = await withSpan(
              "gate.verify",
              { mode: task.mode, attempt: regenerationCount + 1 },
              async () => acceptanceGate.verify(draft!, targetLanguage, task.mode, regenerationCount)
            );

            logger.info("Verification complete", {
              attempt: regenerationCount + 1,
              passed: verifierReport.overall_pass,
              confidence: verifierReport.confidence_score,
            });

            addSpanEvent("verification_complete", {
              attempt: regenerationCount + 1,
              passed: verifierReport.overall_pass,
              confidence: verifierReport.confidence_score,
            });

            // Check if passed
            if (verifierReport.overall_pass) {
              break;
            }

            // Check if should regenerate
            if (!verifierReport.should_regenerate || regenerationCount >= this.MAX_REGENERATIONS) {
              break;
            }

            // Prepare for regeneration
            regenerationCount++;

            // Record regeneration
            const regenReasons = [];
            if (!verifierReport.gates.fact_check.passed) regenReasons.push("fact_unsupported");
            if (!verifierReport.gates.math_check.passed) regenReasons.push("math_fail");
            if (!verifierReport.gates.language_check.passed) regenReasons.push("lang_mismatch");
            if (verifierReport.confidence_score < 0.72) regenReasons.push("low_conf");

            regenReasons.forEach((reason) => {
              regenTotal.labels(task.mode, reason).inc();
            });

            // Switch model if strategy says so
            if (verifierReport.regeneration_strategy?.switch_model) {
              const nextModel = router.getNextFallback(routingDecision, regenerationCount);
              if (nextModel) {
                currentModel = nextModel;
                logger.info("Switching to fallback model", { model: currentModel });
                addSpanEvent("model_switch", { from: routingDecision.selected_model, to: currentModel });
              }
            }

            // Update prompt with tightened instructions
            if (verifierReport.regeneration_strategy?.tightened_instructions) {
              promptOutput.system_prompt += "\n\n" + verifierReport.regeneration_strategy.tightened_instructions;
              promptOutput.messages[0].content = promptOutput.system_prompt;
            }
          }

          // Check if we exhausted attempts
          if (!verifierReport!.overall_pass) {
            if (regenerationCount >= this.MAX_REGENERATIONS) {
              activeRequests.labels(task.mode).dec();
              return this.createErrorResult(
                "MAX_REGENERATIONS_EXCEEDED",
                `Failed to generate acceptable answer after ${this.MAX_REGENERATIONS} attempts. Last confidence: ${verifierReport!.confidence_score}`,
                startTime
              );
            }
            activeRequests.labels(task.mode).dec();
            return this.createErrorResult(
              "VERIFICATION_FAILED",
              `Answer did not pass verification gates. Confidence: ${verifierReport!.confidence_score}`,
              startTime
            );
          }

          // 8. Create final answer
          const finalAnswer = this.createFinalAnswer(draft!, task, targetLanguage, verifierReport!, currentModel, evidence);

          const totalLatency = Date.now() - startTime;

          // Record citation validation metrics
          recordCitationValidation(
            task.mode,
            task.subject,
            verifierReport!.gates.fact_check.passed,
            verifierReport!.gates.fact_check.passed ? undefined : "missing_or_invalid"
          );

          // Record final response metrics
          recordResponse(
            task.mode,
            task.subject,
            targetLanguage,
            currentModel,
            verifierReport!.confidence_score,
            regenerationCount,
            totalLatency
          );

          logger.info("Orchestration complete", {
            success: true,
            latency_ms: totalLatency,
            regenerations: regenerationCount,
          });

          activeRequests.labels(task.mode).dec();

          return {
            success: true,
            answer: finalAnswer,
            metadata: {
              total_latency_ms: totalLatency,
              model_used: currentModel,
              regeneration_count: regenerationCount,
              language_detected: targetLanguage,
              confidence_score: verifierReport!.confidence_score,
            },
          };
        } catch (error: any) {
          activeRequests.labels(task.mode).dec();
          logger.error("Orchestration failed", { error: error.message });
          return this.createErrorResult("ORCHESTRATION_ERROR", error.message, startTime);
        }
      }
    );
  }

  /**
   * Generate draft answer from LLM
   */
  private async generateDraft(
    messages: any[],
    model: string,
    temperature: number,
    maxTokens: number,
    mode: any,
    previousVerification?: any
  ): Promise<DraftAnswer> {
    // Mock implementation if no LLM service configured
    if (!this.llmService) {
      logger.warn("No LLM service configured, returning mock draft");
      return this.createMockDraft(mode);
    }

    const startTime = Date.now();
    const attempt = previousVerification ? 2 : 1; // Simplified attempt tracking

    const response = await this.llmService.generate(messages, model, temperature, maxTokens);

    // Record model call metrics
    recordModelCall(
      model,
      attempt,
      response.latency_ms,
      response.usage.prompt_tokens,
      response.usage.completion_tokens
    );

    const draft: DraftAnswer = {
      raw_text: response.text,
      model_used: model,
      mode,
      usage: response.usage,
      latency_ms: response.latency_ms,
      extracted_citations: extractCitations(response.text),
      extracted_formulas: extractFormulasWithUnits(response.text),
      metadata: {
        generated_at: new Date().toISOString(),
        temperature,
        max_tokens: maxTokens,
        stop_reason: "stop",
      },
    };

    return draft;
  }

  /**
   * Create final answer from verified draft
   */
  private createFinalAnswer(
    draft: DraftAnswer,
    task: OrchestratorTask,
    language: DetectedLanguage,
    verification: any,
    model: string,
    evidence: any
  ): Answer {
    // Extract citations
    const citations = extractCitations(draft.raw_text).map((cit) => {
      const chunk = evidence.chunks.find((c: any) => c.citation === cit);
      return {
        citation_id: cit,
        doc_title: chunk?.metadata?.doc_title,
        page: chunk?.metadata?.page,
        excerpt: chunk?.text?.substring(0, 200),
      };
    });

    // Base answer for all modes except plan
    if (task.mode !== "plan") {
      const finalAnswer: FinalAnswer = {
        answer_text: draft.raw_text,
        mode: task.mode as any,
        language,
        confidence: verification.confidence_score,
        citations,
        formulas: extractFormulasWithUnits(draft.raw_text),
        verification_summary: {
          fact_check_passed: verification.gates.fact_check.passed,
          math_check_passed: verification.gates.math_check.passed,
          language_check_passed: verification.gates.language_check.passed,
          regeneration_count: verification.regeneration_strategy?.attempt_number || 0,
        },
        metadata: {
          model_used: model,
          total_tokens: draft.usage.total_tokens,
          generated_at: new Date().toISOString(),
          context: {
            board: task.board,
            class: task.class,
            subject: task.subject,
            chapter: task.context?.chapter,
          },
        },
      };
      return finalAnswer;
    }

    // For plan mode, parse structured plan (simplified)
    const planAnswer: PlanAnswer = {
      plan_title: `Study Plan for ${task.subject} Class ${task.class}`,
      mode: "plan",
      language,
      duration: {
        total_days: 30,
        daily_study_hours: 3,
      },
      phases: [
        {
          phase_number: 1,
          phase_name: "Foundation",
          duration_days: 10,
          topics: [
            {
              topic_name: "Core Concepts",
              estimated_hours: 20,
              priority: "high",
            },
          ],
        },
      ],
      confidence: verification.confidence_score,
      citations: extractCitations(draft.raw_text),
      metadata: {
        model_used: model,
        generated_at: new Date().toISOString(),
      },
    };

    return planAnswer;
  }

  /**
   * Create error result
   */
  private createErrorResult(code: string, message: string, startTime: number): OrchestratorResult {
    return {
      success: false,
      error: {
        code,
        message,
      },
      metadata: {
        total_latency_ms: Date.now() - startTime,
        model_used: "none",
        regeneration_count: 0,
        language_detected: "english",
        confidence_score: 0,
      },
    };
  }

  /**
   * Create mock draft for testing
   */
  private createMockDraft(mode: string): DraftAnswer {
    const mockText =
      mode === "explain"
        ? "This is a mock explanation. In a real implementation, this would be generated by an LLM based on the prompt. [NCERT:mock_doc:1.1.1]"
        : "This is a mock answer for testing purposes.";

    return {
      raw_text: mockText,
      model_used: "mock",
      mode: mode as any,
      usage: {
        prompt_tokens: 500,
        completion_tokens: 200,
        total_tokens: 700,
      },
      latency_ms: 1000,
      extracted_citations: extractCitations(mockText),
      extracted_formulas: [],
      metadata: {
        generated_at: new Date().toISOString(),
        temperature: 0.15,
        max_tokens: 2000,
        stop_reason: "stop",
      },
    };
  }
}

// Export singleton
export const orchestrator = new Orchestrator();
