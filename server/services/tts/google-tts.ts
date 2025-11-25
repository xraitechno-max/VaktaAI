import textToSpeech from '@google-cloud/text-to-speech';
import { TTSProvider, TTSOptions } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class GoogleTTS implements TTSProvider {
  public name = 'google';
  private client: textToSpeech.TextToSpeechClient | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const keyPath = process.env.GOOGLE_TTS_KEY_PATH;

      if (!keyPath) {
        console.warn('[Google TTS] GOOGLE_TTS_KEY_PATH not configured');
        return;
      }

      // Check if credentials file exists
      const fullPath = path.resolve(keyPath);
      if (!fs.existsSync(fullPath)) {
        console.warn('[Google TTS] Credentials file not found:', fullPath);
        return;
      }

      this.client = new textToSpeech.TextToSpeechClient({
        keyFilename: fullPath
      });

      this.isInitialized = true;
      console.log('[Google TTS] Initialized successfully');

    } catch (error) {
      console.error('[Google TTS] Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      return false;
    }

    try {
      // Test with list voices call
      await this.client.listVoices({
        languageCode: 'hi-IN'
      });
      return true;
    } catch (error) {
      console.error('[Google TTS] Availability check failed:', error);
      return false;
    }
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<Buffer> {
    if (!this.isInitialized || !this.client) {
      throw new Error('Google TTS not initialized');
    }

    const voice = options.voice || 'hi-IN-Neural2-A';

    // Extract languageCode from voice name (voice language takes priority)
    // Voice format: "hi-IN-Neural2-A" -> languageCode: "hi-IN"
    let languageCode: string;
    if (voice.includes('-')) {
      const parts = voice.split('-');
      if (parts.length >= 2) {
        languageCode = `${parts[0]}-${parts[1]}`;
      } else {
        languageCode = options.languageCode || 'hi-IN';
      }
    } else {
      languageCode = options.languageCode || 'hi-IN';
    }

    console.log('[Google TTS] Generating speech:', {
      textLength: text.length,
      voice: voice,
      languageCode: languageCode
    });

    try {
      // Determine if text is SSML or plain text
      const isSSML = text.trim().startsWith('<speak>');

      const request = {
        input: isSSML ? { ssml: text } : { text: text },
        voice: {
          languageCode: languageCode,
          name: voice,
          ssmlGender: voice.includes('A') || voice.includes('C')
            ? 'FEMALE' as const
            : 'MALE' as const
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: options.speed || 0.95,  // Slightly slower for teaching
          pitch: options.pitch || 2.0,           // Warmer, friendlier voice
          volumeGainDb: options.volume || 0.0,
          sampleRateHertz: 24000,
          effectsProfileId: ['headphone-class-device']  // Optimized for headphones
        }
      };

      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from Google TTS');
      }

      console.log('[Google TTS] Success! Audio size:', response.audioContent.length);

      return Buffer.from(response.audioContent);

    } catch (error) {
      console.error('[Google TTS] Synthesis failed:', error);
      throw error;
    }
  }

  // Helper: Get best voices for Indian accent
  getRecommendedVoices(): { [key: string]: string } {
    return {
      'female_warm': 'hi-IN-Neural2-A',      // Best for teaching
      'female_young': 'hi-IN-Neural2-C',     // Energetic
      'male_friendly': 'hi-IN-Neural2-B',    // Professional but warm
      'male_professional': 'hi-IN-Neural2-D' // Formal
    };
  }
}
