import OpenAI from "openai";
import { getOpenAI } from "./openai";

// Lazy initialization of Groq client
let groqClient: OpenAI | null = null;

/**
 * Get Groq client configured with Groq API endpoint
 * Uses OpenAI SDK with custom baseURL for Groq compatibility
 */
export function getGroq(): OpenAI {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured. Please add your Groq API key to use this feature.');
    }
    groqClient = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groqClient;
}

/**
 * Check if Groq API key is available
 */
export function hasGroqKey(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/**
 * Call Groq with automatic OpenAI fallback
 * Perfect for fast, simple tasks like intent classification, emotion detection
 * 
 * @param messages - Chat messages
 * @param options - Configuration options
 * @returns OpenAI completion response
 */
export async function callGroqWithFallback(
  messages: Array<{ role: string; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json_object' | 'text';
    serviceName?: string; // For logging
  }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const serviceName = options?.serviceName || 'Unknown';
  const groqModel = options?.model || 'llama-3.3-70b-versatile';
  const fallbackModel = 'gpt-4o-mini';
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 500;
  
  const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    model: groqModel,
    messages: messages as any[],
    temperature,
    max_tokens: maxTokens,
  };
  
  if (options?.responseFormat === 'json_object') {
    requestParams.response_format = { type: 'json_object' };
  }
  
  // Try Groq first if key is available
  if (hasGroqKey()) {
    try {
      const start = Date.now();
      const response = await getGroq().chat.completions.create(requestParams);
      const latency = Date.now() - start;
      
      console.log(`[${serviceName}] ⚡ Groq (${groqModel}) - ${latency}ms - Success`);
      return response;
    } catch (error) {
      console.warn(`[${serviceName}] ⚠️ Groq failed, falling back to OpenAI:`, error instanceof Error ? error.message : error);
      // Fall through to OpenAI fallback
    }
  }
  
  // Fallback to OpenAI
  try {
    const start = Date.now();
    requestParams.model = fallbackModel;
    const response = await getOpenAI().chat.completions.create(requestParams);
    const latency = Date.now() - start;
    
    const reason = hasGroqKey() ? 'Groq failed' : 'No Groq key';
    console.log(`[${serviceName}] 🧮 OpenAI fallback (${fallbackModel}) - ${latency}ms - Reason: ${reason}`);
    return response;
  } catch (error) {
    console.error(`[${serviceName}] ❌ Both Groq and OpenAI failed:`, error);
    throw error;
  }
}

/**
 * Export getOpenAI for services that still need direct OpenAI access
 */
export { getOpenAI };
