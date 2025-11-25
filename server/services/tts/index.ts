/**
 * TTS Multi-Provider System - Main Export
 *
 * Usage:
 *   import { ttsRouter, TTSContext } from '@/services/tts';
 *
 *   // Basic synthesis
 *   const result = await ttsRouter.synthesize(text, options, 'avatar');
 *
 *   // With phonemes (for lip-sync)
 *   const resultWithPhonemes = await ttsRouter.synthesizeWithPhonemes(text, options, 'avatar');
 *
 *   // Health check
 *   const status = await ttsRouter.getProviderStatus();
 */

// Main router (singleton)
export { ttsRouter, TTSRouter } from './tts-router';

// Individual providers (for direct access if needed)
export { SarvamTTS } from './sarvam-tts';
export { GoogleTTS } from './google-tts';
export { PollyTTS } from './polly-tts';

// Types
export type {
  TTSProvider,
  TTSOptions,
  TTSResult,
  TTSContext,
  TTSConfig,
} from './types';
