/**
 * AWS Polly Viseme → Unity Blendshape Mapping
 * 
 * Polly visemes: https://docs.aws.amazon.com/polly/latest/dg/viseme.html
 * Unity blendshapes: From avatar model (B_M_P, F_V, TH, etc.)
 */

export interface PhonemeData {
  time: number;
  blendshape: string;
  weight: number;
}

/**
 * Map AWS Polly viseme codes to Unity blendshape names
 */
const POLLY_TO_UNITY_VISEME_MAP: Record<string, string> = {
  // Silence
  'sil': 'sil',
  
  // Consonants
  'p': 'B_M_P',      // p, b, m (lips closed)
  'f': 'F_V',        // f, v (teeth on lower lip)
  'T': 'TH',         // th (tongue between teeth)
  't': 'T_L_D_N',    // t, d, n (tongue behind teeth)
  'S': 'Ch_J',       // sh, ch, j (wide lips)
  's': 'S_Z',        // s, z (narrow lips)
  'k': 'K_G_H_NG',   // k, g, ng (back of throat)
  'r': 'R',          // r (lips slightly rounded)
  
  // Vowels
  'a': 'Ah',         // ah (mouth wide open)
  '@': 'Er',         // er, schwa (neutral position)
  'e': 'EE',         // ee (smile, lips stretched)
  'E': 'AE',         // ae (mouth open, lips stretched)
  'i': 'IH',         // ih (slight smile)
  'o': 'Oh',         // oh (lips rounded)
  'u': 'W_OO',       // oo, w (lips very rounded)
};

/**
 * Convert Polly visemes to Unity phoneme sequence with timing
 * 🎯 OPTIMIZED: Natural lip-sync with jaw movement and smoothing
 */
export function mapPollyVisemesToUnityPhonemes(
  visemes: Array<{time: number; type: string; value: string}>
): PhonemeData[] {
  const phonemes: PhonemeData[] = [];

  // Visemes that require jaw opening (vowels + some consonants)
  const JAW_OPEN_VISEMES = ['a', 'E', 'e', 'i', 'o', 'u', '@'];

  // 🎯 SMOOTHING: Minimum phoneme duration to prevent rapid vibration
  const MIN_PHONEME_DURATION_MS = 80; // 80ms minimum - faster transitions for better word-level sync

  // Weight mapping for natural lip movement (INCREASED for clearer word-level sync)
  const getPhonemeWeight = (visemeCode: string): number => {
    if (visemeCode === 'sil') return 0;

    // 🎯 INCREASED WEIGHTS: More visible lip movement for better word sync
    // Vowels: Strong weight for clear mouth opening
    if (['a', 'E', 'e', 'i', 'o', 'u', '@'].includes(visemeCode)) {
      return 0.65; // Increased from 0.35 - clear vowel articulation
    }

    // Strong consonants: Medium-high weight
    if (['p', 'f', 'T', 't'].includes(visemeCode)) {
      return 0.55; // Increased from 0.30 - visible consonant shaping
    }

    // Soft consonants: Medium weight
    return 0.45; // Increased from 0.25 - noticeable movement
  };

  // Calculate jaw opening based on viseme type (DISABLED FOR NOW - Unity might not have JawOpen)
  const getJawOpening = (visemeCode: string): number => {
    // 🎯 DISABLED: Unity avatar might not have "JawOpen" blendshape
    // Jaw movement should be handled by vowel blendshapes themselves
    return 0; // Disabled jaw opening for now

    /* ORIGINAL CODE - Enable if Unity has JawOpen blendshape:
    if (!JAW_OPEN_VISEMES.includes(visemeCode)) return 0;

    // Wide open vowels (ah, ae)
    if (['a', 'E'].includes(visemeCode)) return 0.30;
    // Medium open vowels (oh, oo, ee)
    if (['o', 'u', 'e'].includes(visemeCode)) return 0.20;
    // Slight open (ih, er, consonants)
    return 0.10;
    */
  };

  // 🎯 TIMING SMOOTHING: Filter out phonemes that are too close together
  let lastPhonemeTime = -MIN_PHONEME_DURATION_MS;
  let lastBlendshape = 'sil';
  let lastWeight = 0;

  for (let i = 0; i < visemes.length; i++) {
    const viseme = visemes[i];
    const currentTime = viseme.time;

    // Skip phonemes that are too close to previous one (anti-vibration)
    if (currentTime - lastPhonemeTime < MIN_PHONEME_DURATION_MS && i > 0) {
      console.log(`[VISEME MAPPING] ⏭️ Skipping rapid phoneme at ${currentTime}ms (< ${MIN_PHONEME_DURATION_MS}ms gap)`);
      continue;
    }

    const unityBlendshape = POLLY_TO_UNITY_VISEME_MAP[viseme.value] || 'sil';
    const weight = getPhonemeWeight(viseme.value);
    const jawOpen = getJawOpening(viseme.value);

    // 🎯 SMOOTH TRANSITIONS: Add interpolation between different phonemes
    if (i > 0 && lastBlendshape !== 'sil' && unityBlendshape !== lastBlendshape) {
      // Add a transitional "ease-out" of previous phoneme (30ms before current)
      const transitionTime = currentTime - 30;
      if (transitionTime > lastPhonemeTime) {
        phonemes.push({
          time: transitionTime,
          blendshape: lastBlendshape,
          weight: lastWeight * 0.3, // Fade to 30% of previous weight
        });
      }
    }

    // Add main phoneme with reduced weight
    phonemes.push({
      time: currentTime,
      blendshape: unityBlendshape,
      weight: weight,
    });

    // Add jaw movement for vowels (separate blendshape) - currently disabled
    if (jawOpen > 0) {
      phonemes.push({
        time: currentTime,
        blendshape: 'JawOpen', // Unity jaw blendshape
        weight: jawOpen,
      });
    }

    lastPhonemeTime = currentTime;
    lastBlendshape = unityBlendshape;
    lastWeight = weight;
  }

  console.log(`[VISEME MAPPING] ✅ Smoothed ${visemes.length} Polly visemes → ${phonemes.length} Unity phonemes (${MIN_PHONEME_DURATION_MS}ms min gap)`);

  return phonemes;
}

/**
 * Get human-readable viseme description (for debugging)
 */
export function getVisemeDescription(pollyViseme: string): string {
  const descriptions: Record<string, string> = {
    'sil': 'Silence',
    'p': 'p, b, m sounds',
    'f': 'f, v sounds',
    'T': 'th sounds',
    't': 't, d, n sounds',
    'S': 'sh, ch, j sounds',
    's': 's, z sounds',
    'k': 'k, g, ng sounds',
    'r': 'r sounds',
    'a': 'ah sounds',
    '@': 'er sounds',
    'e': 'ee sounds',
    'E': 'ae sounds',
    'i': 'ih sounds',
    'o': 'oh sounds',
    'u': 'oo, w sounds',
  };
  
  return descriptions[pollyViseme] || 'Unknown';
}
