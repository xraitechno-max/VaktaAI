/**
 * Prompt Builder for VaktaAI Dynamic Prompt System
 * Loads templates and assembles prompts with evidence injection
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { OrchestratorTask, PromptBuilderOutput, EvidencePack, DetectedLanguage, ToolName } from "./contracts.js";
import { logger } from "./utils/log.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tool requirements per mode (from policy)
const TOOLS_BY_MODE: Record<string, ToolName[]> = {
  solve: ["calculator", "unit_checker", "latex_formatter"],
  derive: ["latex_formatter", "citation_lookup"],
  explain: ["rag_search", "citation_lookup"],
  docchat: ["rag_search", "citation_check"],
  revise: ["rag_search", "citation_lookup"],
  strategy: ["pyq_analyzer", "weightage_calc"],
  plan: ["date_calculator", "revision_cycler"],
};

export class PromptBuilder {
  private templateCache: Map<string, string> = new Map();

  /**
   * Build complete prompt from template and evidence
   */
  build(task: OrchestratorTask, evidence: EvidencePack, language: DetectedLanguage): PromptBuilderOutput {
    logger.debug("Building prompt", { mode: task.mode, language });

    // Load template
    const template = this.loadTemplate(task.mode);

    // Assemble system prompt
    const systemPrompt = this.assembleSystemPrompt(template, task, language);

    // Assemble user prompt with evidence
    const userPrompt = this.assembleUserPrompt(task.user_msg, evidence, task.mode);

    // Build messages array
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    // Add conversation history if present
    if (task.context?.conversation_history) {
      const historyMessages = task.context.conversation_history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      // Insert history before current user message
      messages.splice(1, 0, ...historyMessages as any);
    }

    // Evidence summary
    const evidenceSummary = {
      chunk_count: evidence.chunks.length,
      citation_count: evidence.chunks.length,
      sources: evidence.chunks.map((c) => c.citation),
    };

    const output: PromptBuilderOutput = {
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      messages,
      mode: task.mode,
      language,
      evidence_included: evidence.chunks.length > 0,
      evidence_summary: evidenceSummary,
      tools_declared: TOOLS_BY_MODE[task.mode] || [],
      constraints: {
        formulas_in_english: true,
        require_citations: task.mode !== "solve" && task.mode !== "derive",
        no_cot_leakage: true,
        verify_units: task.mode === "solve" || task.mode === "derive",
      },
      metadata: {
        template_file: `${task.mode}.system.txt`,
        prompt_tokens_estimate: this.estimateTokens(systemPrompt + userPrompt),
        built_at: new Date().toISOString(),
      },
    };

    logger.debug("Prompt built", {
      system_length: systemPrompt.length,
      user_length: userPrompt.length,
      evidence_chunks: evidence.chunks.length,
    });

    return output;
  }

  /**
   * Load template from file
   */
  private loadTemplate(mode: string): string {
    // Check cache
    if (this.templateCache.has(mode)) {
      return this.templateCache.get(mode)!;
    }

    // Load from file
    const templatePath = join(__dirname, "templates", `${mode}.system.txt`);

    try {
      const template = readFileSync(templatePath, "utf-8");
      this.templateCache.set(mode, template);
      logger.debug("Template loaded", { mode, path: templatePath });
      return template;
    } catch (error) {
      logger.error("Failed to load template", { mode, error });
      // Fallback to generic template
      return this.getGenericTemplate();
    }
  }

  /**
   * Assemble system prompt from template
   */
  private assembleSystemPrompt(template: string, task: OrchestratorTask, language: DetectedLanguage): string {
    let prompt = template;

    // Replace placeholders
    prompt = prompt.replace(/\{\{BOARD\}\}/g, task.board);
    prompt = prompt.replace(/\{\{CLASS\}\}/g, task.class.toString());
    prompt = prompt.replace(/\{\{SUBJECT\}\}/g, task.subject);
    prompt = prompt.replace(/\{\{LANGUAGE\}\}/g, language);

    // Handle language conditionals
    if (language === "hinglish") {
      prompt = this.processConditional(prompt, "if_hinglish", true);
      prompt = this.processConditional(prompt, "if_hindi", false);
      prompt = this.processConditional(prompt, "if_english", false);
    } else if (language === "hindi") {
      prompt = this.processConditional(prompt, "if_hinglish", false);
      prompt = this.processConditional(prompt, "if_hindi", true);
      prompt = this.processConditional(prompt, "if_english", false);
    } else {
      prompt = this.processConditional(prompt, "if_hinglish", false);
      prompt = this.processConditional(prompt, "if_hindi", false);
      prompt = this.processConditional(prompt, "if_english", true);
    }

    return prompt;
  }

  /**
   * Process conditional blocks in template
   */
  private processConditional(template: string, condition: string, include: boolean): string {
    const startTag = `{{#${condition}}}`;
    const endTag = `{{/${condition}}}`;

    let result = template;

    while (result.includes(startTag)) {
      const startIndex = result.indexOf(startTag);
      const endIndex = result.indexOf(endTag);

      if (endIndex === -1) break;

      const blockContent = result.substring(startIndex + startTag.length, endIndex);

      if (include) {
        // Keep the content, remove the tags
        result = result.substring(0, startIndex) + blockContent + result.substring(endIndex + endTag.length);
      } else {
        // Remove the entire block
        result = result.substring(0, startIndex) + result.substring(endIndex + endTag.length);
      }
    }

    return result;
  }

  /**
   * Assemble user prompt with evidence
   */
  private assembleUserPrompt(userMsg: string, evidence: EvidencePack, mode: string): string {
    let prompt = `QUESTION: ${userMsg}\n\n`;

    // Add evidence if available
    if (evidence.chunks.length > 0) {
      prompt += "EVIDENCE FROM DOCUMENTS:\n\n";

      evidence.chunks.forEach((chunk, index) => {
        const docInfo = chunk.metadata?.doc_title || "Document";
        const page = chunk.metadata?.page ? ` (p.${chunk.metadata.page})` : "";
        prompt += `[${index + 1}] ${chunk.citation}\n`;
        prompt += `${docInfo}${page}\n`;
        prompt += `${chunk.text}\n\n`;
      });
    } else if (mode === "docchat") {
      prompt += "EVIDENCE: No relevant information found in uploaded documents.\n\n";
    }

    // Add mode-specific instructions
    if (mode === "solve") {
      prompt += "Solve step-by-step with unit verification.\n";
    } else if (mode === "explain") {
      prompt += "Provide a comprehensive explanation with proper citations.\n";
    } else if (mode === "docchat") {
      prompt += "Answer based strictly on the evidence above. Include citations.\n";
    } else if (mode === "plan") {
      prompt += "Create a detailed study plan with phases, topics, and revision schedule.\n";
    }

    return prompt;
  }

  /**
   * Estimate token count (rough heuristic: ~4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Generic fallback template
   */
  private getGenericTemplate(): string {
    return `You are VaktaAI, an AI tutor for Indian students.

Respond clearly and helpfully. Provide citations when making factual claims.

CRITICAL:
- NO chain-of-thought reasoning in output
- Keep formulas in English
- Include citations for facts`;
  }
}

// Export singleton
export const promptBuilder = new PromptBuilder();
