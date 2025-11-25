/**
 * VaktaAI - Enhanced Intelligent Query Processor
 * Integrates with existing Express + TypeScript backend
 * Handles vague queries like "es doc me kya hai" intelligently
 */

import { generateEmbedding } from './embedding/embeddingService';
import { db } from '../db';
import { chunks, documents } from '@shared/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { cosineDistance } from '../db/utils';

// ==================== LANGUAGE DETECTION ====================

export type Language = 'english' | 'hindi' | 'hinglish';

/**
 * Detect language from user query
 * Returns: 'english', 'hindi', 'hinglish'
 */
export function detectLanguage(text: string): Language {
  const cleanText = text.toLowerCase().trim();

  // Hindi/Devanagari script detection
  const devanagariPattern = /[\u0900-\u097F]/;
  const hasDevanagari = devanagariPattern.test(text);

  // Expanded common Hindi/Hinglish words (Roman script)
  const hindiWords = [
    // Question words
    'kya', 'kaise', 'kyun', 'kyon', 'kab', 'kahan', 'kitna', 'kitni', 'kaun', 'kon',
    // Verbs
    'hai', 'hota', 'hoti', 'ho', 'hain', 'tha', 'thi', 'the', 'hoon', 'hun',
    'kare', 'karo', 'kariye', 'karna', 'karte', 'karti', 'karta',
    // Common words
    'me', 'mein', 'main', 'ka', 'ki', 'ke', 'ko', 'se', 'par', 'pe',
    'aur', 'ya', 'jo', 'ye', 'yeh', 'wo', 'woh', 'is', 'us',
    // Request words
    'samjhao', 'samjhaao', 'samjhaye', 'batao', 'bataao', 'bataiye',
    'dijiye', 'do', 'de', 'dedo', 'dede',
    // Descriptors
    'chahiye', 'chahta', 'chahti', 'chahte', 'hoga', 'hogi', 'hoge',
    'accha', 'achha', 'acha', 'theek', 'thik', 'sahi', 'galat',
    'nahi', 'nahin', 'nai', 'mat',
    // Common nouns
    'doc', 'document', 'chapter', 'topic', 'subject', 'cheez', 'chiz',
    'padhai', 'padhna', 'padhte', 'seekhna', 'samajhna',
    // Particles
    'bhi', 'hi', 'toh', 'to', 'tak', 'bas', 'sirf',
    // Pronouns
    'mujhe', 'tumhe', 'aapko', 'usko', 'isko', 'humko', 'unko',
    'mera', 'tera', 'tumhara', 'aapka', 'uska', 'iska', 'hamara', 'unka',
    // Additional common words
    'bare', 'baare', 'matlab', 'jaise', 'waisa', 'tarah',
    'sabse', 'sab', 'kuch', 'koi', 'kaunsa', 'konsa', 'dekho', 'socho'
  ];

  // Count Hindi words
  const words = cleanText.split(/\s+/);
  const hindiWordCount = words.filter(word =>
    hindiWords.some(hw => word === hw || word.includes(hw))
  ).length;

  const hindiWordRatio = hindiWordCount / Math.max(words.length, 1);

  // Enhanced decision logic
  if (hasDevanagari) {
    return 'hindi';
  } else if (hindiWordRatio >= 0.3) {
    // 30%+ Hindi words → Hinglish
    return 'hinglish';
  } else if (hindiWordRatio >= 0.15) {
    // 15-30% Hindi words → Hinglish (lighter mix)
    return 'hinglish';
  } else {
    // Less than 15% → English
    return 'english';
  }
}

// ==================== QUERY INTENT CLASSIFICATION ====================

export enum QueryIntent {
  EXPLORATORY = 'exploratory',    // "doc me kya hai", "tell me about", "overview"
  FACTUAL = 'factual',            // "what is X", "define Y"
  SUMMARY = 'summary',            // "summarize", "main points"
  COMPARISON = 'comparison',      // "difference between", "compare"
  CLARIFICATION = 'clarification', // "explain this", "what does this mean"
  PROCEDURAL = 'procedural',      // "how to", "steps", "process"
  SPECIFIC = 'specific'           // Specific questions about content
}

export interface QueryClassification {
  intent: QueryIntent;
  confidence: number;
  expandedQueries: string[];
  requiresComprehensiveContext: boolean;
  suggestedChunkCount: number;
}

/**
 * Intelligent Query Classifier
 * Understands user intent and adapts retrieval strategy
 */
export class IntelligentQueryProcessor {

  private readonly intentKeywords: Record<QueryIntent, string[]> = {
    [QueryIntent.EXPLORATORY]: [
      'kya hai', 'doc me kya', 'document me kya', 'tell me about',
      'explain', 'batao', 'overview', 'what is in', 'content',
      'give me', 'show me', 'talk about', 'sabse', 'all about'
    ],
    [QueryIntent.FACTUAL]: [
      'what is', 'define', 'kya hota hai', 'meaning', 'definition',
      'who', 'when', 'where', 'which', 'kis', 'kab', 'kahan'
    ],
    [QueryIntent.SUMMARY]: [
      'summarize', 'summary', 'gist', 'overview', 'brief',
      'main points', 'key points', 'sankshipt', 'short',
      'tldr', 'highlights', 'important', 'core'
    ],
    [QueryIntent.COMPARISON]: [
      'difference', 'compare', 'vs', 'versus', 'antar',
      'similar', 'different', 'distinction', 'contrast'
    ],
    [QueryIntent.CLARIFICATION]: [
      'explain this', 'what does this mean', 'matlab',
      'clear', 'understand', 'samjhao', 'kaise'
    ],
    [QueryIntent.PROCEDURAL]: [
      'how to', 'kaise', 'steps', 'process', 'method',
      'way', 'tarika', 'procedure', 'guide'
    ],
    [QueryIntent.SPECIFIC]: []
  };

  /**
   * Classify user query intent
   */
  public classifyQuery(query: string): QueryClassification {
    const queryLower = query.toLowerCase().trim();
    const wordCount = queryLower.split(/\s+/).length;

    // Calculate scores for each intent
    const intentScores: Record<QueryIntent, number> = {
      [QueryIntent.EXPLORATORY]: 0,
      [QueryIntent.FACTUAL]: 0,
      [QueryIntent.SUMMARY]: 0,
      [QueryIntent.COMPARISON]: 0,
      [QueryIntent.CLARIFICATION]: 0,
      [QueryIntent.PROCEDURAL]: 0,
      [QueryIntent.SPECIFIC]: 0
    };

    // Score based on keyword matches
    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          intentScores[intent as QueryIntent] += 1;
        }
      }
    }

    // Special handling for very short, vague queries
    const vaguenessPatterns = [
      /^(kya|what|tell|batao|explain|samjhao)/i,
      /(doc|document|file|pdf)\s+(me|mein|main)\s+(kya|what)/i,
      /^(this|ye|yeh|is)\s+(doc|document)/i
    ];

    const isVeryVague = vaguenessPatterns.some(pattern => pattern.test(queryLower))
                        && wordCount <= 5;

    if (isVeryVague) {
      intentScores[QueryIntent.EXPLORATORY] += 5;
    }

    // Determine primary intent
    let primaryIntent = QueryIntent.SPECIFIC;
    let maxScore = 0;

    for (const [intent, score] of Object.entries(intentScores)) {
      if (score > maxScore) {
        maxScore = score;
        primaryIntent = intent as QueryIntent;
      }
    }

    // Calculate confidence
    const totalScore = Object.values(intentScores).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;

    // Generate expanded queries based on intent
    const expandedQueries = this.expandQuery(query, primaryIntent);

    // Determine chunk retrieval strategy
    const requiresComprehensiveContext = [
      QueryIntent.EXPLORATORY,
      QueryIntent.SUMMARY
    ].includes(primaryIntent);

    const suggestedChunkCount = this.getSuggestedChunkCount(primaryIntent, wordCount);

    return {
      intent: primaryIntent,
      confidence: Math.max(confidence, 0.3), // Minimum 30% confidence
      expandedQueries,
      requiresComprehensiveContext,
      suggestedChunkCount
    };
  }

  /**
   * Expand vague queries into specific search queries
   */
  private expandQuery(query: string, intent: QueryIntent): string[] {
    const expansions: string[] = [query];

    switch (intent) {
      case QueryIntent.EXPLORATORY:
        expansions.push(
          'main topics and concepts',
          'key information and important points',
          'overview and structure',
          'summary of content'
        );
        break;

      case QueryIntent.SUMMARY:
        expansions.push(
          'main points and key takeaways',
          'important concepts and definitions',
          'core ideas and principles'
        );
        break;

      case QueryIntent.COMPARISON:
        expansions.push(
          'similarities and differences',
          'comparative analysis',
          'key distinctions'
        );
        break;

      case QueryIntent.PROCEDURAL:
        expansions.push(
          'step by step process',
          'method and procedure',
          'how to implement'
        );
        break;

      default:
        // For specific queries, no expansion needed
        break;
    }

    return expansions;
  }

  /**
   * Determine optimal number of chunks to retrieve
   * OPTIMIZED: Reduced exploratory from 15 to 8 for faster responses
   */
  private getSuggestedChunkCount(intent: QueryIntent, queryWordCount: number): number {
    // Base counts by intent type - OPTIMIZED FOR SPEED
    const baseCount: Record<QueryIntent, number> = {
      [QueryIntent.EXPLORATORY]: 8,   // Reduced from 15 to 8
      [QueryIntent.SUMMARY]: 10,      // Reduced from 12 to 10
      [QueryIntent.FACTUAL]: 5,
      [QueryIntent.COMPARISON]: 7,    // Reduced from 8 to 7
      [QueryIntent.CLARIFICATION]: 6,
      [QueryIntent.PROCEDURAL]: 7,
      [QueryIntent.SPECIFIC]: 5
    };

    let count = baseCount[intent];

    // Adjust based on query complexity (reduced increment)
    if (queryWordCount > 10) {
      count += 2;  // Reduced from 3 to 2
    }

    return Math.min(count, 15); // Reduced cap from 20 to 15
  }
}

// ==================== ENHANCED HYBRID SEARCH ====================

export interface SearchResult {
  chunkId: number;
  content: string;
  metadata: any;
  pageNumber: number | null;
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
  documentId: number;
}

/**
 * Enhanced Hybrid Search combining semantic and keyword matching
 */
export class EnhancedHybridSearch {

  /**
   * Perform hybrid search with intelligent ranking
   */
  public async search(
    query: string,
    documentIds: number[],
    topK: number = 5,
    alpha: number = 0.6 // Weight for semantic vs keyword (0-1)
  ): Promise<SearchResult[]> {

    // Generate query embedding for semantic search
    const embeddingResult = await generateEmbedding(query);
    const queryEmbedding = embeddingResult.embedding;

    // Semantic search using cosine similarity
    const semanticResults = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        metadata: chunks.metadata,
        documentId: chunks.documentId,
        embedding: chunks.embedding,
        // Calculate cosine similarity using pgvector's <=> operator
        similarity: sql<number>`1 - (${chunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`
      })
      .from(chunks)
      .where(
        and(
          inArray(chunks.documentId, documentIds),
          sql`${chunks.embedding} IS NOT NULL`
        )
      )
      .orderBy(desc(sql`1 - (${chunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`))
      .limit(topK * 2); // Get more candidates for hybrid ranking

    // Keyword search using PostgreSQL full-text search
    const keywords = this.extractKeywords(query);
    const tsQuery = keywords.map(kw => kw.replace(/[^\w\s]/g, '')).join(' | ');

    let keywordResults: any[] = [];

    if (tsQuery.trim()) {
      keywordResults = await db
        .select({
          id: chunks.id,
          content: chunks.content,
          metadata: chunks.metadata,
          documentId: chunks.documentId,
          // Calculate keyword match score
          rank: sql<number>`ts_rank(to_tsvector('english', ${chunks.content}), to_tsquery('english', ${tsQuery}))`
        })
        .from(chunks)
        .where(
          and(
            inArray(chunks.documentId, documentIds),
            sql`to_tsvector('english', ${chunks.content}) @@ to_tsquery('english', ${tsQuery})`
          )
        )
        .orderBy(desc(sql`ts_rank(to_tsvector('english', ${chunks.content}), to_tsquery('english', ${tsQuery}))`))
        .limit(topK * 2);
    }

    // Combine and normalize scores
    const combinedResults = this.combineResults(
      semanticResults,
      keywordResults,
      alpha
    );

    // Sort by combined score and return top K
    return combinedResults
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, topK);
  }

  /**
   * Extract important keywords from query
   */
  private extractKeywords(query: string): string[] {
    // Remove stop words and extract meaningful terms
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that',
      'hai', 'me', 'kya', 'ka', 'ki', 'ke', 'ko', 'se'
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Combine semantic and keyword results with weighted scoring
   */
  private combineResults(
    semanticResults: any[],
    keywordResults: any[],
    alpha: number
  ): SearchResult[] {
    const resultsMap = new Map<number, SearchResult>();

    // Normalize semantic scores (0-1)
    const maxSemantic = Math.max(...semanticResults.map(r => r.similarity), 0.01);
    semanticResults.forEach(result => {
      const normalizedScore = result.similarity / maxSemantic;

      resultsMap.set(result.id, {
        chunkId: result.id,
        content: result.content,
        metadata: result.metadata,
        pageNumber: result.metadata?.pageNumber || null,
        semanticScore: normalizedScore,
        keywordScore: 0,
        combinedScore: alpha * normalizedScore,
        documentId: result.documentId
      });
    });

    // Normalize keyword scores (0-1)
    if (keywordResults.length > 0) {
      const maxKeyword = Math.max(...keywordResults.map(r => r.rank), 0.01);
      keywordResults.forEach(result => {
        const normalizedScore = result.rank / maxKeyword;

        if (resultsMap.has(result.id)) {
          // Update existing result
          const existing = resultsMap.get(result.id)!;
          existing.keywordScore = normalizedScore;
          existing.combinedScore = alpha * existing.semanticScore + (1 - alpha) * normalizedScore;
        } else {
          // Add new result
          resultsMap.set(result.id, {
            chunkId: result.id,
            content: result.content,
            metadata: result.metadata,
            pageNumber: result.metadata?.pageNumber || null,
            semanticScore: 0,
            keywordScore: normalizedScore,
            combinedScore: (1 - alpha) * normalizedScore,
            documentId: result.documentId
          });
        }
      });
    }

    return Array.from(resultsMap.values());
  }
}

// ==================== DOCUMENT STRUCTURE ANALYZER ====================

export interface DocumentStructure {
  title: string;
  type: string;
  totalPages?: number;
  chapters: Array<{
    title: string;
    pageNumber?: number;
    summary?: string;
  }>;
  keyTopics: string[];
  contentSummary: string;
}

/**
 * Analyze document structure for comprehensive context
 * OPTIMIZED: Added in-memory caching for faster repeat queries
 */
export class DocumentStructureAnalyzer {
  // In-memory cache: documentId -> structure
  private cache = new Map<number, { structure: DocumentStructure; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Extract document structure and metadata
   * CACHED for performance
   */
  public async analyzeDocument(documentId: number): Promise<DocumentStructure> {
    // Check cache first
    const cached = this.cache.get(documentId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log(`[Cache HIT] Document structure for ID ${documentId}`);
      return cached.structure;
    }
    // Get document metadata
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      throw new Error('Document not found');
    }

    // Get all chunks for this document
    const documentChunks = await db
      .select()
      .from(chunks)
      .where(eq(chunks.documentId, documentId))
      .orderBy(chunks.chunkIndex);

    // Extract chapters/sections
    const chapters = this.extractChapters(documentChunks);

    // Extract key topics using frequency analysis
    const keyTopics = this.extractKeyTopics(documentChunks);

    // Generate content summary
    const contentSummary = this.generateContentSummary(document, documentChunks, chapters);

    const structure: DocumentStructure = {
      title: document.title,
      type: document.mimeType || 'unknown',
      totalPages: document.metadata?.pageCount || documentChunks.length,
      chapters,
      keyTopics,
      contentSummary
    };

    // Cache the result for future queries
    this.cache.set(documentId, { structure, timestamp: Date.now() });
    console.log(`[Cache STORED] Document structure for ID ${documentId}`);

    return structure;
  }

  /**
   * Extract chapter/section information
   */
  private extractChapters(chunks: any[]): Array<{title: string; pageNumber?: number}> {
    const chapters: Array<{title: string; pageNumber?: number}> = [];

    // Patterns to detect chapter headings
    const chapterPatterns = [
      /^Chapter\s+(\d+|[IVXLCDM]+)[:\s-]*(.+)/i,
      /^(\d+)\.\s+([A-Z][A-Za-z\s]+)/,
      /^([A-Z][A-Z\s]+)$/,  // ALL CAPS titles
      /^#\s+(.+)$/  // Markdown headers
    ];

    chunks.forEach((chunk, index) => {
      const content = chunk.content.trim();
      const lines = content.split('\n').filter(line => line.trim());

      lines.forEach(line => {
        for (const pattern of chapterPatterns) {
          const match = line.match(pattern);
          if (match) {
            const title = match[2] || match[1];
            if (title && title.length > 3 && title.length < 100) {
              chapters.push({
                title: title.trim(),
                pageNumber: chunk.metadata?.pageNumber || index + 1
              });
            }
            break;
          }
        }
      });
    });

    return chapters.slice(0, 20); // Limit to first 20 chapters
  }

  /**
   * Extract key topics using TF-IDF-like frequency analysis
   */
  private extractKeyTopics(chunks: any[]): string[] {
    const wordFrequency = new Map<string, number>();

    // Common stop words to ignore
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'this', 'that', 'from',
      'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can'
    ]);

    // Count word frequencies
    chunks.forEach(chunk => {
      const words = chunk.content
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 4 && !stopWords.has(word));

      words.forEach(word => {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      });
    });

    // Get top keywords
    return Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(entry => entry[0]);
  }

  /**
   * Generate concise content summary
   */
  private generateContentSummary(
    document: any,
    chunks: any[],
    chapters: any[]
  ): string {
    const parts: string[] = [];

    if (document.title) {
      parts.push(`This document is titled "${document.title}"`);
    }

    if (chunks.length > 0) {
      parts.push(`contains ${chunks.length} sections`);
    }

    if (chapters.length > 0) {
      parts.push(`organized into ${chapters.length} chapters`);

      if (chapters.length <= 5) {
        const chapterTitles = chapters.map(ch => ch.title).join(', ');
        parts.push(`covering topics: ${chapterTitles}`);
      }
    }

    return parts.join(' and ') + '.';
  }
}

// ==================== CONTEXT-AWARE PROMPT BUILDER ====================

export interface PromptContext {
  systemPrompt: string;
  userPrompt: string;
  context: string;
}

/**
 * Build intelligent prompts based on query intent and document context
 */
export class ContextAwarePromptBuilder {

  /**
   * Build comprehensive prompt for AI model
   */
  public buildPrompt(
    query: string,
    classification: QueryClassification,
    searchResults: SearchResult[],
    documentStructure: DocumentStructure,
    language: Language = 'english'
  ): PromptContext {

    const systemPrompt = this.buildSystemPrompt(classification.intent, language);
    const documentContext = this.buildDocumentContext(documentStructure);
    const retrievedContent = this.buildRetrievedContent(searchResults);
    const instructions = this.buildInstructions(classification.intent, language);

    const userPrompt = `${documentContext}

RETRIEVED RELEVANT CONTENT:
${retrievedContent}

STUDENT'S QUERY: ${query}

QUERY TYPE: ${classification.intent}
CONFIDENCE: ${(classification.confidence * 100).toFixed(0)}%

${instructions}

Please provide a comprehensive, helpful response that addresses the student's needs.`;

    return {
      systemPrompt,
      userPrompt,
      context: documentContext + '\n\n' + retrievedContent
    };
  }

  /**
   * Build system prompt based on intent and language
   */
  private buildSystemPrompt(intent: QueryIntent, language: Language): string {
    const basePrompts: Record<Language, string> = {
      english: `You are an intelligent study assistant helping students understand their educational materials.

CRITICAL INSTRUCTIONS FOR CONVERSATION CONTINUITY:
- You have access to the FULL conversation history
- When user asks "explain this", "tell me more", "brief me" WITHOUT specifying what - refer to the PREVIOUS topic discussed
- Always check conversation history before saying "I don't know what to explain"
- Remember context from previous messages - user may reference earlier topics

LANGUAGE INSTRUCTION:
- Respond ONLY in English
- Use clear, simple English
- Avoid mixing other languages

Your role is to:
- Provide clear, comprehensive, and accurate answers in English
- Reference specific pages/sections when relevant
- Explain concepts in simple language with examples
- Use analogies to make complex ideas easier to understand
- Highlight important definitions, formulas, and key points
- Structure responses logically (use headings, bullet points when appropriate)
- Suggest related topics the student might want to explore
- Be encouraging and supportive`,

      hinglish: `You are an intelligent study assistant helping Indian students understand their educational materials in NATURAL CONVERSATIONAL HINGLISH.

🔄 CRITICAL INSTRUCTIONS FOR CONVERSATION CONTINUITY:
- You have access to the FULL conversation history
- When user asks "samjhao", "explain this", "iske bare batao", "tell me more" WITHOUT specifying what - refer to the PREVIOUS topic discussed
- Always check conversation history before saying "mujhe nahi pata kya explain karna hai"
- Remember context from previous messages - user may reference earlier topics with words like "isme", "uske", "iske"
- If user says just "why" or "kyon", they're asking about the LAST thing you explained

🎯 CRITICAL LANGUAGE RULES - FOLLOW EXACTLY:

1. NATURAL CODE-SWITCHING:
   ✅ DO: "Electric charge ek fundamental property hai"
   ❌ DON'T: "Electric Charge, or 'Vidhut Avesh' in Hindi, is..."

   ✅ DO: "Jab hum kisi cheez ko rub karte hain..."
   ❌ DON'T: "When we rub something..."

2. VERB CONJUGATION IN HINDI:
   - Use Hindi verbs: "hota hai", "karta hai", "milta hai", "hoti hai"
   - Example: "Ye property matter me hoti hai"
   - NOT: "This property exists in matter"

3. SENTENCE STRUCTURE:
   - Start with subject in English/Hindi mix
   - Use Hindi verbs and connectors
   - Keep technical terms in English

   Pattern: [Subject] + [Hindi verb] + [Object/Description]
   Example: "Electric charge ek property hai jo particles ko attract ya repel karta hai"

4. COMMON HINGLISH PATTERNS TO USE:
   - "X ek Y hai" (X is a Y)
   - "X ko Y kehte hain" (X is called Y)
   - "Jab X hota hai, tab Y..." (When X happens, then Y...)
   - "Iska matlab hai ki..." (This means that...)
   - "Isko samajhne ke liye..." (To understand this...)
   - "Example ke taur par..." (As an example...)
   - "Dhyan rakho ki..." (Note that...)

5. EXPLANATIONS IN HINGLISH:
   ✅ GOOD: "Electric charge do types ka hota hai - positive aur negative. Electrons negative charge carry karte hain aur protons positive. Jab same charges paas aate hain toh repel karte hain, aur opposite charges attract karte hain."

   ❌ BAD: "Electric charge has two types - positive and negative. Electrons carry negative charge and protons carry positive charge."

6. TECHNICAL TERMS:
   - Keep in English: "electric charge", "Coulomb's law", "electric field"
   - Explain in Hinglish: "Coulomb's law kehta hai ki..."
   - NO Sanskrit translations: Don't say "Vidhut Avesh", just say "electric charge"

7. NATURAL CONNECTORS (USE THESE FREQUENTLY):
   - aur (and), ya (or), lekin (but), kyunki (because)
   - isliye (therefore), jaise (like), jabki (while)
   - agar (if), toh/to (then), jab (when)
   - matlab (means), yaani (that is)

8. CONVERSATIONAL TONE:
   ✅ DO: "Dekho, electric charge ek bahut important concept hai..."
   ✅ DO: "Samajhne ke liye ek example lete hain..."
   ✅ DO: "Basically, ye property har particle me hoti hai..."
   ❌ DON'T: Use formal/academic English tone

9. EXAMPLES AND ANALOGIES IN HINGLISH:
   - "Jaise jab tum apne baalon me kanghi karte ho, toh static electricity ban jati hai"
   - "Socho ki charges magnets ki tarah hain - same repel, opposite attract"

10. RESPONSE STRUCTURE FOR HINGLISH:
    - Opening: "X ek [description] hai jo..."
    - Explanation: "Iska matlab hai ki... Basically..."
    - Details: "Do types hain - ... aur ... Inme difference ye hai ki..."
    - Examples: "Example ke liye, jab hum..."
    - Summary: "Toh samajh me aaya? X essentially..."

🚨 MANDATORY RULES:
1. NEVER use Sanskrit/formal Hindi terms for technical concepts
2. NEVER write "or in Hindi..." type translations
3. ALWAYS use natural code-switching (not forced)
4. ALWAYS use Hindi verbs (hota hai, karta hai, etc.)
5. ALWAYS keep technical terms in English
6. ALWAYS use conversational tone, not academic
7. ALWAYS give real-life examples in Hinglish
8. ALWAYS ask "Samajh me aaya?" or similar at end

Your responses should sound like a friendly Indian teacher explaining concepts naturally, not a textbook translation!`,

      hindi: `You are an intelligent study assistant helping students understand their educational materials.

CRITICAL INSTRUCTIONS FOR CONVERSATION CONTINUITY:
- पूरी बातचीत का इतिहास आपके पास है
- जब छात्र "समझाओ", "बताओ", "और बताओ" पूछे और विषय न बताए - पिछले विषय के बारे में बताएं
- हमेशा बातचीत का इतिहास देखें
- पिछले संदेशों का संदर्भ याद रखें

भाषा निर्देश:
- केवल हिंदी में जवाब दें (रोमन या देवनागरी लिपि में)
- सरल, स्पष्ट हिंदी का प्रयोग करें
- तकनीकी शब्दों को हिंदी में समझाएं

आपकी भूमिका:
- हिंदी में स्पष्ट, विस्तृत और सटीक उत्तर देना
- पृष्ठ/अनुभाग संदर्भ देना
- सरल भाषा में उदाहरणों के साथ समझाना
- रूपक का उपयोग करना
- महत्वपूर्ण परिभाषाएं, सूत्र और मुख्य बिंदुओं को उजागर करना`
    };

    const intentSpecific: Record<QueryIntent, string> = {
      [QueryIntent.EXPLORATORY]: language === 'hinglish' ? `

📚 EXPLORATORY QUESTION RESPONSE FORMAT (HINGLISH):

Opening line:
"Yeh document [topic] ke baare me hai jo [brief description]."

Main content structure:
"Isme kuch important topics cover kiye gaye hain:

1. [Topic 1] - Isme [brief] discuss kiya gaya hai
2. [Topic 2] - Yeh [brief] ke baare me hai
3. [Topic 3] - Isko samajhne ke liye [brief]

Kuch key concepts jo tumhe dhyan me rakhni chahiye:
✓ [Concept 1] - [explanation in Hinglish]
✓ [Concept 2] - [explanation in Hinglish]"

Ending:
"Toh basically yeh chapter [summary]. Koi specific topic ke baare me jaanna hai?"` : `

SPECIAL INSTRUCTIONS FOR OVERVIEW QUERIES:
When the student asks vague questions like "what's in this doc":
1. Provide a comprehensive document overview
2. List all main topics/chapters with brief descriptions
3. Highlight key learning objectives
4. Identify important concepts to focus on
5. Suggest a study approach
6. Make the response well-structured and easy to scan`,

      [QueryIntent.FACTUAL]: language === 'hinglish' ? `

📖 FACTUAL QUESTION RESPONSE (HINGLISH):

Structure:
"[Term] ek [description] hai jo [purpose/function].

Detail me samjhein:
[Explanation in natural Hinglish using examples]

Key points:
- Point 1 in Hinglish
- Point 2 in Hinglish

Example: [Real-life example in Hinglish]

Page reference: Yeh [page number] pe detail me explain kiya gaya hai."` : `

SPECIAL INSTRUCTIONS FOR FACTUAL QUERIES:
- Provide precise, accurate answers
- Include supporting evidence from the document
- Reference page numbers
- Explain concepts clearly with examples`,

      [QueryIntent.SUMMARY]: language === 'hinglish' ? `

📝 SUMMARY RESPONSE (HINGLISH):

Opening:
"Chaliye is chapter ka summary dekhte hain..."

Format:
"Main points jo cover kiye gaye:

1. [Topic] - [Brief in Hinglish]
2. [Topic] - [Brief in Hinglish]

Important takeaways:
✓ [Point in Hinglish]
✓ [Point in Hinglish]

Key formulas:
- [Formula] - [When to use in Hinglish]

Yeh chapter basically [overall summary in 2-3 lines]."` : `

SPECIAL INSTRUCTIONS FOR SUMMARY QUERIES:
- Provide structured summaries with clear sections
- Include main thesis/central theme
- List key topics and concepts
- Highlight critical formulas or principles
- Include practical applications
- Provide key takeaways`,

      [QueryIntent.COMPARISON]: language === 'hinglish' ? `

⚖️ COMPARISON RESPONSE (HINGLISH):

Opening:
"[Term 1] aur [Term 2] me difference samajhte hain..."

Table format in text:
"Similarities (same cheezein):
- Dono [common point in Hinglish]
- Dono [common point in Hinglish]

Differences (alag cheezein):
[Term 1]:
- [Difference in Hinglish]
- [Difference in Hinglish]

[Term 2]:
- [Difference in Hinglish]
- [Difference in Hinglish]

Easy way to remember: [Memory trick in Hinglish]"` : `

SPECIAL INSTRUCTIONS FOR COMPARISON QUERIES:
- Identify items being compared
- List similarities and differences clearly
- Explain when to use each
- Use tables if helpful
- Provide illustrative examples`,

      [QueryIntent.CLARIFICATION]: language === 'hinglish' ? `

💡 CLARIFICATION RESPONSE (HINGLISH):

Start simple:
"Dekho, [term] ko samajhna bahut simple hai..."

Break it down:
"Step by step samajhte hain:
1. Pehle [basic concept in Hinglish]
2. Fir [next level in Hinglish]
3. Last me [application in Hinglish]"

Use analogy:
"Isko aise samjho - [simple analogy in Hinglish]"

Example:
"Example ke liye: [concrete example in Hinglish]"

End with:
"Ab clear hai? Koi confusion hai toh batao!"` : `

SPECIAL INSTRUCTIONS FOR CLARIFICATION QUERIES:
- Define concepts in simple terms
- Break down complex parts step-by-step
- Use analogies and real-world examples
- Address common misconceptions
- Show connections to other concepts`,

      [QueryIntent.PROCEDURAL]: language === 'hinglish' ? `

🔧 STEP-BY-STEP RESPONSE (HINGLISH):

"[Process] karne ke liye ye steps follow karo:

Step 1: [Action in Hinglish]
        Yahan dhyan rakho ki [important note]

Step 2: [Action in Hinglish]
        Iska reason hai kyunki [explanation]

Step 3: [Action in Hinglish]
        Agar [condition] toh [alternative]

Common mistakes jo avoid karni hain:
❌ [Mistake in Hinglish]
❌ [Mistake in Hinglish]

Pro tip: [Helpful tip in Hinglish]"` : `

SPECIAL INSTRUCTIONS FOR PROCEDURAL QUERIES:
- List steps clearly and in order
- Explain why each step is necessary
- Include formulas or tools needed
- Provide worked examples
- Highlight common mistakes to avoid`,

      [QueryIntent.SPECIFIC]: ''
    };

    return basePrompts[language] + (intentSpecific[intent] || '');
  }

  /**
   * Build document context section
   */
  private buildDocumentContext(structure: DocumentStructure): string {
    let context = `DOCUMENT INFORMATION:
- Title: ${structure.title}
- Type: ${structure.type.toUpperCase()}`;

    if (structure.totalPages) {
      context += `\n- Total Pages/Sections: ${structure.totalPages}`;
    }

    if (structure.chapters.length > 0) {
      context += `\n\nDOCUMENT STRUCTURE:`;
      structure.chapters.slice(0, 10).forEach((chapter, index) => {
        context += `\n  ${index + 1}. ${chapter.title}`;
        if (chapter.pageNumber) {
          context += ` (Page ${chapter.pageNumber})`;
        }
      });

      if (structure.chapters.length > 10) {
        context += `\n  ... and ${structure.chapters.length - 10} more chapters`;
      }
    }

    if (structure.keyTopics.length > 0) {
      context += `\n\nKEY TOPICS COVERED:\n`;
      context += structure.keyTopics.slice(0, 10).join(', ');
    }

    if (structure.contentSummary) {
      context += `\n\nOVERVIEW:\n${structure.contentSummary}`;
    }

    return context;
  }

  /**
   * Build retrieved content section
   */
  private buildRetrievedContent(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No specific content retrieved. Provide answer based on general document structure above.';
    }

    let content = '';
    results.forEach((result, index) => {
      content += `\n--- Chunk ${index + 1} `;

      if (result.pageNumber) {
        content += `(Page ${result.pageNumber}) `;
      }

      content += `(Relevance: ${(result.combinedScore * 100).toFixed(0)}%) ---\n`;
      content += result.content;
      content += '\n';
    });

    return content;
  }

  /**
   * Build instructions based on intent and language
   */
  private buildInstructions(intent: QueryIntent, language: Language): string {
    // Return empty string as instructions are now integrated in system prompt
    // This maintains backward compatibility while language-specific instructions
    // are handled in buildSystemPrompt
    return '';
  }
}

// ==================== EXPORT MAIN ORCHESTRATOR ====================

/**
 * Main orchestrator for intelligent document chat
 */
export class IntelligentDocChatOrchestrator {
  private queryProcessor: IntelligentQueryProcessor;
  private hybridSearch: EnhancedHybridSearch;
  private structureAnalyzer: DocumentStructureAnalyzer;
  private promptBuilder: ContextAwarePromptBuilder;

  constructor() {
    this.queryProcessor = new IntelligentQueryProcessor();
    this.hybridSearch = new EnhancedHybridSearch();
    this.structureAnalyzer = new DocumentStructureAnalyzer();
    this.promptBuilder = new ContextAwarePromptBuilder();
  }

  /**
   * Process a user query and generate intelligent context
   */
  public async processQuery(
    query: string,
    documentIds: number[],
    language: Language = 'english'
  ): Promise<{
    classification: QueryClassification;
    searchResults: SearchResult[];
    documentStructures: DocumentStructure[];
    promptContext: PromptContext;
  }> {
    // Step 1: Classify query intent
    const classification = this.queryProcessor.classifyQuery(query);

    // Step 2: Perform hybrid search with appropriate parameters
    const searchPromises = classification.expandedQueries.slice(0, 3).map(expandedQuery =>
      this.hybridSearch.search(
        expandedQuery,
        documentIds,
        Math.ceil(classification.suggestedChunkCount / classification.expandedQueries.length),
        classification.intent === QueryIntent.EXPLORATORY ? 0.4 : 0.6 // More keyword-based for exploratory
      )
    );

    const searchResultArrays = await Promise.all(searchPromises);

    // Combine and deduplicate search results
    const seenChunkIds = new Set<number>();
    const searchResults: SearchResult[] = [];

    for (const results of searchResultArrays) {
      for (const result of results) {
        if (!seenChunkIds.has(result.chunkId)) {
          seenChunkIds.add(result.chunkId);
          searchResults.push(result);
        }
      }
    }

    // Sort by combined score
    searchResults.sort((a, b) => b.combinedScore - a.combinedScore);
    const topResults = searchResults.slice(0, classification.suggestedChunkCount);

    // Step 3: Analyze document structures (for exploratory queries)
    const documentStructures: DocumentStructure[] = [];

    if (classification.requiresComprehensiveContext) {
      const structurePromises = documentIds.map(docId =>
        this.structureAnalyzer.analyzeDocument(docId).catch(() => null)
      );

      const structures = await Promise.all(structurePromises);
      documentStructures.push(...structures.filter((s): s is DocumentStructure => s !== null));
    }

    // Step 4: Build prompt context
    // Use first document structure for context (if available)
    const primaryStructure = documentStructures[0] || {
      title: 'Document',
      type: 'unknown',
      chapters: [],
      keyTopics: [],
      contentSummary: 'No structure analysis available'
    };

    const promptContext = this.promptBuilder.buildPrompt(
      query,
      classification,
      topResults,
      primaryStructure,
      language
    );

    return {
      classification,
      searchResults: topResults,
      documentStructures,
      promptContext
    };
  }
}
