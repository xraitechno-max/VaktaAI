import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { TTSProvider, TTSOptions } from './types';
import { Readable } from 'stream';

export class PollyTTS implements TTSProvider {
  public name = 'polly';
  private client: PollyClient;
  private isConfigured = false;

  constructor() {
    this.client = new PollyClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.isConfigured = !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    );

    if (!this.isConfigured) {
      console.warn('[Polly TTS] AWS credentials not configured');
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      // Test with a minimal synthesis request
      const command = new SynthesizeSpeechCommand({
        Text: 'test',
        OutputFormat: 'mp3',
        VoiceId: 'Aditi',
        Engine: 'standard',
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('[Polly TTS] Availability check failed:', error);
      return false;
    }
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<Buffer> {
    if (!this.isConfigured) {
      throw new Error('AWS Polly not configured');
    }

    const voiceId = options.voice || 'Aditi'; // Default: Indian English
    const languageCode = options.languageCode || 'en-IN';

    console.log('[Polly TTS] Generating speech:', {
      textLength: text.length,
      voice: voiceId,
      languageCode
    });

    try {
      // Determine if input is SSML
      const isSSML = text.trim().startsWith('<speak>');

      // Try neural engine first, fallback to standard if not supported
      let response;
      try {
        const command = new SynthesizeSpeechCommand({
          Text: text,
          TextType: isSSML ? 'ssml' : 'text',
          OutputFormat: 'mp3',
          VoiceId: voiceId,
          Engine: 'neural', // Neural for better quality
          LanguageCode: languageCode,
          SampleRate: '24000', // Higher quality
        });

        response = await this.client.send(command);
      } catch (neuralError: any) {
        // Fallback to standard engine if neural not supported
        if (neuralError.name === 'InvalidParameterException' ||
            neuralError.message?.includes('neural')) {
          console.warn('[Polly TTS] Neural engine not supported, using standard');

          const fallbackCommand = new SynthesizeSpeechCommand({
            Text: text,
            TextType: isSSML ? 'ssml' : 'text',
            OutputFormat: 'mp3',
            VoiceId: voiceId,
            Engine: 'standard', // Fallback
            LanguageCode: languageCode,
            SampleRate: '24000',
          });

          response = await this.client.send(fallbackCommand);
        } else {
          throw neuralError;
        }
      }

      if (!response.AudioStream) {
        throw new Error('No audio stream received from Polly');
      }

      const audioBuffer = await this.streamToBuffer(response.AudioStream as any);

      console.log('[Polly TTS] Success! Audio size:', audioBuffer.length);

      return audioBuffer;

    } catch (error) {
      console.error('[Polly TTS] Synthesis failed:', error);
      throw error;
    }
  }

  /**
   * 🎯 UNIQUE POLLY FEATURE: Synthesize with viseme data for lip-sync
   * This is used for avatar phoneme-based lip synchronization
   */
  async synthesizeWithVisemes(
    text: string,
    options: TTSOptions = {}
  ): Promise<{
    audio: Buffer;
    visemes: Array<{time: number; type: string; value: string}>;
    words: Array<{time: number; type: string; value: string; start: number; end: number}>;
  }> {
    if (!this.isConfigured) {
      throw new Error('AWS Polly not configured');
    }

    const voiceId = options.voice || 'Aditi';
    const languageCode = options.languageCode || 'en-IN';
    const isSSML = text.trim().startsWith('<speak>');

    console.log('[Polly TTS+Visemes] Generating audio + visemes:', {
      textLength: text.length,
      voice: voiceId,
      isSSML
    });

    try {
      // 1. Get audio (MP3)
      const audioCommand = new SynthesizeSpeechCommand({
        Text: text,
        TextType: isSSML ? 'ssml' : 'text',
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: 'standard', // Visemes only work with standard engine
        LanguageCode: languageCode,
        SampleRate: '24000',
      });

      const audioResponse = await this.client.send(audioCommand);
      const audioBuffer = await this.streamToBuffer(audioResponse.AudioStream as any);

      // 2. Get visemes + word boundaries (Speech Marks)
      const visemeCommand = new SynthesizeSpeechCommand({
        Text: text,
        TextType: isSSML ? 'ssml' : 'text',
        OutputFormat: 'json',
        VoiceId: voiceId,
        Engine: 'standard', // Must match audio engine
        LanguageCode: languageCode,
        SpeechMarkTypes: ['viseme', 'word'], // 🎯 ADD WORD BOUNDARIES for word-level sync
      });

      const visemeResponse = await this.client.send(visemeCommand);
      const speechMarksText = await this.streamToString(visemeResponse.AudioStream as any);

      // Parse visemes + word boundaries (each line is a JSON object)
      const visemes: Array<{time: number; type: string; value: string}> = [];
      const words: Array<{time: number; type: string; value: string; start: number; end: number}> = [];
      const lines = speechMarksText.trim().split('\n');

      for (const line of lines) {
        if (line.trim()) {
          const mark = JSON.parse(line);
          if (mark.type === 'viseme') {
            visemes.push({
              time: mark.time,
              type: 'viseme',
              value: mark.value,
            });
          } else if (mark.type === 'word') {
            // 🎯 WORD BOUNDARIES: For stronger word-level sync
            words.push({
              time: mark.time,
              type: 'word',
              value: mark.value,
              start: mark.start,
              end: mark.end,
            });
          }
        }
      }

      console.log('[Polly TTS+Visemes+Words] Success!', {
        audioSize: audioBuffer.length,
        visemeCount: visemes.length,
        wordCount: words.length
      });

      return { audio: audioBuffer, visemes, words };

    } catch (error) {
      console.error('[Polly TTS+Visemes] Error:', error);
      throw error;
    }
  }

  /**
   * Helper: Get available Indian voices
   */
  getRecommendedVoices(): { [key: string]: string } {
    return {
      'indian_female': 'Aditi',      // Hindi + English (neural)
      'indian_english': 'Raveena',   // English only (standard)
      'us_female': 'Joanna',         // US English (neural)
      'us_male': 'Matthew',          // US English (neural)
    };
  }

  /**
   * Convert Readable stream to Buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Convert Readable stream to string
   */
  private async streamToString(stream: Readable): Promise<string> {
    const chunks: Uint8Array[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }
}
