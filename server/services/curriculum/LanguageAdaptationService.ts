import { languageDetectionEngine, DetectedLanguage, LanguageDetectionResult } from '../LanguageDetectionEngine';
import memoizee from 'memoizee';

export type LanguageMode = 'english' | 'hindi' | 'hinglish' | 'adaptive';
export type ScriptType = 'roman' | 'devanagari' | 'mixed';

export interface LanguageProfile {
  preferredLanguage: LanguageMode;
  currentLanguage: DetectedLanguage;
  scriptPreference: ScriptType;
  formalityLevel: 'formal' | 'casual' | 'academic';
  technicalTermHandling: 'preserve' | 'translate' | 'explain';
  codeSwitchingAllowed: boolean;
}

export interface AdaptedContent {
  text: string;
  language: DetectedLanguage;
  script: ScriptType;
  ttsVoice: string;
  ttsLanguageCode: string;
  ssmlModifications: SSMLModification[];
  adaptationNotes: string[];
}

interface SSMLModification {
  type: 'prosody' | 'phoneme' | 'lang' | 'break';
  original: string;
  modified: string;
  reason: string;
}

interface TransliterationRule {
  pattern: RegExp;
  replacement: string;
  context?: string;
}

interface LanguageContext {
  sessionLanguageHistory: DetectedLanguage[];
  userPreference?: LanguageMode;
  subject?: string;
  classLevel?: number;
  region?: string;
}

const TECHNICAL_TERMS: Record<string, { hindi: string; hindiRoman: string; explanation?: string }> = {
  velocity: { hindi: 'वेग', hindiRoman: 'veg', explanation: 'speed with direction' },
  acceleration: { hindi: 'त्वरण', hindiRoman: 'tvaran', explanation: 'rate of change of velocity' },
  momentum: { hindi: 'संवेग', hindiRoman: 'sanveg' },
  force: { hindi: 'बल', hindiRoman: 'bal' },
  energy: { hindi: 'ऊर्जा', hindiRoman: 'oorja' },
  power: { hindi: 'शक्ति', hindiRoman: 'shakti' },
  mass: { hindi: 'द्रव्यमान', hindiRoman: 'dravyaman' },
  weight: { hindi: 'भार', hindiRoman: 'bhaar' },
  gravity: { hindi: 'गुरुत्वाकर्षण', hindiRoman: 'gurutvakarshan' },
  friction: { hindi: 'घर्षण', hindiRoman: 'gharshan' },
  work: { hindi: 'कार्य', hindiRoman: 'kaarya' },
  potential: { hindi: 'स्थितिज', hindiRoman: 'sthitij' },
  kinetic: { hindi: 'गतिज', hindiRoman: 'gatij' },
  frequency: { hindi: 'आवृत्ति', hindiRoman: 'aavritti' },
  wavelength: { hindi: 'तरंगदैर्ध्य', hindiRoman: 'tarangdairghya' },
  amplitude: { hindi: 'आयाम', hindiRoman: 'aayaam' },
  pressure: { hindi: 'दाब', hindiRoman: 'daab' },
  temperature: { hindi: 'तापमान', hindiRoman: 'taapman' },
  volume: { hindi: 'आयतन', hindiRoman: 'aayatan' },
  density: { hindi: 'घनत्व', hindiRoman: 'ghanatva' },
  element: { hindi: 'तत्व', hindiRoman: 'tatva' },
  compound: { hindi: 'यौगिक', hindiRoman: 'yaugik' },
  mixture: { hindi: 'मिश्रण', hindiRoman: 'mishran' },
  atom: { hindi: 'परमाणु', hindiRoman: 'parmanu' },
  molecule: { hindi: 'अणु', hindiRoman: 'anu' },
  electron: { hindi: 'इलेक्ट्रॉन', hindiRoman: 'electron' },
  proton: { hindi: 'प्रोटॉन', hindiRoman: 'proton' },
  neutron: { hindi: 'न्यूट्रॉन', hindiRoman: 'neutron' },
  cell: { hindi: 'कोशिका', hindiRoman: 'koshika' },
  tissue: { hindi: 'ऊतक', hindiRoman: 'ootak' },
  organ: { hindi: 'अंग', hindiRoman: 'ang' },
  organism: { hindi: 'जीव', hindiRoman: 'jeev' },
  photosynthesis: { hindi: 'प्रकाश संश्लेषण', hindiRoman: 'prakash sanshleshan' },
  respiration: { hindi: 'श्वसन', hindiRoman: 'shvasan' },
  digestion: { hindi: 'पाचन', hindiRoman: 'pachan' },
  equation: { hindi: 'समीकरण', hindiRoman: 'samikaran' },
  function: { hindi: 'फलन', hindiRoman: 'phalan' },
  derivative: { hindi: 'अवकलज', hindiRoman: 'avkalaj' },
  integral: { hindi: 'समाकल', hindiRoman: 'samakal' },
  matrix: { hindi: 'मैट्रिक्स', hindiRoman: 'matrix' },
  vector: { hindi: 'सदिश', hindiRoman: 'sadish' },
  scalar: { hindi: 'अदिश', hindiRoman: 'adish' },
  angle: { hindi: 'कोण', hindiRoman: 'kon' },
  triangle: { hindi: 'त्रिभुज', hindiRoman: 'tribhuj' },
  circle: { hindi: 'वृत्त', hindiRoman: 'vritt' },
  theorem: { hindi: 'प्रमेय', hindiRoman: 'pramey' },
  proof: { hindi: 'प्रमाण', hindiRoman: 'pramaan' },
  hypothesis: { hindi: 'परिकल्पना', hindiRoman: 'parikalpana' },
};

const CASUAL_HINDI_PHRASES: Record<string, string> = {
  'let us': 'chalo',
  'let me': 'main',
  'you see': 'dekho',
  'understand': 'samajh',
  'correct': 'sahi',
  'right': 'theek',
  'okay': 'theek hai',
  'good': 'achha',
  'very good': 'bahut achha',
  'excellent': 'bahut badiya',
  'exactly': 'bilkul',
  'think about': 'socho',
  'remember': 'yaad karo',
  'notice': 'dhyan do',
  'important': 'zaroori',
  'easy': 'aasaan',
  'difficult': 'mushkil',
  'simple': 'seedha',
  'complex': 'complicated',
  'first': 'pehle',
  'then': 'phir',
  'next': 'agle',
  'finally': 'aakhir mein',
  'because': 'kyunki',
  'therefore': 'isliye',
  'so': 'toh',
  'but': 'lekin',
  'and': 'aur',
  'or': 'ya',
  'if': 'agar',
  'when': 'jab',
  'how': 'kaise',
  'why': 'kyun',
  'what': 'kya',
  'which': 'kaun sa',
  'this': 'yeh',
  'that': 'woh',
  'here': 'yahan',
  'there': 'wahan',
};

const TTS_VOICE_MAP: Record<DetectedLanguage, { azure: string; code: string; fallback: string }> = {
  english: { azure: 'en-IN-NeerjaNeural', code: 'en-IN', fallback: 'en-US-JennyNeural' },
  hindi: { azure: 'hi-IN-AartiNeural', code: 'hi-IN', fallback: 'hi-IN-SwaraNeural' },
  hinglish: { azure: 'en-IN-NeerjaNeural', code: 'en-IN', fallback: 'hi-IN-AartiNeural' },
};

export class LanguageAdaptationService {
  private sessionHistory: Map<string, DetectedLanguage[]> = new Map();
  private userProfiles: Map<string, LanguageProfile> = new Map();

  private memoizedDetection = memoizee(
    async (text: string, context?: LanguageContext) => {
      return languageDetectionEngine.detectLanguage(text, {
        conversationHistory: context?.sessionLanguageHistory?.map(l => ({ language: l })),
        userPreference: context?.userPreference !== 'adaptive' ? context?.userPreference as DetectedLanguage : undefined,
      });
    },
    { maxAge: 60000, max: 100 }
  );

  async getLanguageProfile(userId: string, currentText?: string): Promise<LanguageProfile> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        preferredLanguage: 'adaptive',
        currentLanguage: 'english',
        scriptPreference: 'roman',
        formalityLevel: 'casual',
        technicalTermHandling: 'preserve',
        codeSwitchingAllowed: true,
      };
      this.userProfiles.set(userId, profile);
    }

    if (currentText) {
      const detection = await this.memoizedDetection(currentText, {
        sessionLanguageHistory: this.sessionHistory.get(userId) || [],
        userPreference: profile.preferredLanguage,
      });
      profile.currentLanguage = detection.language;
      
      this.updateSessionHistory(userId, detection.language);
    }

    return profile;
  }

  updateUserProfile(userId: string, updates: Partial<LanguageProfile>): void {
    const current = this.userProfiles.get(userId) || {
      preferredLanguage: 'adaptive' as LanguageMode,
      currentLanguage: 'english' as DetectedLanguage,
      scriptPreference: 'roman' as ScriptType,
      formalityLevel: 'casual' as const,
      technicalTermHandling: 'preserve' as const,
      codeSwitchingAllowed: true,
    };
    this.userProfiles.set(userId, { ...current, ...updates });
  }

  private updateSessionHistory(userId: string, language: DetectedLanguage): void {
    const history = this.sessionHistory.get(userId) || [];
    history.push(language);
    if (history.length > 20) {
      history.shift();
    }
    this.sessionHistory.set(userId, history);
  }

  async adaptContent(
    content: string,
    profile: LanguageProfile,
    context?: { subject?: string; classLevel?: number; examTarget?: string }
  ): Promise<AdaptedContent> {
    const adaptationNotes: string[] = [];
    const ssmlModifications: SSMLModification[] = [];
    let adaptedText = content;

    const detection = await languageDetectionEngine.detectLanguage(content);
    
    let targetLanguage: DetectedLanguage;
    let detectedScript: ScriptType;
    
    if (detection.confidence >= 0.6) {
      targetLanguage = profile.preferredLanguage === 'adaptive' 
        ? detection.language 
        : profile.preferredLanguage as DetectedLanguage;
      detectedScript = this.detectScriptFromAnalysis(detection.analysis.lexical);
    } else {
      targetLanguage = profile.currentLanguage || 'english';
      detectedScript = profile.scriptPreference || 'roman';
      adaptationNotes.push(`Low confidence detection (${Math.round(detection.confidence * 100)}%), using profile defaults: ${targetLanguage}/${detectedScript}`);
    }

    if (targetLanguage === 'hinglish' || (targetLanguage === 'hindi' && profile.scriptPreference === 'roman')) {
      adaptedText = this.applyHinglishAdaptation(adaptedText, profile, adaptationNotes);
    }

    if (profile.technicalTermHandling !== 'preserve') {
      adaptedText = this.handleTechnicalTerms(adaptedText, targetLanguage, profile, adaptationNotes);
    }

    if (profile.formalityLevel === 'casual' && (targetLanguage === 'hinglish' || targetLanguage === 'hindi')) {
      adaptedText = this.applyCasualTone(adaptedText, adaptationNotes);
    }

    const codeSwitchParts = this.detectCodeSwitchingWithAnalysis(adaptedText, detection);
    for (const part of codeSwitchParts) {
      if (part.language !== targetLanguage && part.confidence > 0.7) {
        ssmlModifications.push({
          type: 'lang',
          original: part.text,
          modified: `<lang xml:lang="${part.language === 'hindi' ? 'hi-IN' : 'en-IN'}">${part.text}</lang>`,
          reason: `Code-switch to ${part.language} (confidence: ${Math.round(part.confidence * 100)}%)`,
        });
      }
    }

    const analysisForVoice = detection.confidence >= 0.6 ? detection.analysis : null;
    const effectiveVoice = this.selectTTSVoice(targetLanguage, detectedScript, analysisForVoice);
    
    return {
      text: adaptedText,
      language: targetLanguage,
      script: detectedScript,
      ttsVoice: effectiveVoice.voice,
      ttsLanguageCode: effectiveVoice.code,
      ssmlModifications,
      adaptationNotes,
    };
  }

  private selectTTSVoice(
    language: DetectedLanguage,
    script: ScriptType,
    analysis: any
  ): { voice: string; code: string } {
    if (language === 'hindi' && script === 'devanagari') {
      return { voice: 'hi-IN-AartiNeural', code: 'hi-IN' };
    }
    
    if (language === 'hinglish') {
      const hindiRatio = analysis?.lexical?.devanagariRatio ?? 0;
      if (hindiRatio > 0.4) {
        return { voice: 'hi-IN-AartiNeural', code: 'hi-IN' };
      }
      return { voice: 'en-IN-NeerjaNeural', code: 'en-IN' };
    }
    
    const config = TTS_VOICE_MAP[language] || TTS_VOICE_MAP.english;
    return { voice: config.azure, code: config.code };
  }

  private detectCodeSwitchingWithAnalysis(
    text: string,
    detection: LanguageDetectionResult
  ): Array<{ text: string; language: DetectedLanguage; confidence: number }> {
    const parts: Array<{ text: string; language: DetectedLanguage; confidence: number }> = [];
    const sentences = text.split(/(?<=[.!?।])\s+/);

    for (const sentence of sentences) {
      const sentenceDetection = languageDetectionEngine.quickDetect(sentence);
      const hasDevanagari = /[\u0900-\u097F]/.test(sentence);
      const hasHindiWords = detection.analysis.lexical.hindiWords.some(
        word => sentence.toLowerCase().includes(word)
      );
      
      let confidence = 0.7;
      if (hasDevanagari) confidence = 0.95;
      else if (hasHindiWords) confidence = 0.85;
      
      parts.push({ 
        text: sentence, 
        language: sentenceDetection,
        confidence
      });
    }

    return parts;
  }

  private applyHinglishAdaptation(
    text: string,
    profile: LanguageProfile,
    notes: string[]
  ): string {
    let adapted = text;

    const hinglishInsertions = [
      { pattern: /\. Now,/gi, replacement: '. Ab,' },
      { pattern: /\. Let's/gi, replacement: '. Chalo' },
      { pattern: /\. See,/gi, replacement: '. Dekho,' },
      { pattern: /\. Think about/gi, replacement: '. Socho' },
      { pattern: /Right\?/gi, replacement: 'Theek hai na?' },
      { pattern: /Understand\?/gi, replacement: 'Samajh aaya?' },
      { pattern: /Got it\?/gi, replacement: 'Samajh gaye?' },
      { pattern: /\. So,/gi, replacement: '. Toh,' },
      { pattern: /\. Because/gi, replacement: '. Kyunki' },
      { pattern: /\. Remember/gi, replacement: '. Yaad rakho' },
      { pattern: /Very good!/gi, replacement: 'Bahut achha!' },
      { pattern: /Excellent!/gi, replacement: 'Bahut badiya!' },
      { pattern: /Well done!/gi, replacement: 'Shabash!' },
    ];

    for (const rule of hinglishInsertions) {
      if (rule.pattern.test(adapted)) {
        adapted = adapted.replace(rule.pattern, rule.replacement);
        notes.push(`Applied Hinglish phrase: ${rule.replacement}`);
      }
    }

    return adapted;
  }

  private handleTechnicalTerms(
    text: string,
    targetLanguage: DetectedLanguage,
    profile: LanguageProfile,
    notes: string[]
  ): string {
    let adapted = text;

    for (const [english, translations] of Object.entries(TECHNICAL_TERMS)) {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      
      if (regex.test(adapted)) {
        if (profile.technicalTermHandling === 'translate') {
          if (targetLanguage === 'hindi' && profile.scriptPreference === 'devanagari') {
            adapted = adapted.replace(regex, translations.hindi);
            notes.push(`Translated: ${english} → ${translations.hindi}`);
          } else if (targetLanguage === 'hindi' || targetLanguage === 'hinglish') {
            adapted = adapted.replace(regex, translations.hindiRoman);
            notes.push(`Translated: ${english} → ${translations.hindiRoman}`);
          }
        } else if (profile.technicalTermHandling === 'explain' && translations.explanation) {
          adapted = adapted.replace(regex, `${english} (${translations.explanation})`);
          notes.push(`Added explanation for: ${english}`);
        }
      }
    }

    return adapted;
  }

  private applyCasualTone(text: string, notes: string[]): string {
    let adapted = text;

    for (const [english, hindi] of Object.entries(CASUAL_HINDI_PHRASES)) {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      if (Math.random() < 0.3 && regex.test(adapted)) {
        adapted = adapted.replace(regex, hindi);
        notes.push(`Casualized: ${english} → ${hindi}`);
      }
    }

    return adapted;
  }

  private detectCodeSwitching(text: string): Array<{ text: string; language: DetectedLanguage }> {
    const parts: Array<{ text: string; language: DetectedLanguage }> = [];
    const sentences = text.split(/(?<=[.!?।])\s+/);

    for (const sentence of sentences) {
      const lang = languageDetectionEngine.quickDetect(sentence);
      parts.push({ text: sentence, language: lang });
    }

    return parts;
  }

  private detectScriptFromAnalysis(lexical: { devanagariCount: number; latinCount: number; devanagariRatio: number }): ScriptType {
    const devanagariRatio = lexical.devanagariRatio;
    
    if (devanagariRatio > 0.7) return 'devanagari';
    if (devanagariRatio < 0.2) return 'roman';
    return 'mixed';
  }

  private detectScript(text: string): ScriptType {
    const devanagariMatch = text.match(/[\u0900-\u097F]/g);
    const romanMatch = text.match(/[a-zA-Z]/g);
    
    const devanagariCount = devanagariMatch?.length || 0;
    const romanCount = romanMatch?.length || 0;
    const total = devanagariCount + romanCount;

    if (total === 0) return 'roman';
    
    const devanagariRatio = devanagariCount / total;
    
    if (devanagariRatio > 0.7) return 'devanagari';
    if (devanagariRatio < 0.3) return 'roman';
    return 'mixed';
  }

  generateLanguagePromptContext(profile: LanguageProfile): string {
    const parts: string[] = [];

    parts.push(`## Language Adaptation Context`);
    parts.push(`- Target Language: ${profile.currentLanguage}`);
    parts.push(`- Preferred Mode: ${profile.preferredLanguage}`);
    parts.push(`- Script: ${profile.scriptPreference}`);
    parts.push(`- Formality: ${profile.formalityLevel}`);
    
    if (profile.currentLanguage === 'hinglish') {
      parts.push(`\n### Hinglish Guidelines:`);
      parts.push(`- Use natural code-mixing between Hindi and English`);
      parts.push(`- Keep technical terms in English unless explaining`);
      parts.push(`- Use casual Hindi connectors: toh, ab, dekho, samajh aaya?`);
      parts.push(`- Maintain encouraging tone: bahut achha, shabash, bilkul sahi`);
    }

    if (profile.currentLanguage === 'hindi') {
      parts.push(`\n### Hindi Guidelines:`);
      if (profile.scriptPreference === 'devanagari') {
        parts.push(`- Use Devanagari script primarily`);
        parts.push(`- Technical terms can remain in English with Hindi explanation`);
      } else {
        parts.push(`- Use Romanized Hindi (Hindi in English letters)`);
        parts.push(`- Example: "Yeh bahut zaroori concept hai"`);
      }
    }

    if (profile.formalityLevel === 'academic') {
      parts.push(`\n### Academic Tone:`);
      parts.push(`- Use formal language constructs`);
      parts.push(`- Maintain precision in terminology`);
      parts.push(`- Reference standard textbook conventions`);
    }

    return parts.join('\n');
  }

  getTTSConfiguration(profile: LanguageProfile): {
    voice: string;
    languageCode: string;
    rate: string;
    pitch: string;
  } {
    const config = TTS_VOICE_MAP[profile.currentLanguage];
    
    return {
      voice: config.azure,
      languageCode: config.code,
      rate: profile.formalityLevel === 'academic' ? 'slow' : 'medium',
      pitch: 'medium',
    };
  }

  getSessionDominantLanguage(userId: string): DetectedLanguage {
    const history = this.sessionHistory.get(userId) || [];
    if (history.length === 0) return 'english';

    const counts: Record<DetectedLanguage, number> = { english: 0, hindi: 0, hinglish: 0 };
    for (const lang of history.slice(-10)) {
      counts[lang]++;
    }

    return Object.entries(counts).reduce((a, b) => counts[a[0] as DetectedLanguage] > counts[b[0] as DetectedLanguage] ? a : b)[0] as DetectedLanguage;
  }

  shouldSwitchLanguage(userId: string, currentInput: string): { switch: boolean; reason?: string } {
    const history = this.sessionHistory.get(userId) || [];
    if (history.length < 3) return { switch: false };

    const currentLang = languageDetectionEngine.quickDetect(currentInput);
    const recentLangs = history.slice(-3);
    
    const allSame = recentLangs.every(l => l === recentLangs[0]);
    if (allSame && currentLang !== recentLangs[0]) {
      return { 
        switch: true, 
        reason: `User switched from ${recentLangs[0]} to ${currentLang}` 
      };
    }

    return { switch: false };
  }

  clearSession(userId: string): void {
    this.sessionHistory.delete(userId);
  }
}

export const languageAdaptationService = new LanguageAdaptationService();
