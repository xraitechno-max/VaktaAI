/**
 * TTS Text Processor
 * Transforms AI responses into natural, conversational speech
 * Removes emojis, cleans punctuation, adds natural pauses
 * 
 * CRITICAL: Math-to-speech conversion must run BEFORE punctuation cleanup
 * to prevent (1/2) from becoming "ek 2" instead of "one half"
 */

export class TTSTextProcessor {

  /**
   * Convert math expressions to natural speech (runs BEFORE punctuation cleanup)
   * Handles fractions, exponents, and common physics/chemistry formulas
   */
  private static mathToSpeech(text: string): string {
    let result = text;

    // 1. Common fractions in parentheses: (1/2), (1/3), (1/4), (3/4), etc.
    const fractionMap: { [key: string]: string } = {
      '(1/2)': 'one half',
      '(1/3)': 'one third',
      '(1/4)': 'one fourth',
      '(2/3)': 'two thirds',
      '(3/4)': 'three fourths',
      '(1/5)': 'one fifth',
      '(2/5)': 'two fifths',
      '(3/5)': 'three fifths',
      '(4/5)': 'four fifths',
    };
    for (const [frac, spoken] of Object.entries(fractionMap)) {
      result = result.split(frac).join(spoken);
    }

    // 2. General fraction pattern: (a/b) where a and b are digits
    result = result.replace(/\((\d+)\/(\d+)\)/g, (_, num, denom) => {
      return `${num} by ${denom}`;
    });

    // 3. Superscript exponents: ², ³, ⁴, etc.
    result = result
      .replace(/(\w)²/g, '$1 squared')
      .replace(/(\w)³/g, '$1 cubed')
      .replace(/(\w)⁴/g, '$1 to the power 4')
      .replace(/(\w)⁵/g, '$1 to the power 5')
      .replace(/(\w)⁶/g, '$1 to the power 6')
      .replace(/(\w)⁷/g, '$1 to the power 7')
      .replace(/(\w)⁸/g, '$1 to the power 8')
      .replace(/(\w)⁹/g, '$1 to the power 9');

    // 4. Caret exponent notation: x^2, t^3, etc.
    result = result
      .replace(/(\w)\^2\b/g, '$1 squared')
      .replace(/(\w)\^3\b/g, '$1 cubed')
      .replace(/(\w)\^(\d+)/g, '$1 to the power $2');

    // 5. Common physics formulas (preserve context)
    result = result
      .replace(/\bv\s*=\s*u\s*\+\s*at\b/gi, 'v equals u plus a t')
      .replace(/\bs\s*=\s*ut\s*\+\s*one half\s*at\s*squared\b/gi, 's equals u t plus one half a t squared')
      .replace(/\bv\s*squared\s*=\s*u\s*squared\s*\+\s*2as\b/gi, 'v squared equals u squared plus 2 a s')
      .replace(/\bF\s*=\s*ma\b/g, 'F equals m a')
      .replace(/\bE\s*=\s*mc\s*squared\b/gi, 'E equals m c squared')
      .replace(/\bKE\s*=\s*one half\s*m\s*v\s*squared\b/gi, 'kinetic energy equals one half m v squared')
      .replace(/\bPE\s*=\s*mgh\b/gi, 'potential energy equals m g h')
      .replace(/\bPV\s*=\s*nRT\b/gi, 'P V equals n R T');

    // 6. Subscripts: H₂O, CO₂, etc.
    result = result
      .replace(/H₂O/g, 'H 2 O')
      .replace(/CO₂/g, 'C O 2')
      .replace(/O₂/g, 'O 2')
      .replace(/H₂/g, 'H 2')
      .replace(/N₂/g, 'N 2')
      .replace(/SO₄/g, 'S O 4')
      .replace(/NO₃/g, 'N O 3')
      .replace(/NH₄/g, 'N H 4');

    // 7. Mathematical symbols
    result = result
      .replace(/≈/g, 'approximately equals')
      .replace(/≠/g, 'not equal to')
      .replace(/≤/g, 'less than or equal to')
      .replace(/≥/g, 'greater than or equal to')
      .replace(/∞/g, 'infinity')
      .replace(/√/g, 'square root of')
      .replace(/∑/g, 'sum of')
      .replace(/∫/g, 'integral of')
      .replace(/Δ/g, 'delta')
      .replace(/π/g, 'pi')
      .replace(/θ/g, 'theta')
      .replace(/α/g, 'alpha')
      .replace(/β/g, 'beta')
      .replace(/γ/g, 'gamma')
      .replace(/μ/g, 'mu')
      .replace(/λ/g, 'lambda')
      .replace(/ω/g, 'omega');

    return result;
  }

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
   * NOTE: This runs AFTER mathToSpeech, so fractions are already converted
   */
  private static cleanPunctuation(text: string): string {
    return text
      .replace(/[\\|_*#`~]/g, ' ')    // Remove these completely (NOT forward slash - needed for remaining fractions)
      .replace(/[\[\]{}()<>]/g, '')   // Remove brackets and parentheses (safe after math conversion)
      .replace(/[""'']/g, '"')        // Normalize quotes
      .replace(/\s+/g, ' ')           // Multiple spaces to single
      .replace(/\.{2,}/g, '.')        // Multiple dots to single
      .replace(/!{2,}/g, '!')         // Multiple ! to single
      .replace(/\?{2,}/g, '?')        // Multiple ? to single
      .replace(/,{2,}/g, ',')         // Multiple commas to single
      .replace(/\s*([.,!?।])\s*/g, '$1 ')  // Clean spacing around punctuation
      .replace(/\//g, ' by ')         // Convert remaining slashes to "by" (e.g., km/h -> km by h)
      .trim();
  }

  /**
   * Convert written numbers to words for natural speech (Hindi)
   * NOTE: Only converts truly standalone numbers, not those in math/chemical context
   * SKIP digits that appear after element letters (H, O, C, N, S) or in formula context
   */
  private static normalizeNumbers(text: string): string {
    const numberWords: {[key: string]: string} = {
      '1': 'ek', '2': 'do', '3': 'teen', '4': 'char', '5': 'paanch',
      '6': 'chhe', '7': 'saat', '8': 'aath', '9': 'nau', '10': 'das',
      '11': 'gyarah', '12': 'barah', '13': 'terah', '14': 'chaudah', '15': 'pandrah',
      '16': 'solah', '17': 'satrah', '18': 'atharah', '19': 'unnis', '20': 'bees'
    };

    // Only convert truly standalone numbers:
    // - Must be preceded by start of string, whitespace, or sentence punctuation (not letters or element symbols)
    // - Must be followed by end of string, whitespace, or sentence punctuation (not letters)
    // - Skip chemical formula patterns like "H 2 O", "C O 2" where digit follows element letter
    return text.replace(/(?<=[.!?,;:\s]|^)(\d+)(?=[.!?,;:\s]|$)/g, (match, num, offset, fullText) => {
      // Skip if preceded by single capital letter + space (chemical formula pattern)
      const before = fullText.substring(Math.max(0, offset - 3), offset);
      if (/[A-Z]\s$/.test(before)) {
        return match; // Keep as digit for chemical formulas
      }
      
      // Skip if followed by space + single capital letter (chemical formula pattern)
      const after = fullText.substring(offset + match.length, offset + match.length + 3);
      if (/^\s[A-Z](\s|$)/.test(after)) {
        return match; // Keep as digit for chemical formulas
      }
      
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

    // Step 1: MATH-TO-SPEECH FIRST (before any punctuation cleanup)
    processed = this.mathToSpeech(processed);

    // Step 2: Clean (safe now that math is converted)
    processed = this.removeEmojis(processed);
    processed = this.cleanPunctuation(processed);

    // Step 3: Make conversational (optional - can disable if AI already generates conversational text)
    processed = this.makeConversational(processed);
    processed = this.addFillerWords(processed);

    // Step 4: Normalize numbers (only standalone numbers now)
    processed = this.normalizeNumbers(processed);

    // Step 5: Add SSML pauses (if supported by TTS provider)
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

    // Step 1: MATH-TO-SPEECH FIRST (before any punctuation cleanup)
    processed = this.mathToSpeech(processed);

    // Step 2: Clean (safe now that math is converted)
    processed = this.removeEmojis(processed);
    processed = this.cleanPunctuation(processed);

    // Step 3: Normalize numbers (only standalone numbers now)
    processed = this.normalizeNumbers(processed);

    return processed.trim();
  }
}
