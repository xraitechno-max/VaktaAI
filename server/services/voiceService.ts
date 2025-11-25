import { AssemblyAI } from 'assemblyai';
import { Readable } from 'stream';
import { sarvamVoiceService } from './sarvamVoice';
import { ttsRouter } from './tts/tts-router';

const assemblyAI = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

export class VoiceService {
  /**
   * Transcribe audio to text
   * Primary: Sarvam AI (Indian accent optimized)
   * Fallback: AssemblyAI
   */
  async transcribeAudio(audioUrl: string, language: 'hi' | 'en' = 'en'): Promise<{
    text: string;
    confidence: number;
    language: string;
  }> {
    // Try Sarvam AI first (Indian accent optimized)
    if (sarvamVoiceService.isAvailable()) {
      try {
        console.log(`[VOICE] Using Sarvam AI STT for ${language}...`);
        
        // Fetch audio from URL
        const audioResponse = await fetch(audioUrl);
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        
        return await sarvamVoiceService.transcribeAudio(audioBuffer, language);
      } catch (sarvamError) {
        console.warn('[VOICE] Sarvam AI failed, falling back to AssemblyAI:', sarvamError);
      }
    }
    
    // Fallback to AssemblyAI
    try {
      console.log(`[VOICE] Using AssemblyAI STT for ${language}...`);
      
      const transcript = await assemblyAI.transcripts.transcribe({
        audio: audioUrl,
        language_code: language === 'hi' ? 'hi' : 'en',
        speaker_labels: false,
      });
      
      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }
      
      console.log(`[VOICE] ✅ Transcription complete: ${transcript.text?.substring(0, 50)}...`);
      
      return {
        text: transcript.text || '',
        confidence: transcript.confidence || 0,
        language,
      };
    } catch (error) {
      console.error('[VOICE] Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }
  
  /**
   * Synthesize text to speech
   * Uses TTS Router with intelligent fallback:
   * Primary: Azure TTS (Indian voices with circuit breaker protection)
   * Fallback: Sarvam AI → Google → AWS Polly
   */
  async synthesizeSpeech(
    text: string,
    language: 'hi' | 'en' = 'en'
  ): Promise<Buffer> {
    try {
      console.log(`[VOICE] Using TTS Router for ${language} synthesis...`);
      
      // Use TTS Router which handles Azure (primary) → Sarvam → Google → Polly fallback
      const result = await ttsRouter.synthesize(
        text,
        {
          languageCode: language,
        },
        'avatar' // Use 'avatar' context for best quality Indian voices (Azure primary)
      );
      
      console.log(`[VOICE] ✅ Speech synthesized via ${result.provider}: ${result.audioBuffer.length} bytes`);
      return result.audioBuffer;
    } catch (error) {
      console.error('[VOICE] TTS Router error:', error);
      throw new Error('Failed to synthesize speech - all TTS providers unavailable');
    }
  }
  
  /**
   * 🎯 Synthesize speech with Azure TTS for Unity avatar lip-sync
   * Unity OVRLipSync generates phonemes CLIENT-SIDE from audio
   * Returns: { audio: Buffer, visemes: [] } - visemes deprecated, Unity handles phoneme generation
   */
  async synthesizeWithVisemes(
    text: string,
    language: 'hi' | 'en' = 'en'
  ): Promise<{ audio: Buffer; visemes: Array<{time: number; type: string; value: string}> }> {
    try {
      console.log(`[VOICE+AZURE] Synthesizing audio for Unity OVRLipSync (${language})...`);
      
      // Use Azure TTS (primary) with ttsRouter for high-quality Indian voices
      const result = await ttsRouter.synthesize(
        text,
        {
          languageCode: language,
        },
        'avatar' // Azure 48kHz Indian voices for best quality
      );
      
      console.log(`[VOICE+AZURE] ✅ Generated ${result.audioBuffer.length} bytes audio via ${result.provider}`);
      console.log('[VOICE+AZURE] ℹ️  Unity OVRLipSync will generate phonemes client-side');
      
      // Return audio + empty visemes (Unity OVRLipSync handles phoneme generation)
      return { 
        audio: result.audioBuffer, 
        visemes: [] // Unity generates phonemes locally from audio
      };
    } catch (error) {
      console.error('[VOICE+AZURE] Error:', error);
      throw error;
    }
  }
  
  /**
   * 🎯 Synthesize SSML with Azure TTS for Unity avatar lip-sync
   * Azure TTS provides viseme data that Unity uses for lip-sync
   * SSML prosody controls (rate, pitch, emphasis) are preserved for expressive speech
   * Returns: { audio: Buffer, visemes: Array } - Azure visemes for Unity lip-sync
   */
  async synthesizeSSMLWithVisemes(
    ssml: string,
    options: {
      voiceId?: string;
      engine?: 'neural' | 'standard';
      language: 'hi' | 'en' | 'hinglish';
    }
  ): Promise<{ audio: Buffer; visemes: Array<{time: number; type: string; value: string}> }> {
    try {
      // Language code mapping (Hinglish uses en-IN)
      const language = options.language === 'hi' ? 'hi' : 'en';
      
      console.log(`[VOICE+SSML+AZURE] Synthesizing SSML audio + visemes for Unity (${options.language})...`);
      console.log(`[VOICE+SSML+AZURE] SSML length: ${ssml.length} chars`);
      
      // Import Azure TTS provider directly for viseme support
      const { AzureTTS } = await import('./tts/azure-tts');
      const azureTTS = new AzureTTS();
      
      // Check if Azure is available, otherwise fallback
      const isAvailable = await azureTTS.isAvailable();
      if (!isAvailable) {
        console.warn('[VOICE+SSML+AZURE] ⚠️  Azure TTS not available, using fallback (no visemes)');
        const result = await ttsRouter.synthesize(ssml, { languageCode: language, isSSML: true }, 'avatar');
        return { audio: result.audioBuffer, visemes: [] };
      }
      
      // Call Azure's synthesizeWithVisemes method directly
      const result = await azureTTS.synthesizeWithVisemes(ssml, { languageCode: language });
      
      console.log(`[VOICE+SSML+AZURE] ✅ Generated ${result.audio.length} bytes audio from Azure`);
      console.log(`[VOICE+SSML+AZURE] ✅ Received ${result.visemes.length} visemes from Azure TTS`);
      
      // Convert Azure visemes to Unity format
      const unityVisemes = result.visemes.map((v) => ({
        time: v.audioOffset / 10000, // Convert 100ns units to milliseconds
        type: 'viseme',
        value: v.visemeId.toString()
      }));
      
      return { 
        audio: result.audio, 
        visemes: unityVisemes
      };
    } catch (error) {
      console.error('[VOICE+SSML+AZURE] Error:', error);
      throw error;
    }
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
   * Real-time streaming transcription (for future voice chat)
   * Using AssemblyAI real-time API
   */
  async startRealtimeTranscription(
    language: 'hi' | 'en' = 'en',
    onTranscript: (text: string) => void
  ) {
    try {
      const transcriber = assemblyAI.realtime.transcriber({
        sampleRate: 16000,
        encoding: 'pcm_s16le',
      });
      
      transcriber.on('transcript', (transcript) => {
        if (transcript.text) {
          onTranscript(transcript.text);
        }
      });
      
      transcriber.on('error', (error) => {
        console.error('[VOICE] Real-time error:', error);
      });
      
      await transcriber.connect();
      
      console.log('[VOICE] ✅ Real-time transcription started');
      
      return transcriber;
    } catch (error) {
      console.error('[VOICE] Real-time setup error:', error);
      throw new Error('Failed to start real-time transcription');
    }
  }
}

export const voiceService = new VoiceService();
