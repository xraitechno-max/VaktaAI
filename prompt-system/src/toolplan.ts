/**
 * Tool Planner for VaktaAI Dynamic Prompt System
 * Plans RAG retrieval and other tool usage
 */

import type { OrchestratorTask, EvidencePack, EvidenceChunk } from "./contracts.js";
import { logger } from "./utils/log.js";

// Mock RAG service interface (to be implemented by integrator)
export interface RAGService {
  retrieve(query: string, filters: any, topK: number): Promise<EvidenceChunk[]>;
}

export class ToolPlanner {
  private ragService: RAGService | null = null;

  /**
   * Set RAG service implementation
   */
  setRAGService(service: RAGService) {
    this.ragService = service;
  }

  /**
   * Plan and execute tool usage for task
   */
  async executePlan(task: OrchestratorTask): Promise<EvidencePack> {
    logger.debug("Executing tool plan", { mode: task.mode });

    // Determine if RAG is needed
    const needsRAG = this.shouldUseRAG(task);

    if (!needsRAG) {
      logger.debug("RAG not needed for this task");
      return this.createEmptyEvidencePack(task.user_msg);
    }

    // Execute RAG retrieval
    return await this.executeRAG(task);
  }

  /**
   * Determine if RAG should be used
   */
  private shouldUseRAG(task: OrchestratorTask): boolean {
    // RAG is needed for these modes
    const ragModes = ["explain", "docchat", "revise", "strategy", "plan"];

    if (!ragModes.includes(task.mode)) {
      return false;
    }

    // Check if documents are available
    const hasDocuments = task.context?.doc_ids && task.context.doc_ids.length > 0;

    return hasDocuments || task.mode === "docchat"; // docchat always needs RAG
  }

  /**
   * Execute RAG retrieval
   */
  private async executeRAG(task: OrchestratorTask): Promise<EvidencePack> {
    // If no RAG service configured, return mock data for testing
    if (!this.ragService) {
      logger.warn("No RAG service configured, returning empty evidence pack");
      return this.createEmptyEvidencePack(task.user_msg);
    }

    try {
      // Build retrieval filters from task
      const filters = this.buildFilters(task);

      // Retrieve chunks (top_k from policy = 6)
      const topK = 6;
      const chunks = await this.ragService.retrieve(task.user_msg, filters, topK);

      // Calculate average similarity
      const avgSimilarity =
        chunks.length > 0 ? chunks.reduce((sum, c) => sum + c.similarity_score, 0) / chunks.length : 0;

      // Determine if evidence is sufficient
      const hasSufficientEvidence = chunks.length >= 2 && avgSimilarity >= 0.5;

      logger.info("RAG retrieval complete", {
        chunks_retrieved: chunks.length,
        avg_similarity: avgSimilarity,
        sufficient: hasSufficientEvidence,
      });

      return {
        chunks,
        total_retrieved: chunks.length,
        retrieval_query: task.user_msg,
        filters_applied: filters,
        has_sufficient_evidence: hasSufficientEvidence,
        avg_similarity: avgSimilarity,
      };
    } catch (error) {
      logger.error("RAG retrieval failed", { error });
      return this.createEmptyEvidencePack(task.user_msg);
    }
  }

  /**
   * Build retrieval filters from task
   */
  private buildFilters(task: OrchestratorTask): any {
    const filters: any = {
      board: task.board,
      class: task.class,
      subject: task.subject,
    };

    // Add chapter filter if available
    if (task.context?.chapter) {
      filters.chapter = task.context.chapter;
    }

    // Add doc_ids filter if available
    if (task.context?.doc_ids && task.context.doc_ids.length > 0) {
      filters.doc_ids = task.context.doc_ids;
    }

    return filters;
  }

  /**
   * Create empty evidence pack
   */
  private createEmptyEvidencePack(query: string): EvidencePack {
    return {
      chunks: [],
      total_retrieved: 0,
      retrieval_query: query,
      has_sufficient_evidence: false,
      avg_similarity: 0,
    };
  }

  /**
   * Create mock evidence pack for testing/development
   */
  createMockEvidence(task: OrchestratorTask): EvidencePack {
    // Generate mock NCERT chunks for testing
    const mockChunks: EvidenceChunk[] = [
      {
        chunk_id: "mock_chunk_1",
        text: `This is a mock evidence chunk for ${task.subject} Class ${task.class}. In a real implementation, this would contain actual content from NCERT textbooks or other educational materials.`,
        citation: `NCERT:${task.subject.toLowerCase()}_${task.class}_ch1:1.1.1`,
        metadata: {
          doc_title: `NCERT ${task.subject} Class ${task.class}`,
          page: 10,
          chapter: "Chapter 1",
          board: task.board,
          class: task.class,
          subject: task.subject,
        },
        similarity_score: 0.85,
      },
      {
        chunk_id: "mock_chunk_2",
        text: `Another mock evidence chunk with relevant information about ${task.user_msg}. This demonstrates how multiple evidence sources would be retrieved and presented.`,
        citation: `NCERT:${task.subject.toLowerCase()}_${task.class}_ch1:1.2.1`,
        metadata: {
          doc_title: `NCERT ${task.subject} Class ${task.class}`,
          page: 12,
          chapter: "Chapter 1",
          board: task.board,
          class: task.class,
          subject: task.subject,
        },
        similarity_score: 0.78,
      },
    ];

    return {
      chunks: mockChunks,
      total_retrieved: 2,
      retrieval_query: task.user_msg,
      filters_applied: {
        board: task.board,
        class: task.class,
        subject: task.subject,
      },
      has_sufficient_evidence: true,
      avg_similarity: 0.815,
    };
  }
}

// Export singleton
export const toolPlanner = new ToolPlanner();
