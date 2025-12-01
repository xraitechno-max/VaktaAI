import { db } from '../../db.js';
import { and, eq, desc } from 'drizzle-orm';
import { NCERTRetriever, type RetrievedChunk, type SearchFilters } from './NCERTRetriever.js';
import { formulaBankService, type FormulaBankEntry } from './FormulaBankService.js';
import {
  topicPrerequisites,
  studentTopicMastery,
  misconceptionDatabase,
  type TopicPrerequisite,
  type StudentTopicMastery,
  type MisconceptionDatabase,
  type ClassLevel,
  type SubjectCode,
} from '@shared/schema';

export interface KnowledgeContext {
  subject: SubjectCode;
  classLevel: ClassLevel;
  topic: string;
  chapterNumber?: string;
  examTarget?: 'board' | 'jee' | 'neet' | 'jee_advanced';
  studentId?: string;
}

export interface RetrievedKnowledge {
  primaryContext: Array<{
    content: string;
    topic: string;
    source: string;
    similarity: number;
    citation: string;
  }>;
  formulas: Array<{
    latex: string;
    plainText: string;
    speakableText: string;
    applicableConditions: string[];
    variables: Array<{ symbol: string; name: string; unit: string }>;
    commonMistakes: Array<{ mistake: string; correction: string; reason: string }>;
  }>;
  prerequisites: Array<{
    topicId: string;
    topicName: string;
    importance: 'critical' | 'helpful' | 'optional';
    masteryStatus: 'solid' | 'partial' | 'missing';
    currentMastery?: number;
  }>;
  knowledgeGaps: Array<{
    conceptName: string;
    currentMastery: number;
    importance: number;
    suggestedReview: string;
  }>;
  possibleMisconceptions: Array<{
    misconceptionId: string;
    misconception: string;
    correctUnderstanding: string;
    triggerPatterns: string[];
    remediationStrategy: string;
    severity: 'critical' | 'moderate' | 'minor';
  }>;
  citationMetadata: {
    sources: string[];
    totalChunks: number;
    primarySource: string;
  };
}

export interface RetrievalResult {
  knowledge: RetrievedKnowledge;
  retrievalTime: number;
  fallbackUsed: boolean;
  cacheHit: boolean;
}

const FORMULA_SIMILARITY_THRESHOLD = 0.75;
const MAX_FORMULAS = 5;
const MAX_PREREQUISITES = 5;
const MAX_MISCONCEPTIONS = 3;

export class KnowledgeIntelligenceService {
  private ncertRetriever: NCERTRetriever;
  private retrievalCache: Map<string, { result: RetrievedKnowledge; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor() {
    this.ncertRetriever = new NCERTRetriever();
    this.retrievalCache = new Map();
  }

  async retrieveForQuery(
    query: string,
    context: KnowledgeContext
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, context);
    
    const cached = this.retrievalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[KnowledgeIntelligence] Cache hit for query:', query.substring(0, 50));
      return {
        knowledge: cached.result,
        retrievalTime: Date.now() - startTime,
        fallbackUsed: false,
        cacheHit: true,
      };
    }

    try {
      const [
        curriculumChunks,
        relevantFormulas,
        prerequisiteData,
        studentMastery,
        misconceptions,
      ] = await Promise.all([
        this.retrieveCurriculumContent(query, context),
        this.retrieveFormulas(context),
        this.retrievePrerequisites(context),
        context.studentId ? this.getStudentMastery(context.studentId, context) : [],
        this.retrievePossibleMisconceptions(context),
      ]);

      const knowledgeGaps = this.identifyKnowledgeGaps(
        prerequisiteData,
        studentMastery
      );

      const prerequisites = this.enrichPrerequisitesWithMastery(
        prerequisiteData,
        studentMastery
      );

      const knowledge: RetrievedKnowledge = {
        primaryContext: curriculumChunks.map(chunk => ({
          content: chunk.chunk.content,
          topic: chunk.chunk.sectionTitle || chunk.chunk.chapterTitle,
          source: `NCERT Class ${chunk.chunk.classLevel} ${chunk.chunk.subject}`,
          similarity: chunk.similarity,
          citation: chunk.citation,
        })),
        formulas: relevantFormulas.map(f => ({
          latex: f.latex,
          plainText: f.plainText,
          speakableText: f.speakableText,
          applicableConditions: f.applicableConditions || [],
          variables: f.variables,
          commonMistakes: f.commonMistakes || [],
        })),
        prerequisites,
        knowledgeGaps,
        possibleMisconceptions: misconceptions.map(m => ({
          misconceptionId: m.misconceptionId,
          misconception: m.misconception,
          correctUnderstanding: m.correctUnderstanding,
          triggerPatterns: m.triggerPatterns,
          remediationStrategy: m.remediationStrategy,
          severity: m.severity || 'moderate',
        })),
        citationMetadata: {
          sources: this.extractUniqueSources(curriculumChunks),
          totalChunks: curriculumChunks.length,
          primarySource: curriculumChunks[0]?.citation || 'NCERT',
        },
      };

      this.retrievalCache.set(cacheKey, { result: knowledge, timestamp: Date.now() });

      return {
        knowledge,
        retrievalTime: Date.now() - startTime,
        fallbackUsed: curriculumChunks.length === 0,
        cacheHit: false,
      };
    } catch (error) {
      console.error('[KnowledgeIntelligence] Retrieval error:', error);
      return {
        knowledge: this.getEmptyKnowledge(),
        retrievalTime: Date.now() - startTime,
        fallbackUsed: true,
        cacheHit: false,
      };
    }
  }

  private async retrieveCurriculumContent(
    query: string,
    context: KnowledgeContext
  ): Promise<RetrievedChunk[]> {
    const filters: SearchFilters = {
      classLevel: context.classLevel,
      subject: context.subject,
    };

    if (context.chapterNumber) {
      filters.chapterNumber = context.chapterNumber;
    }

    if (context.examTarget) {
      filters.minExamWeightage = context.examTarget === 'jee' || context.examTarget === 'neet' ? 3 : 1;
    }

    try {
      return await this.ncertRetriever.search(query, filters);
    } catch (error) {
      console.error('[KnowledgeIntelligence] Curriculum retrieval error:', error);
      return [];
    }
  }

  private async retrieveFormulas(context: KnowledgeContext): Promise<FormulaBankEntry[]> {
    try {
      const examTarget = this.mapExamTarget(context.examTarget);
      
      const formulas = await formulaBankService.getFormulasForTopic(
        context.subject,
        context.topic,
        {
          classLevel: context.classLevel,
          examTarget,
          limit: MAX_FORMULAS
        }
      );

      return formulas;
    } catch (error) {
      console.error('[KnowledgeIntelligence] Formula retrieval error:', error);
      return [];
    }
  }

  private mapExamTarget(
    target?: 'board' | 'jee' | 'neet' | 'jee_advanced'
  ): 'jee_main' | 'jee_advanced' | 'neet' | 'boards' {
    switch (target) {
      case 'jee':
        return 'jee_main';
      case 'jee_advanced':
        return 'jee_advanced';
      case 'neet':
        return 'neet';
      case 'board':
      default:
        return 'boards';
    }
  }

  private async retrievePrerequisites(context: KnowledgeContext): Promise<TopicPrerequisite[]> {
    try {
      const topicId = this.generateTopicId(context);
      
      const results = await db
        .select()
        .from(topicPrerequisites)
        .where(
          and(
            eq(topicPrerequisites.topicId, topicId),
            eq(topicPrerequisites.subject, context.subject)
          )
        )
        .limit(1);

      return results;
    } catch (error) {
      console.error('[KnowledgeIntelligence] Prerequisites retrieval error:', error);
      return [];
    }
  }

  private async getStudentMastery(
    studentId: string,
    context: KnowledgeContext
  ): Promise<StudentTopicMastery[]> {
    try {
      const results = await db
        .select()
        .from(studentTopicMastery)
        .where(eq(studentTopicMastery.userId, studentId))
        .limit(50);

      return results;
    } catch (error) {
      console.error('[KnowledgeIntelligence] Student mastery retrieval error:', error);
      return [];
    }
  }

  private async retrievePossibleMisconceptions(
    context: KnowledgeContext
  ): Promise<MisconceptionDatabase[]> {
    try {
      const results = await db
        .select()
        .from(misconceptionDatabase)
        .where(
          and(
            eq(misconceptionDatabase.subject, context.subject),
            eq(misconceptionDatabase.topic, context.topic)
          )
        )
        .limit(MAX_MISCONCEPTIONS);

      return results;
    } catch (error) {
      console.error('[KnowledgeIntelligence] Misconception retrieval error:', error);
      return [];
    }
  }

  private identifyKnowledgeGaps(
    prerequisites: TopicPrerequisite[],
    studentMastery: StudentTopicMastery[]
  ): RetrievedKnowledge['knowledgeGaps'] {
    if (prerequisites.length === 0) return [];

    const masteryMap = new Map(
      studentMastery.map(m => [m.topicId, m.masteryScore || 0])
    );

    const gaps: RetrievedKnowledge['knowledgeGaps'] = [];

    for (const prereq of prerequisites) {
      const prereqList = prereq.prerequisites || [];
      
      for (const p of prereqList) {
        const mastery = masteryMap.get(p.topicId) || 0;
        
        if (mastery < 0.6 && p.importance !== 'optional') {
          gaps.push({
            conceptName: p.topicName,
            currentMastery: mastery,
            importance: p.importance === 'critical' ? 10 : 5,
            suggestedReview: `Review ${p.topicName} before proceeding with current topic`,
          });
        }
      }
    }

    return gaps.sort((a, b) => b.importance - a.importance).slice(0, 5);
  }

  private enrichPrerequisitesWithMastery(
    prerequisites: TopicPrerequisite[],
    studentMastery: StudentTopicMastery[]
  ): RetrievedKnowledge['prerequisites'] {
    if (prerequisites.length === 0) return [];

    const masteryMap = new Map(
      studentMastery.map(m => [m.topicId, m.masteryScore || 0])
    );

    const enriched: RetrievedKnowledge['prerequisites'] = [];

    for (const prereq of prerequisites) {
      const prereqList = prereq.prerequisites || [];
      
      for (const p of prereqList) {
        const mastery = masteryMap.get(p.topicId) || 0;
        
        enriched.push({
          topicId: p.topicId,
          topicName: p.topicName,
          importance: p.importance,
          masteryStatus: mastery >= 0.8 ? 'solid' : mastery >= 0.5 ? 'partial' : 'missing',
          currentMastery: mastery,
        });
      }
    }

    return enriched.slice(0, MAX_PREREQUISITES);
  }

  private extractUniqueSources(chunks: RetrievedChunk[]): string[] {
    const sources = new Set<string>();
    
    for (const chunk of chunks) {
      sources.add(`NCERT Class ${chunk.chunk.classLevel} ${chunk.chunk.subject}`);
    }
    
    return Array.from(sources);
  }

  private generateCacheKey(query: string, context: KnowledgeContext): string {
    return `${context.subject}-${context.classLevel}-${context.topic}-${query.substring(0, 50)}`;
  }

  private generateTopicId(context: KnowledgeContext): string {
    return `${context.subject}_${context.classLevel}_${context.topic.replace(/\s+/g, '_').toLowerCase()}`;
  }

  private getEmptyKnowledge(): RetrievedKnowledge {
    return {
      primaryContext: [],
      formulas: [],
      prerequisites: [],
      knowledgeGaps: [],
      possibleMisconceptions: [],
      citationMetadata: {
        sources: [],
        totalChunks: 0,
        primarySource: '',
      },
    };
  }

  formatKnowledgeForPrompt(knowledge: RetrievedKnowledge): string {
    const sections: string[] = [];

    if (knowledge.primaryContext.length > 0) {
      sections.push('## AUTHORITATIVE KNOWLEDGE CONTEXT\n');
      sections.push('Use this verified information for your response. Do NOT hallucinate facts.\n');
      
      sections.push('### Primary Context (MUST use):');
      for (const ctx of knowledge.primaryContext.slice(0, 5)) {
        sections.push(`\n- Topic: ${ctx.topic}`);
        sections.push(`  Content: ${ctx.content.substring(0, 500)}...`);
        sections.push(`  Source: ${ctx.citation}`);
      }
    }

    if (knowledge.formulas.length > 0) {
      sections.push('\n\n### Relevant Formulas:');
      for (const f of knowledge.formulas) {
        sections.push(`\n- ${f.plainText}`);
        sections.push(`  Speak as: "${f.speakableText}"`);
        if (f.applicableConditions.length > 0) {
          sections.push(`  Conditions: ${f.applicableConditions.join('; ')}`);
        }
        if (f.commonMistakes.length > 0) {
          sections.push(`  Common mistakes to address: ${f.commonMistakes.map(m => m.mistake).join('; ')}`);
        }
      }
    }

    if (knowledge.prerequisites.filter(p => p.masteryStatus !== 'solid').length > 0) {
      sections.push('\n\n### Prerequisites student might need:');
      for (const p of knowledge.prerequisites.filter(pr => pr.masteryStatus !== 'solid')) {
        sections.push(`- ${p.topicName}: ${p.masteryStatus === 'missing' ? 'NOT mastered' : 'Partially understood'} (Importance: ${p.importance})`);
      }
    }

    if (knowledge.knowledgeGaps.length > 0) {
      sections.push('\n\n### Knowledge Gaps Detected:');
      for (const gap of knowledge.knowledgeGaps) {
        sections.push(`- ${gap.conceptName}: Mastery ${Math.round(gap.currentMastery * 100)}%`);
        sections.push(`  ${gap.suggestedReview}`);
      }
    }

    if (knowledge.possibleMisconceptions.length > 0) {
      sections.push('\n\n### Common Misconceptions to Watch For:');
      for (const m of knowledge.possibleMisconceptions) {
        sections.push(`- Misconception: "${m.misconception}"`);
        sections.push(`  Correct: ${m.correctUnderstanding}`);
        if (m.severity === 'critical') {
          sections.push(`  CRITICAL: Address this misconception if detected!`);
        }
      }
    }

    return sections.join('\n');
  }

  formatCitations(knowledge: RetrievedKnowledge): string[] {
    return knowledge.primaryContext.map(ctx => ctx.citation);
  }

  clearCache(): void {
    this.retrievalCache.clear();
    console.log('[KnowledgeIntelligence] Cache cleared');
  }
}

export const knowledgeIntelligenceService = new KnowledgeIntelligenceService();
