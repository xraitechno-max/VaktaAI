/**
 * TTS Text Processor
 * Transforms AI responses into natural, conversational speech
 * Removes emojis, cleans punctuation, adds natural pauses
 */

export class TTSTextProcessor {

  /**
   * Remove all emojis from text (comprehensive regex)
   */
  private static removeEmojis(text: string): string {
    return text
      // Emoticons
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      // Symbols & Pictographs
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      // Transport & Map Symbols
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      // Flags
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
      // Miscellaneous Symbols
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      // Dingbats
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      // Supplemental Symbols
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
      // Regional Indicator Symbols
      .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '');
  }

  /**
   * Remove special punctuation that shouldn't be read aloud
   */
  private static cleanPunctuation(text: string): string {
    return text
      .replace(/[\/\\|_*#`~]/g, ' ')  // Remove these completely
      .replace(/[\[\]{}()<>]/g, '')   // Remove brackets and parentheses
      .replace(/[""'']/g, '"')        // Normalize quotes
      .replace(/\s+/g, ' ')           // Multiple spaces to single
      .replace(/\.{2,}/g, '.')        // Multiple dots to single
      .replace(/!{2,}/g, '!')         // Multiple ! to single
      .replace(/\?{2,}/g, '?')        // Multiple ? to single
      .replace(/,{2,}/g, ',')         // Multiple commas to single
      .replace(/\s*([.,!?।])\s*/g, '$1 ')  // Clean spacing around punctuation
      .trim();
  }

  /**
   * Convert written numbers to words for natural speech (Hindi)
   */
  private static normalizeNumbers(text: string): string {
    const numberWords: {[key: string]: string} = {
      '1': 'ek', '2': 'do', '3': 'teen', '4': 'char', '5': 'paanch',
      '6': 'chhe', '7': 'saat', '8': 'aath', '9': 'nau', '10': 'das',
      '11': 'gyarah', '12': 'barah', '13': 'terah', '14': 'chaudah', '15': 'pandrah',
      '16': 'solah', '17': 'satrah', '18': 'atharah', '19': 'unnis', '20': 'bees'
    };

    return text.replace(/\b(\d+)\b/g, (match) => {
      return numberWords[match] || match;
    });
  }

  /**
   * Add natural pauses using SSML
   */
  private static addNaturalPauses(text: string): string {
    return text
      .replace(/\. /g, '.<break time="500ms"/> ')    // Pause after sentences
      .replace(/\? /g, '?<break time="600ms"/> ')     // Longer pause after questions
      .replace(/! /g, '!<break time="500ms"/> ')      // Pause after excitement
      .replace(/\, /g, ',<break time="300ms"/> ')     // Short pause after commas
      .replace(/\: /g, ':<break time="400ms"/> ')     // Medium pause after colon
      .replace(/\; /g, ';<break time="400ms"/> ');    // Medium pause after semicolon
  }

  /**
   * Convert to conversational Hindi/Hinglish style
   */
  private static makeConversational(text: string): string {
    // Replace formal words with conversational ones
    const conversions: {[key: string]: string} = {
      'therefore': 'toh',
      'however': 'lekin',
      'moreover': 'aur haan',
      'furthermore': 'aur bhi',
      'in conclusion': 'toh finally',
      'let me explain': 'main samjhata hoon',
      'you need to understand': 'dekho',
      'it is important to note': 'yaad rakhna',
      'for example': 'jaise ki',
      'such as': 'jaise',
      'in other words': 'matlab',
      'basically': 'basically',
      'actually': 'actually',
    };

    let result = text;
    for (const [formal, casual] of Object.entries(conversions)) {
      const regex = new RegExp(formal, 'gi');
      result = result.replace(regex, casual);
    }

    return result;
  }

  /**
   * Add thinking words for natural flow (use sparingly)
   */
  private static addFillerWords(text: string): string {
    // Add occasional "toh", "dekho" for naturalness
    const sentences = text.split(/\.\s+/);
    return sentences.map((sentence, i) => {
      // Only add fillers to longer sentences occasionally
      if (i % 3 === 0 && sentence.length > 50 && !sentence.toLowerCase().startsWith('toh')) {
        return 'Toh ' + sentence;
      }
      if (i % 4 === 0 && sentence.length > 50 && !sentence.toLowerCase().startsWith('dekho')) {
        return 'Dekho, ' + sentence;
      }
      return sentence;
    }).join('. ');
  }

  /**
   * Main processing function
   * @param text - Raw AI response text
   * @param useSSML - Whether to wrap in SSML and add pause tags
   * @returns Processed text ready for TTS
   */
  public static processForTTS(text: string, useSSML: boolean = true): string {
    if (!text || text.trim().length === 0) {
      return '';
    }

    let processed = text;

    // Step 1: Clean
    processed = this.removeEmojis(processed);
    processed = this.cleanPunctuation(processed);

    // Step 2: Make conversational (optional - can disable if AI already generates conversational text)
    processed = this.makeConversational(processed);
    processed = this.addFillerWords(processed);

    // Step 3: Normalize
    processed = this.normalizeNumbers(processed);

    // Step 4: Add SSML pauses (if supported by TTS provider)
    if (useSSML) {
      processed = this.addNaturalPauses(processed);
      processed = `<speak>${processed}</speak>`;
    }

    return processed.trim();
  }

  /**
   * Lightweight processing without SSML (for TTS providers that don't support SSML)
   * @param text - Raw AI response text
   * @returns Cleaned text without SSML tags
   */
  public static processForTTSLite(text: string): string {
    if (!text || text.trim().length === 0) {
      return '';
    }

    let processed = text;

    // Clean only
    processed = this.removeEmojis(processed);
    processed = this.cleanPunctuation(processed);
    processed = this.normalizeNumbers(processed);

    return processed.trim();
  }
}
