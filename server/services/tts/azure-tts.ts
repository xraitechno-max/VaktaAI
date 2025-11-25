import { TTSProvider, TTSOptions } from './types';
import { azureTtsService } from '../azureTtsService';
import { azureCircuitBreaker } from '../circuitBreaker';

/**
 * 🎯 Azure TTS Provider - Premium Indian voices
 * 
 * Features:
 * - Indian female voices: en-IN-NeerjaNeural (empathetic style), hi-IN-AartiNeural
 * - 48kHz quality audio
 * - SSML support for prosody control
 * - Bilingual support (English + Hindi)
 */
export class AzureTTS implements TTSProvider {
  name = 'azure';

  /**
   * Synthesize speech using Azure TTS with circuit breaker protection
   * Supports both plain text and SSML input
   */
  async synthesize(text: string, options: TTSOptions = {}): Promise<Buffer> {
    // Use circuit breaker to protect against repeated failures
    return azureCircuitBreaker.execute(async () => {
      // Check if input is SSML
      if (options.isSSML) {
        console.log('[Azure TTS] Synthesizing SSML:', {
          textLength: text.length,
          languageCode: options.languageCode
        });

        // 🎯 CRITICAL: Wrap SSML with Azure-required tags
        // Azure needs: <speak xml:lang="..."><voice name="...">content</voice></speak>
        // Incoming SSML is just: <speak>content</speak>
        
        // Extract content from <speak> tags
        const content = text.replace(/<\/?speak[^>]*>/g, '').trim();
        
        // Get appropriate voice based on language
        const voice = this.getVoiceForLanguage(options.languageCode);
        const lang = voice.startsWith('hi-') ? 'hi-IN' : 'en-IN';
        
        // Build Azure-compliant SSML
        const azureSSML = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}"><voice name="${voice}">${content}</voice></speak>`;
        
        console.log('[Azure TTS] ✅ Wrapped SSML with voice:', { voice, lang, contentLength: content.length });
        
        const result = await azureTtsService.synthesizeSpeechFromSSML(azureSSML);
        return result.audio;
      }

      // Plain text synthesis
      // Map languageCode to appropriate Azure voice
      const voice = this.getVoiceForLanguage(options.languageCode);
      
      // Map speed to Azure rate format
      const rate = this.mapSpeedToRate(options.speed);
      
      // Map pitch to Azure format
      const pitch = this.mapPitchToAzure(options.pitch);

      console.log('[Azure TTS] Synthesizing plain text:', {
        textLength: text.length,
        voice,
        rate,
        pitch,
        languageCode: options.languageCode
      });

      // Call Azure TTS service
      const result = await azureTtsService.synthesizeSpeech(text, {
        voice,
        style: 'empathetic', // Best for educational content
        rate,
        pitch,
      });

      return result.audio;
    });
  }

  /**
   * 🎯 Synthesize SSML with visemes for Unity lip-sync
   * Returns both audio and viseme timing data
   */
  async synthesizeWithVisemes(
    ssml: string,
    options: TTSOptions = {}
  ): Promise<{ audio: Buffer; visemes: Array<{ audioOffset: number; visemeId: number }> }> {
    return azureCircuitBreaker.execute(async () => {
      // Extract content from <speak> tags
      const content = ssml.replace(/<\/?speak[^>]*>/g, '').trim();
      
      // Get appropriate voice based on language
      const voice = this.getVoiceForLanguage(options.languageCode);
      const lang = voice.startsWith('hi-') ? 'hi-IN' : 'en-IN';
      
      // Build Azure-compliant SSML
      const azureSSML = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}"><voice name="${voice}">${content}</voice></speak>`;
      
      console.log('[Azure TTS+VISEMES] Synthesizing with voice:', { voice, lang, contentLength: content.length });
      
      // Synthesize with visemes enabled
      const result = await azureTtsService.synthesizeSpeechFromSSML(azureSSML, true);
      
      console.log(`[Azure TTS+VISEMES] ✅ Generated ${result.audio.length} bytes + ${result.visemes?.length || 0} visemes`);
      
      return {
        audio: result.audio,
        visemes: result.visemes || []
      };
    });
  }

  /**
   * Check if Azure TTS is available (credentials configured)
   */
  async isAvailable(): Promise<boolean> {
    return azureTtsService.isAvailable();
  }

  /**
   * Map language code to Azure voice
   */
  private getVoiceForLanguage(languageCode?: string): string {
    if (!languageCode) return 'en-IN-NeerjaNeural'; // Default

    // Map language codes to Azure voices
    const voiceMap: Record<string, string> = {
      'en': 'en-IN-NeerjaNeural',
      'en-IN': 'en-IN-NeerjaNeural',
      'hi': 'hi-IN-AartiNeural',
      'hi-IN': 'hi-IN-AartiNeural',
    };

    return voiceMap[languageCode] || 'en-IN-NeerjaNeural';
  }

  /**
   * Map speed (0.5 - 2.0) to Azure rate format
   */
  private mapSpeedToRate(speed?: number): string {
    if (!speed || speed === 1.0) return '1.0';
    
    // Azure accepts rate as "1.0", "+10%", "-20%", etc.
    const percentage = Math.round((speed - 1.0) * 100);
    
    if (percentage === 0) return '1.0';
    if (percentage > 0) return `+${percentage}%`;
    return `${percentage}%`;
  }

  /**
   * Map pitch (0.5 - 2.0) to Azure format
   */
  private mapPitchToAzure(pitch?: number): string {
    if (!pitch || pitch === 1.0) return 'default';
    
    // Azure accepts pitch as "default", "+5Hz", "-10%", etc.
    const percentage = Math.round((pitch - 1.0) * 100);
    
    if (percentage === 0) return 'default';
    if (percentage > 0) return `+${percentage}%`;
    return `${percentage}%`;
  }
}
