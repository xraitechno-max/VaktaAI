/**
 * Router for VaktaAI Dynamic Prompt System
 * Selects model based on task characteristics and policy rules
 */
import type { OrchestratorTask, RouterDecision, ModelName } from "./contracts.js";
export declare class Router {
    private rules;
    private defaultModel;
    constructor();
    /**
     * Route task to appropriate model
     */
    route(task: OrchestratorTask): RouterDecision;
    /**
     * Get fallback model after primary fails
     */
    getNextFallback(decision: RouterDecision, attemptNumber: number): ModelName | null;
}
export declare const router: Router;
//# sourceMappingURL=router.d.ts.map