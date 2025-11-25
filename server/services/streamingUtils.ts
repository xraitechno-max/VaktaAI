/**
 * Streaming utility for AI chat completions
 */

import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please add it to your secrets.');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

export interface StreamingOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Stream chat completion with callback for each chunk
 */
export async function streamChatCompletion(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemPrompt: string,
  onChunk: (chunk: string) => void,
  options: StreamingOptions = {}
): Promise<void> {
  const {
    temperature = 0.7,
    maxTokens = 2048,
    model = 'gpt-4o-mini'
  } = options;

  // Prepend system prompt
  const messagesWithSystem = [
    { role: 'system' as const, content: systemPrompt },
    ...messages
  ];

  const stream = await getOpenAI().chat.completions.create({
    model,
    messages: messagesWithSystem,
    temperature,
    max_tokens: maxTokens,
    stream: true
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      onChunk(content);
    }
  }
}

/**
 * PHASE 3: Sentence-by-Sentence Streaming
 * Buffers AI response and sends complete sentences for smoother UX
 */
export async function streamSentences(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  systemPrompt: string,
  onSentence: (sentence: string) => void,
  options: StreamingOptions = {}
): Promise<void> {
  const {
    temperature = 0.7,
    maxTokens = 2048,
    model = 'gpt-4o-mini'
  } = options;

  // Prepend system prompt
  const messagesWithSystem = [
    { role: 'system' as const, content: systemPrompt },
    ...messages
  ];

  const stream = await getOpenAI().chat.completions.create({
    model,
    messages: messagesWithSystem,
    temperature,
    max_tokens: maxTokens,
    stream: true
  });

  let buffer = '';

  // Regex to detect sentence boundaries: . ! ? followed by space or end
  const sentenceBoundary = /[^.!?]+[.!?]+(?:\s|$)/g;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;

    if (content) {
      buffer += content;

      // Try to extract complete sentences
      let match;
      let lastIndex = 0;

      // Create a fresh regex for each iteration
      const regex = new RegExp(sentenceBoundary.source, sentenceBoundary.flags);

      while ((match = regex.exec(buffer)) !== null) {
        const sentence = match[0].trim();
        if (sentence) {
          onSentence(sentence);
          // Small delay for natural flow (50ms)
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        lastIndex = regex.lastIndex;
      }

      // Keep unmatched content in buffer
      if (lastIndex > 0) {
        buffer = buffer.slice(lastIndex);
      }
    }
  }

  // Send any remaining content as final sentence
  if (buffer.trim()) {
    onSentence(buffer.trim());
  }
}

/**
 * Stream pre-generated text sentence by sentence
 * Useful for streaming text that's already been generated
 */
export async function streamText(
  text: string,
  onSentence: (sentence: string) => void,
  delayMs: number = 50
): Promise<void> {
  // Regex to detect sentence boundaries: . ! ? followed by space or end
  const sentenceBoundary = /[^.!?]+[.!?]+(?:\s|$)/g;

  const sentences: string[] = [];
  let match;

  while ((match = sentenceBoundary.exec(text)) !== null) {
    const sentence = match[0].trim();
    if (sentence) {
      sentences.push(sentence);
    }
  }

  // Send each sentence with a small delay
  for (const sentence of sentences) {
    onSentence(sentence);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // Send any remaining text (text that doesn't end with punctuation)
  const lastIndex = sentenceBoundary.lastIndex || 0;
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    onSentence(remaining);
  }
}
