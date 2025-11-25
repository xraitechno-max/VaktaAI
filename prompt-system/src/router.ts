/**
 * Router for VaktaAI Dynamic Prompt System
 * Selects model based on task characteristics and policy rules
 */

import type { OrchestratorTask, RouterDecision, TaskMode, ModelName } from "./contracts.js";
import { logger } from "./utils/log.js";

// Policy-based routing rules (from vaktaai-policy.yaml)
interface RoutingRule {
  name: string;
  conditions: (task: OrchestratorTask) => boolean;
  priority_order: ModelName[];
  rationale: string;
}

// Temperature per mode (from policy)
const TEMPERATURE_BY_MODE: Record<TaskMode, number> = {
  solve: 0.0,
  derive: 0.0,
  explain: 0.15,
  revise: 0.15,
  docchat: 0.1,
  strategy: 0.2,
  plan: 0.15,
};

// Max tokens per mode (from policy)
const MAX_TOKENS_BY_MODE: Record<TaskMode, number> = {
  solve: 1500,
  derive: 2000,
  explain: 2500,
  revise: 2000,
  docchat: 1200,
  strategy: 2500,
  plan: 3000,
};

export class Router {
  private rules: RoutingRule[];
  private defaultModel: ModelName = "gpt-4o";

  constructor() {
    // Define routing rules based on policy
    this.rules = [
      {
        name: "numeric_heavy",
        conditions: (task) => {
          return (
            (task.signals?.numeric === true || task.mode === "solve" || task.mode === "derive") &&
            !task.signals?.safety_critical
          );
        },
        priority_order: ["grok-2-math", "claude-3.5-sonnet", "gpt-4o"],
        rationale: "Mathematical computation requires specialized reasoning",
      },
      {
        name: "pedagogy_safety",
        conditions: (task) => {
          return (
            (task.mode === "explain" || task.mode === "revise" || task.mode === "strategy") &&
            (task.signals?.safety_critical === true || task.subject === "Biology" || task.subject === "Chemistry")
          );
        },
        priority_order: ["claude-3.5-sonnet", "gpt-4o", "gemini-1.5-pro"],
        rationale: "Pedagogical content requires careful, safe explanations",
      },
      {
        name: "fast_docchat",
        conditions: (task) => {
          return task.mode === "docchat";
        },
        priority_order: ["gemini-1.5-flash", "gpt-4o-mini", "gpt-4o"],
        rationale: "Document chat prioritizes speed and cost-effectiveness",
      },
      {
        name: "planning",
        conditions: (task) => {
          return task.mode === "plan" || task.mode === "strategy";
        },
        priority_order: ["claude-3.5-sonnet", "gpt-4o", "gemini-1.5-pro"],
        rationale: "Planning requires structured, logical thinking",
      },
    ];
  }

  /**
   * Route task to appropriate model
   */
  route(task: OrchestratorTask): RouterDecision {
    logger.debug("Routing task", {
      mode: task.mode,
      subject: task.subject,
      signals: task.signals,
    });

    // Match against rules in priority order
    for (const rule of this.rules) {
      if (rule.conditions(task)) {
        logger.info("Matched routing rule", { rule: rule.name });

        const selected_model = rule.priority_order[0];
        const fallback_models = rule.priority_order.slice(1);

        return {
          selected_model,
          fallback_models,
          temperature: TEMPERATURE_BY_MODE[task.mode],
          max_tokens: MAX_TOKENS_BY_MODE[task.mode],
          rationale: rule.rationale,
          matched_rule: rule.name,
          routing_signals: {
            numeric: task.signals?.numeric ?? false,
            safety_critical: task.signals?.safety_critical ?? false,
            requires_speed: task.mode === "docchat",
          },
        };
      }
    }

    // Default fallback
    logger.warn("No routing rule matched, using default model", { mode: task.mode });

    return {
      selected_model: this.defaultModel,
      fallback_models: ["claude-3.5-sonnet", "gemini-1.5-pro"],
      temperature: TEMPERATURE_BY_MODE[task.mode],
      max_tokens: MAX_TOKENS_BY_MODE[task.mode],
      rationale: "Default routing - no specific rule matched",
      matched_rule: "default",
    };
  }

  /**
   * Get fallback model after primary fails
   */
  getNextFallback(decision: RouterDecision, attemptNumber: number): ModelName | null {
    if (attemptNumber - 1 >= decision.fallback_models.length) {
      return null; // No more fallbacks
    }

    return decision.fallback_models[attemptNumber - 1];
  }
}

// Export singleton instance
export const router = new Router();
