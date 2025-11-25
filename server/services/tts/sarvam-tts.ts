import { TTSProvider, TTSOptions } from './types';

export class SarvamTTS implements TTSProvider {
  public name = 'sarvam';
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY || '';
    this.endpoint = process.env.SARVAM_TTS_ENDPOINT || 'https://api.sarvam.ai/text-to-speech';

    if (!this.apiKey) {
      console.warn('[Sarvam TTS] Warning: SARVAM_API_KEY not configured');
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      // Test with minimal request using correct API format
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'test',
          target_language: 'hi-IN',
          speaker: 'anushka',
          model: 'bulbul:v2'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('[Sarvam TTS] Availability check failed:', error);
      return false;
    }
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('Sarvam API key not configured');
    }

    // Default to anushka (female) for v2, map old speaker names
    const speakerMap: Record<string, string> = {
      'meera': 'anushka',
      'arvind': 'abhilash',
      'aarti': 'manisha',
      'tanishq': 'vidya'
    };
    const requestedSpeaker = options.voice || 'anushka';
    const speaker = speakerMap[requestedSpeaker] || requestedSpeaker;

    console.log('[Sarvam TTS] Generating speech:', {
      textLength: text.length,
      voice: speaker
    });

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          target_language: options.languageCode || 'hi-IN',
          speaker: speaker, // v2 speakers: anushka, abhilash, manisha, vidya, arya, karun, hitesh
          pitch: options.pitch || 0,         // -10 to 10
          pace: options.speed || 1.0,        // 0.5 to 2.0
          loudness: options.volume || 1.5,   // 0.5 to 2.0
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: 'bulbul:v2'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sarvam API error: ${response.status} - ${errorText}`);
      }

      // Sarvam API returns JSON with base64-encoded audio
      const jsonResponse = await response.json();

      if (!jsonResponse.audios || jsonResponse.audios.length === 0) {
        throw new Error('Sarvam API returned no audio data');
      }

      // Decode base64 audio
      const base64Audio = jsonResponse.audios[0];
      const audioBuffer = Buffer.from(base64Audio, 'base64');

      console.log('[Sarvam TTS] Success! Audio size:', audioBuffer.byteLength);

      return audioBuffer;

    } catch (error) {
      console.error('[Sarvam TTS] Synthesis failed:', error);
      throw error;
    }
  }

  // Helper: Get available voices for bulbul:v2
  getAvailableVoices(): string[] {
    return ['anushka', 'abhilash', 'manisha', 'vidya', 'arya', 'karun', 'hitesh'];
  }
}
