import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

interface AzureTTSConfig {
  subscriptionKey: string;
  region: string;
  voice: string; // e.g., "en-IN-NeerjaNeural", "hi-IN-AartiNeural"
  style?: 'default' | 'cheerful' | 'empathetic' | 'newscast';
  styleDegree?: number; // 0.01 to 2.0
  rate?: string; // e.g., "1.0", "+10%", "-20%"
  pitch?: string; // e.g., "default", "+5Hz", "-10%"
}

interface VisemeData {
  audioOffset: number; // in 100-nanosecond units
  visemeId: number; // 0-21 for Oculus visemes
}

interface AzureTTSResult {
  audio: Buffer;
  visemes?: VisemeData[];
  duration?: number; // in milliseconds
}

export class AzureTTSService {
  private subscriptionKey: string;
  private region: string;
  
  constructor() {
    this.subscriptionKey = process.env.AZURE_SPEECH_KEY || '';
    this.region = process.env.AZURE_SPEECH_REGION || 'eastus';
  }

  isAvailable(): boolean {
    return !!this.subscriptionKey && !!this.region;
  }

  /**
   * Synthesize speech using Azure TTS with optional viseme support
   * @param text - Text to synthesize
   * @param config - Azure TTS configuration
   * @param includeVisemes - Whether to include viseme data (only works for en-US voices)
   */
  async synthesizeSpeech(
    text: string,
    config: Partial<AzureTTSConfig> = {},
    includeVisemes: boolean = false
  ): Promise<AzureTTSResult> {
    if (!this.isAvailable()) {
      throw new Error('Azure TTS not configured. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.');
    }

    // Default to Indian female voice
    const voiceName = config.voice || 'en-IN-NeerjaNeural';
    const style = config.style || 'default';
    const styleDegree = config.styleDegree || 1;
    const rate = config.rate || '1.0';
    const pitch = config.pitch || 'default';

    // Configure speech SDK
    const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;

    // Create synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null as any);

    // Build SSML
    const ssml = this.buildSSML(text, voiceName, style, styleDegree, rate, pitch, includeVisemes);

    console.log(`[AZURE TTS] Synthesizing with voice: ${voiceName}, style: ${style}`);

    return new Promise<AzureTTSResult>((resolve, reject) => {
      const visemes: VisemeData[] = [];

      // Subscribe to viseme events if requested (only works for en-US voices)
      if (includeVisemes) {
        synthesizer.visemeReceived = (s, e) => {
          visemes.push({
            audioOffset: e.audioOffset,
            visemeId: e.visemeId
          });
        };
      }

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const audioData = Buffer.from(result.audioData);
            
            console.log(`[AZURE TTS] ✅ Synthesis complete: ${audioData.length} bytes${includeVisemes ? `, ${visemes.length} visemes` : ''}`);
            
            synthesizer.close();
            resolve({
              audio: audioData,
              visemes: includeVisemes ? visemes : undefined,
              duration: result.audioDuration ? result.audioDuration / 10000 : undefined // Convert to milliseconds
            });
          } else {
            synthesizer.close();
            reject(new Error(`Azure TTS synthesis failed: ${result.errorDetails}`));
          }
        },
        (error) => {
          synthesizer.close();
          reject(new Error(`Azure TTS error: ${error}`));
        }
      );
    });
  }

  /**
   * Synthesize speech from raw SSML (already formatted)
   * Used when SSML is pre-built by the caller (e.g., optimizedTutor with prosody controls)
   * @param ssml - Pre-built SSML string
   * @param includeVisemes - Whether to include viseme data for lip-sync (default: true for Unity)
   */
  async synthesizeSpeechFromSSML(ssml: string, includeVisemes: boolean = true): Promise<AzureTTSResult> {
    if (!this.isAvailable()) {
      throw new Error('Azure TTS not configured. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.');
    }

    // Configure speech SDK
    const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3;

    // Create synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null as any);

    console.log(`[AZURE TTS] Synthesizing from raw SSML (${ssml.length} chars)${includeVisemes ? ' + visemes' : ''}...`);

    return new Promise<AzureTTSResult>((resolve, reject) => {
      const visemes: VisemeData[] = [];

      // 🎯 Subscribe to viseme events for Unity lip-sync
      if (includeVisemes) {
        synthesizer.visemeReceived = (s, e) => {
          visemes.push({
            audioOffset: e.audioOffset,
            visemeId: e.visemeId
          });
        };
      }

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const audioData = Buffer.from(result.audioData);
            
            console.log(`[AZURE TTS] ✅ SSML synthesis complete: ${audioData.length} bytes${includeVisemes ? `, ${visemes.length} visemes` : ''}`);
            
            synthesizer.close();
            resolve({
              audio: audioData,
              visemes: includeVisemes ? visemes : undefined,
              duration: result.audioDuration ? result.audioDuration / 10000 : undefined
            });
          } else {
            synthesizer.close();
            reject(new Error(`Azure TTS SSML synthesis failed: ${result.errorDetails}`));
          }
        },
        (error) => {
          synthesizer.close();
          reject(new Error(`Azure TTS SSML error: ${error}`));
        }
      );
    });
  }

  /**
   * Synthesize speech with streaming support
   * @param text - Text to synthesize
   * @param config - Azure TTS configuration
   * @param onAudioChunk - Callback for each audio chunk
   * @param includeVisemes - Whether to include viseme data
   */
  async synthesizeSpeechStream(
    text: string,
    config: Partial<AzureTTSConfig> = {},
    onAudioChunk: (chunk: Buffer) => void,
    includeVisemes: boolean = false
  ): Promise<{ visemes?: VisemeData[] }> {
    if (!this.isAvailable()) {
      throw new Error('Azure TTS not configured.');
    }

    const voiceName = config.voice || 'en-IN-NeerjaNeural';
    const style = config.style || 'default';
    const styleDegree = config.styleDegree || 1;
    const rate = config.rate || '1.0';
    const pitch = config.pitch || 'default';

    const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

    // Use pull audio output stream for streaming
    const pullStream = sdk.AudioOutputStream.createPullStream();
    const audioConfig = sdk.AudioConfig.fromStreamOutput(pullStream);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    const ssml = this.buildSSML(text, voiceName, style, styleDegree, rate, pitch, includeVisemes);

    return new Promise((resolve, reject) => {
      const visemes: VisemeData[] = [];

      if (includeVisemes) {
        synthesizer.visemeReceived = (s, e) => {
          visemes.push({
            audioOffset: e.audioOffset,
            visemeId: e.visemeId
          });
        };
      }

      synthesizer.speakSsmlAsync(
        ssml,
        async (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            // Read audio data from pull stream
            const buffer = Buffer.alloc(16000);
            let bytesRead = await pullStream.read(buffer);
            
            while (bytesRead > 0) {
              onAudioChunk(buffer.slice(0, bytesRead));
              bytesRead = await pullStream.read(buffer);
            }

            synthesizer.close();
            pullStream.close();
            
            console.log(`[AZURE TTS] ✅ Streaming complete${includeVisemes ? `, ${visemes.length} visemes` : ''}`);
            resolve({ visemes: includeVisemes ? visemes : undefined });
          } else {
            synthesizer.close();
            pullStream.close();
            reject(new Error(`Azure TTS synthesis failed: ${result.errorDetails}`));
          }
        },
        (error) => {
          synthesizer.close();
          pullStream.close();
          reject(new Error(`Azure TTS streaming error: ${error}`));
        }
      );
    });
  }

  /**
   * Build SSML for Azure TTS
   */
  private buildSSML(
    text: string,
    voiceName: string,
    style: string,
    styleDegree: number,
    rate: string,
    pitch: string,
    includeVisemes: boolean
  ): string {
    // Extract language code from voice name (e.g., "en-IN" from "en-IN-NeerjaNeural")
    const langMatch = voiceName.match(/^([a-z]{2}-[A-Z]{2})/);
    const lang = langMatch ? langMatch[1] : 'en-IN';

    // Check if voice supports styles (Neerja, Swara, Aarti support styles)
    const supportsStyles = voiceName.includes('Neerja') || voiceName.includes('Swara') || voiceName.includes('Aarti');

    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}">`;
    ssml += `<voice name="${voiceName}">`;

    // Add viseme request if needed (only for en-US voices, but we'll try anyway)
    if (includeVisemes) {
      ssml += `<mstts:viseme type="FacialExpression"/>`;
    }

    // Add prosody controls
    ssml += `<prosody rate="${rate}" pitch="${pitch}">`;

    // Add style if supported and not default
    if (supportsStyles && style !== 'default') {
      ssml += `<mstts:express-as style="${style}" styledegree="${styleDegree}">`;
      ssml += text;
      ssml += `</mstts:express-as>`;
    } else {
      ssml += text;
    }

    ssml += `</prosody>`;
    ssml += `</voice>`;
    ssml += `</speak>`;

    return ssml;
  }

  /**
   * Get list of available Indian voices
   */
  getIndianVoices(): { name: string; language: string; gender: string; description: string }[] {
    return [
      {
        name: 'en-IN-NeerjaNeural',
        language: 'English (India)',
        gender: 'Female',
        description: 'Natural Indian English with styles: Default, Cheerful, Empathetic, Newscast'
      },
      {
        name: 'hi-IN-AartiNeural',
        language: 'Hindi (India)',
        gender: 'Female',
        description: 'Soft, empathetic, bilingual (Hindi + English), latest 2025 release'
      },
      {
        name: 'hi-IN-SwaraNeural',
        language: 'Hindi (India)',
        gender: 'Female',
        description: 'Hindi with styles: Default, Cheerful, Empathetic, Newscast'
      },
      {
        name: 'en-IN-PrabhatNeural',
        language: 'English (India)',
        gender: 'Male',
        description: 'Natural Indian English male voice'
      },
      {
        name: 'hi-IN-MadhurNeural',
        language: 'Hindi (India)',
        gender: 'Male',
        description: 'Hindi male voice'
      }
    ];
  }
}

// Export singleton instance
export const azureTtsService = new AzureTTSService();
