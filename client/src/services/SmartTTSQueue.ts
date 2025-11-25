/**
 * 🎤 Smart TTS Queue Manager
 * Validates avatar state before playing TTS
 * Tracks metrics and handles queue lifecycle
 */

import type { AvatarState } from '@/hooks/useAvatarState';
import type { UnityAvatarHandle } from '@/components/tutor/UnityAvatar';

interface TTSChunk {
  id: string;
  audio: string;           // Base64 audio data
  phonemes: Array<{
    time: number;
    blendshape: string;
    weight: number;
  }>;
  duration: number;         // Duration in milliseconds
  priority?: number;        // Optional priority (0-10)
  timestamp: number;        // When chunk was created
}

interface QueueMetrics {
  enqueued: number;
  played: number;
  rejected: number;
  errors: number;
  currentQueueLength: number;
}

/**
 * Smart TTS Queue Manager
 * Only plays TTS when avatar is in READY or PLAYING state
 */
export class SmartTTSQueue {
  private queue: TTSChunk[] = [];
  private avatarState: AvatarState = 'CLOSED';
  private avatarRef: React.MutableRefObject<UnityAvatarHandle | null>;
  private isProcessing = false;
  private currentlyPlaying: TTSChunk | null = null;

  // Metrics tracking
  private metrics: QueueMetrics = {
    enqueued: 0,
    played: 0,
    rejected: 0,
    errors: 0,
    currentQueueLength: 0
  };

  // Callbacks
  public onPlaybackStart?: (chunk: TTSChunk) => void;
  public onPlaybackComplete?: (chunk: TTSChunk) => void;
  public onQueueEmpty?: () => void;
  public onError?: (error: Error, chunk: TTSChunk) => void;

  constructor(avatarRef: React.MutableRefObject<UnityAvatarHandle | null>) {
    this.avatarRef = avatarRef;
  }

  /**
   * Enqueue TTS chunk with avatar state validation
   * Returns false if avatar not ready (chunk rejected)
   */
  enqueue(chunk: TTSChunk): boolean {
    // 🔒 VALIDATION: Check avatar state
    if (!this.canAcceptTTS()) {
      console.warn('[TTS Queue] ❌ Rejected - avatar not ready:', {
        avatarState: this.avatarState,
        chunkId: chunk.id,
        canAccept: this.canAcceptTTS()
      });

      this.metrics.rejected++;
      return false;
    }

    // Validate avatar ref
    if (!this.avatarRef.current || !this.avatarRef.current.isReady) {
      console.warn('[TTS Queue] ❌ Rejected - Unity not ready:', {
        chunkId: chunk.id,
        hasRef: !!this.avatarRef.current,
        isReady: this.avatarRef.current?.isReady
      });

      this.metrics.rejected++;
      return false;
    }

    // Add to queue
    this.queue.push({
      ...chunk,
      timestamp: chunk.timestamp || Date.now()
    });

    this.metrics.enqueued++;
    this.metrics.currentQueueLength = this.queue.length;

    console.log('[TTS Queue] ✅ Enqueued:', {
      id: chunk.id,
      queueLength: this.queue.length,
      avatarState: this.avatarState,
      duration: chunk.duration
    });

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }

    return true;
  }

  /**
   * Update avatar state from state machine
   */
  updateState(state: AvatarState): void {
    const previousState = this.avatarState;
    this.avatarState = state;

    console.log('[TTS Queue] 🔄 State updated:', {
      from: previousState,
      to: state,
      queueLength: this.queue.length
    });
  }

  /**
   * 🔥 Update avatar state from WebSocket ACK message
   * @param state - New avatar state from server
   * @param canAccept - Server-side canAcceptTTS flag (for validation)
   */
  updateAvatarState(state: AvatarState, canAccept: boolean): void {
    const previousState = this.avatarState;
    this.avatarState = state;

    console.log('[TTS Queue] 🎭 Avatar state updated from server:', {
      from: previousState,
      to: state,
      canAcceptTTS: canAccept,
      queueLength: this.queue.length
    });

    // 🚀 If avatar became ready and queue has pending items, resume processing
    if (canAccept && this.queue.length > 0 && !this.isProcessing) {
      console.log('[TTS Queue] 🎬 Avatar ready - resuming queue processing');
      this.processQueue();
    }

    // Clear queue if avatar closed or error
    if (state === 'CLOSED' || state === 'ERROR') {
      console.log('[TTS Queue] 🧹 Clearing queue due to state:', state);
      this.clear();
    }
  }

  /**
   * Check if can accept TTS based on avatar state
   */
  private canAcceptTTS(): boolean {
    return this.avatarState === 'READY' || this.avatarState === 'PLAYING';
  }

  /**
   * Process queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Recheck state before each playback
      if (!this.canAcceptTTS()) {
        console.warn('[TTS Queue] ⏸️ Pausing - avatar not ready');
        break;
      }

      // Recheck Unity ref
      if (!this.avatarRef.current || !this.avatarRef.current.isReady) {
        console.warn('[TTS Queue] ⏸️ Pausing - Unity not ready');
        break;
      }

      const chunk = this.queue.shift()!;
      this.metrics.currentQueueLength = this.queue.length;
      this.currentlyPlaying = chunk;

      try {
        // Notify playback start
        this.onPlaybackStart?.(chunk);

        // Play chunk on Unity avatar
        await this.playChunk(chunk);

        // Update metrics
        this.metrics.played++;

        // Notify playback complete
        this.onPlaybackComplete?.(chunk);

        console.log('[TTS Queue] ✅ Played:', {
          id: chunk.id,
          remaining: this.queue.length
        });

      } catch (error) {
        console.error('[TTS Queue] ❌ Playback error:', error);
        this.metrics.errors++;
        this.onError?.(error as Error, chunk);
      } finally {
        this.currentlyPlaying = null;
      }
    }

    this.isProcessing = false;

    // Notify queue empty
    if (this.queue.length === 0) {
      console.log('[TTS Queue] 📭 Queue empty');
      this.onQueueEmpty?.();
    }
  }

  /**
   * Play chunk on Unity avatar with audio-phoneme timing sync
   */
  private async playChunk(chunk: TTSChunk): Promise<void> {
    console.log('[TTS Queue] ▶️ Playing on avatar:', {
      id: chunk.id,
      phonemes: chunk.phonemes.length,
      estimatedDuration: chunk.duration
    });

    // 🎯 CRITICAL FIX: Adjust phoneme timestamps for Unity audio playback delay
    // Unity WebGL audio has ~150-200ms initialization delay on low-end devices
    // 
    // IDEAL SOLUTION (requires Unity source code access):
    //   - Unity sends UNITY_AUDIO_START postMessage when audio actually begins
    //   - We measure real delay and adjust phonemes dynamically
    // 
    // CURRENT PRAGMATIC SOLUTION (no Unity source access):
    //   - Use empirically measured fixed offset of 180ms (tested on low-end devices)
    //   - Conservative estimate works across device performance range
    const UNITY_AUDIO_START_OFFSET_MS = 180; // Empirical average delay for Unity WebGL audio init

    // 🎯 ADJUST PHONEME TIMESTAMPS: Subtract Unity delay from all phonemes
    // This pre-compensates for Unity's audio initialization lag
    const adjustedPhonemes = chunk.phonemes.map(p => ({
      ...p,
      time: Math.max(0, p.time - UNITY_AUDIO_START_OFFSET_MS) // Ensure no negative timestamps
    }));

    console.log('[TTS Queue] 🎯 Phoneme timestamps PRE-ADJUSTED for Unity delay:', {
      originalFirst: chunk.phonemes[0]?.time || 0,
      adjustedFirst: adjustedPhonemes[0]?.time || 0,
      fixedOffset: UNITY_AUDIO_START_OFFSET_MS,
      totalPhonemes: chunk.phonemes.length
    });

    // Send to Unity avatar with ADJUSTED phonemes for perfect sync
    this.avatarRef.current?.sendAudioWithPhonemesToAvatar(
      chunk.audio,
      adjustedPhonemes, // 🎯 USE ADJUSTED TIMESTAMPS
      chunk.id
    );

    // 🎵 Create Audio element to track playback completion
    const audioBlob = this.base64ToBlob(chunk.audio, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    // 🎵 Wait for audio playback to complete
    await new Promise<void>((resolve) => {
      let timeoutId: NodeJS.Timeout | undefined;

      // Cleanup function
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        URL.revokeObjectURL(audioUrl);
        audio.remove();
      };

      // Listen for audio ended event
      audio.addEventListener('ended', () => {
        console.log('[TTS Queue] ✅ Audio ended naturally:', chunk.id);
        cleanup();
        resolve();
      });

      // Fallback: If audio doesn't end in reasonable time (max 10s)
      timeoutId = setTimeout(() => {
        console.warn('[TTS Queue] ⏰ Audio timeout after 10s:', chunk.id);
        cleanup();
        resolve();
      }, 10000);

      // Start playback (muted, just to track timing)
      audio.volume = 0;
      audio.play().catch((err: Error) => {
        console.error('[TTS Queue] ❌ Audio play error:', err);
        cleanup();
        resolve();
      });
    });
  }

  /**
   * Convert base64 to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Clear queue and stop processing
   */
  clear(): void {
    console.log('[TTS Queue] 🧹 Clearing queue:', {
      queuedItems: this.queue.length,
      currentlyPlaying: this.currentlyPlaying?.id
    });

    this.queue = [];
    this.currentlyPlaying = null;
    this.isProcessing = false;
    this.metrics.currentQueueLength = 0;

    // Stop Unity playback if active
    if (this.avatarRef.current) {
      this.avatarRef.current.stopAudio?.();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): QueueMetrics {
    return {
      ...this.metrics,
      currentQueueLength: this.queue.length
    };
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      currentlyPlaying: this.currentlyPlaying,
      isProcessing: this.isProcessing,
      avatarState: this.avatarState,
      canAcceptTTS: this.canAcceptTTS(),
      metrics: this.getMetrics()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      enqueued: 0,
      played: 0,
      rejected: 0,
      errors: 0,
      currentQueueLength: this.queue.length
    };
  }
}
