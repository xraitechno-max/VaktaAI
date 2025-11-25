/**
 * TTS Multi-Provider System - Type Definitions
 */

export interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  languageCode?: string;
  isSSML?: boolean; // If true, text is SSML markup instead of plain text
}

export interface TTSResult {
  audioBuffer: Buffer;
  format: 'mp3' | 'wav' | 'ogg';
  duration?: number;
  provider: 'azure' | 'sarvam' | 'google' | 'polly';
  cached: boolean;
  phonemes?: Array<{
    time: number;
    type: string;
    value: string;
  }>;
  visemes?: Array<{
    audioOffset: number; // Azure viseme format (100ns units)
    visemeId: number;    // 0-21 for Oculus visemes
  }>;
  wordBoundaries?: Array<{
    time: number;
    type: string;
    value: string;
    start: number;
    end: number;
  }>;
}

export type TTSContext = 'avatar' | 'quick' | 'practice' | 'notification';

export interface TTSProvider {
  name: string;
  synthesize(text: string, options?: TTSOptions): Promise<Buffer>;
  isAvailable(): Promise<boolean>;
}

export interface TTSConfig {
  provider: 'azure' | 'sarvam' | 'google' | 'polly';
  options: TTSOptions;
  context: TTSContext;
}
