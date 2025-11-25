import OpenAI from 'openai';
import { documentService } from './documentService';
import { TokenCounter } from '../utils/tokenCounter';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Please add your OpenAI API key to use this feature.');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

interface AgenticRAGTool {
  name: string;
  description: string;
  parameters: any;
}

interface AgenticRAGStep {
  step: number;
  action: string;
  tool: string;
  input: any;
  output: any;
  reflection: string;
}

interface AgenticRAGResult {
  answer: string;
  sources: any[];
  steps: AgenticRAGStep[];
  confidence: number;
}

export class AgenticRAGService {
  private tools: AgenticRAGTool[] = [
    {
      name: 'search_documents',
      description: 'Search for specific information in documents using semantic search. Use this when you need to find particular facts, concepts, or sections.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant information'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'get_document_sections',
      description: 'Get specific sections or pages from documents. Use when you need structured information from particular parts of documents.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'The topic or section to retrieve'
          },
          maxChunks: {
            type: 'number',
            description: 'Number of chunks to retrieve (default: 20)'
          }
        },
        required: ['topic']
      }
    },
    {
      name: 'verify_information',
      description: 'Cross-reference information across multiple documents to verify accuracy. Use when you need to confirm facts or find contradictions.',
      parameters: {
        type: 'object',
        properties: {
          claim: {
            type: 'string',
            description: 'The claim or information to verify'
          }
        },
        required: ['claim']
      }
    },
    {
      name: 'synthesize_answer',
      description: 'Synthesize a final answer based on gathered information. Use this as the last step after collecting all necessary information.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The original question to answer'
          },
          information: {
            type: 'string',
            description: 'All gathered information to synthesize'
          }
        },
        required: ['question', 'information']
      }
    }
  ];

  async executeAgenticRAG(
    userQuery: string,
    userId: string,
    docIds: string[],
    language: string = 'en',
    onChunk?: (chunk: string) => void
  ): Promise<AgenticRAGResult> {
    const steps: AgenticRAGStep[] = [];
    let gatheredInfo: string[] = [];
    let allSources: any[] = [];

    // Step 1: Plan the approach
    const plan = await this.planApproach(userQuery, language);
    if (onChunk) onChunk(`**Planning:** ${plan}\n\n`);

    // Step 2: Execute plan with multiple tool calls
    const maxSteps = 5;
    let currentStep = 1;
    let needsMoreInfo = true;

    while (needsMoreInfo && currentStep <= maxSteps) {
      if (onChunk) onChunk(`**Step ${currentStep}:** `);

      // Agent decides what tool to use
      const toolCall = await this.decideNextAction(
        userQuery,
        gatheredInfo.join('\n\n'),
        steps,
        language
      );

      if (!toolCall || toolCall.tool === 'synthesize_answer') {
        needsMoreInfo = false;
        break;
      }

      // Execute the tool
      const result = await this.executeTool(
        toolCall.tool,
        toolCall.input,
        userId,
        docIds
      );

      if (result.chunks) {
        gatheredInfo.push(result.content);
        allSources.push(...result.chunks);
      }

      // Self-reflection: Is this information useful?
      const reflection = await this.reflectOnInfo(
        userQuery,
        result.content,
        gatheredInfo.join('\n\n')
      );

      steps.push({
        step: currentStep,
        action: toolCall.action,
        tool: toolCall.tool,
        input: toolCall.input,
        output: result.content.substring(0, 500),
        reflection
      });

      if (onChunk) onChunk(`${toolCall.action}\n${reflection}\n\n`);

      // Check if we have enough information
      if (reflection.includes('sufficient') || reflection.includes('complete') || currentStep >= 3) {
        needsMoreInfo = false;
      }

      currentStep++;
    }

    // Step 3: Synthesize final answer
    if (onChunk) onChunk(`**Synthesizing Answer:**\n\n`);

    const finalAnswer = await this.synthesizeFinalAnswer(
      userQuery,
      gatheredInfo.join('\n\n'),
      allSources,
      language,
      onChunk
    );

    // Step 4: Calculate confidence
    const confidence = this.calculateConfidence(steps, allSources.length);

    return {
      answer: finalAnswer,
      sources: allSources,
      steps,
      confidence
    };
  }

  private async planApproach(query: string, language: string): Promise<string> {
    let langInstruction = '';
    if (language === 'hi') {
      langInstruction = ' Respond in Hindi.';
    } else if (language === 'hinglish') {
      langInstruction = ' Respond in natural Hinglish (mix Hindi and English naturally).';
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a planning agent. Analyze the user query and create a brief plan (2-3 steps) for how to answer it using document search. Be concise.${langInstruction}`
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\nCreate a brief plan:`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    return response.choices[0].message.content || 'Search for relevant information and synthesize answer.';
  }

  private async decideNextAction(
    originalQuery: string,
    gatheredInfo: string,
    steps: AgenticRAGStep[],
    language: string
  ): Promise<{ action: string; tool: string; input: any } | null> {
    const toolsJSON = JSON.stringify(this.tools, null, 2);

    const systemPrompt = `You are an intelligent agent that decides what action to take next to answer a query. Based on the original query, information gathered so far, and available tools, decide which tool to use next.

Available tools:
${toolsJSON}

Respond in JSON format:
{
  "action": "brief description of what you're doing",
  "tool": "tool_name",
  "input": { ...tool parameters }
}

If you have enough information, use "synthesize_answer" as the tool.${language === 'hi' ? ' Descriptions can be in Hindi.' : language === 'hinglish' ? ' Descriptions can be in natural Hinglish.' : ''}`;

    const userMessageTemplate = `Original Query: "${originalQuery}"

Information gathered so far:
{PLACEHOLDER}

Steps completed: ${steps.length}

What should I do next?`;

    const budget = TokenCounter.calculateAvailableSpace(
      8192,
      systemPrompt,
      userMessageTemplate,
      300
    );

    const truncatedInfo = gatheredInfo
      ? TokenCounter.truncateToTokenLimit(gatheredInfo, budget.available, '\n\n[... truncated ...]')
      : 'None yet';

    const infoTokens = TokenCounter.countTokens(gatheredInfo || '');
    const truncatedTokens = TokenCounter.countTokens(truncatedInfo);
    
    console.log('[decideNextAction] Info tokens:', infoTokens, '→', truncatedTokens, `(available: ${budget.available})`);

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Original Query: "${originalQuery}"

Information gathered so far:
${truncatedInfo}

Steps completed: ${steps.length}

What should I do next?`
        }
      ],
      temperature: 0.4,
      max_tokens: 300
    });

    try {
      const content = response.choices[0].message.content || '{}';
      return JSON.parse(content);
    } catch (e) {
      // If JSON parsing fails, default to search
      return {
        action: 'Searching for relevant information',
        tool: 'search_documents',
        input: { query: originalQuery, maxResults: 10 }
      };
    }
  }

  private async executeTool(
    toolName: string,
    input: any,
    userId: string,
    docIds: string[]
  ): Promise<{ content: string; chunks?: any[] }> {
    switch (toolName) {
      case 'search_documents':
        const searchChunks = await documentService.retrieveRelevantChunks(
          input.query,
          userId,
          docIds,
          input.maxResults || 10
        );
        return {
          content: searchChunks
            .map((c, i) => `[${i + 1}] ${c.metadata.docTitle} (p.${c.metadata.page}): ${c.text}`)
            .join('\n\n'),
          chunks: searchChunks
        };

      case 'get_document_sections':
        const sectionChunks = await documentService.retrieveRelevantChunks(
          input.topic,
          userId,
          docIds,
          input.maxChunks || 20
        );
        return {
          content: sectionChunks
            .map(c => `${c.metadata.docTitle} - ${c.text}`)
            .join('\n\n'),
          chunks: sectionChunks
        };

      case 'verify_information':
        const verifyChunks = await documentService.retrieveRelevantChunks(
          input.claim,
          userId,
          docIds,
          15
        );
        return {
          content: `Verification search for: "${input.claim}"\n\n` +
            verifyChunks
              .map(c => `${c.metadata.docTitle}: ${c.text}`)
              .join('\n\n'),
          chunks: verifyChunks
        };

      default:
        return { content: 'Tool not found' };
    }
  }

  private async reflectOnInfo(
    query: string,
    newInfo: string,
    allInfo: string
  ): Promise<string> {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a reflection agent. Evaluate if the gathered information is sufficient to answer the query. Respond in 1-2 sentences.'
        },
        {
          role: 'user',
          content: `Query: "${query}"

New information found:
${newInfo.substring(0, 1000)}

Is this helpful? Do we need more information?`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    return response.choices[0].message.content || 'Information gathered.';
  }

  private async synthesizeFinalAnswer(
    query: string,
    gatheredInfo: string,
    sources: any[],
    language: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    let langInstruction = '';

    if (language === 'hi') {
      langInstruction = 'Respond in Hindi (हिन्दी). Use Devanagari script.';
    } else if (language === 'hinglish') {
      langInstruction = `Respond in NATURAL CONVERSATIONAL HINGLISH - exactly like an Indian teacher explains to students.

🎯 PERFECT HINGLISH STYLE:
✅ "Electric charge ek fundamental property hai matter ki jo electromagnetic forces create karta hai"
✅ "Basically, har particle ke paas ek charge hota hai - ya toh positive ya negative"
✅ "Same charges repel karte hain aur opposite charges attract karte hain"
✅ "Jab tum plastic comb se apne baalon ko karte ho, toh electrons transfer ho jate hain"

❌ NEVER DO THIS:
❌ "Electric Charge, or 'Vidhut Avesh' in Hindi, is a fundamental property..."
❌ "The force (known as Bal in Hindi) acts..."
❌ Pure English sentences

🔑 MANDATORY RULES:

1. **HINDI VERBS & GRAMMAR** (Most Important!):
   - ALWAYS use: hai, hota hai, hoti hai, hote hain, karta hai, karte hain, kehlaata hai, lagta hai, aate hain
   - Example: "Electrons negative charge carry karte hain"
   - Example: "Yeh static electricity kehlaata hai"

2. **HINDI CONNECTORS**:
   - Use: aur, ya, toh, kyunki, isi wajah se, jab, agar, ke paas, ke beech, me
   - Example: "Jab electrons move karte hain toh current flow hota hai"

3. **CONVERSATIONAL MARKERS**:
   - Start with: "Dekho,", "Basically,", "Toh,"
   - Use throughout: matlab, yaani, isi liye
   - End with: "Samajh me aaya?", "Kuch aur detail me jaanna hai?"

4. **TECHNICAL TERMS IN ENGLISH**:
   - Keep ALL scientific terms in English: charge, electron, proton, force, electromagnetic, etc.
   - NEVER translate to Sanskrit/formal Hindi (NO Vidhut Avesh, NO Urja, NO Bal)

5. **REAL-LIFE EXAMPLES**:
   - Give examples with natural Hinglish explanation
   - Example: "Real example: Jab tum plastic comb se apne baalon ko karte ho, toh electrons transfer ho jate hain"

6. **STRUCTURE**:
   - Use bullet points naturally: "Do types ke charges hote hain: 1. Positive charge... 2. Negative charge..."
   - Add formulas/key points in English but explanation in Hinglish
   - End with friendly question to check understanding

REMEMBER: Write like you're explaining to your friend in person - natural Hindi+English mix!`;
    } else {
      langInstruction = 'Respond in English.';
    }

    const systemPrompt = `You are a helpful AI tutor for Indian students. Synthesize a comprehensive answer based on the gathered information. Include citations with [source number] format. ${langInstruction}`;

    const userMessageTemplate = `Question: "${query}"

Gathered Information:
{PLACEHOLDER}

Please provide a comprehensive answer with proper citations.`;

    const budget = TokenCounter.calculateAvailableSpace(
      8192,
      systemPrompt,
      userMessageTemplate,
      1500
    );

    const infoTokens = TokenCounter.countTokens(gatheredInfo);
    console.log('[synthesizeFinalAnswer] Info tokens:', infoTokens, '| Available:', budget.available);

    let optimizedInfo: string;
    
    if (infoTokens <= budget.available) {
      optimizedInfo = gatheredInfo;
      console.log('[synthesizeFinalAnswer] Using full context (fits within budget)');
    } else {
      const chunksWithScores = sources.map((source, idx) => ({
        text: `[Source ${idx + 1}] ${source.metadata?.docTitle || 'Document'}: ${source.text}`,
        score: source.similarity || 0.5
      }));

      optimizedInfo = TokenCounter.prioritizeAndTruncate(chunksWithScores, budget.available);
      
      const optimizedTokens = TokenCounter.countTokens(optimizedInfo);
      console.log('[synthesizeFinalAnswer] Smart truncation:', infoTokens, '→', optimizedTokens, 
        `(${sources.length} sources, prioritized by relevance)`);
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Question: "${query}"

Gathered Information:
${optimizedInfo}

Please provide a comprehensive answer with proper citations.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      stream: true
    });

    let fullAnswer = '';
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullAnswer += content;
      if (onChunk) onChunk(content);
    }

    return fullAnswer;
  }

  private calculateConfidence(steps: AgenticRAGStep[], sourceCount: number): number {
    // Confidence based on:
    // 1. Number of sources found (more is better, up to a point)
    // 2. Number of steps taken (sweet spot is 2-3 steps)
    
    const sourceScore = Math.min(sourceCount / 10, 1) * 50; // Max 50 points
    const stepScore = steps.length >= 2 && steps.length <= 3 ? 50 : 30; // 50 points for optimal steps
    
    return Math.round(sourceScore + stepScore);
  }
}

export const agenticRAGService = new AgenticRAGService();
