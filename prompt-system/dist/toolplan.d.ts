/**
 * Tool Planner for VaktaAI Dynamic Prompt System
 * Plans RAG retrieval and other tool usage
 */
import type { OrchestratorTask, EvidencePack, EvidenceChunk } from "./contracts.js";
export interface RAGService {
    retrieve(query: string, filters: any, topK: number): Promise<EvidenceChunk[]>;
}
export declare class ToolPlanner {
    private ragService;
    /**
     * Set RAG service implementation
     */
    setRAGService(service: RAGService): void;
    /**
     * Plan and execute tool usage for task
     */
    executePlan(task: OrchestratorTask): Promise<EvidencePack>;
    /**
     * Determine if RAG should be used
     */
    private shouldUseRAG;
    /**
     * Execute RAG retrieval
     */
    private executeRAG;
    /**
     * Build retrieval filters from task
     */
    private buildFilters;
    /**
     * Create empty evidence pack
     */
    private createEmptyEvidencePack;
    /**
     * Create mock evidence pack for testing/development
     */
    createMockEvidence(task: OrchestratorTask): EvidencePack;
}
export declare const toolPlanner: ToolPlanner;
//# sourceMappingURL=toolplan.d.ts.map