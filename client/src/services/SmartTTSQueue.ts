/**
 * 🎤 Smart TTS Queue Manager
 * Validates avatar state before playing TTS
 * Tracks metrics and handles queue lifecycle
 */

import type { AvatarState } from '@/hooks/useAvatarState';
import type { UnityAvatarHandle } from '@/components/tutor/UnityAvatar';

interface TTSChunk {
  id: string;
  chunkIndex: number;       // 🔢 Sequence number for ordering
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
 * Ensures chunks are played in correct sequence order
 */
export class SmartTTSQueue {
  private queue: TTSChunk[] = [];
  private buffer: Map<number, TTSChunk> = new Map(); // ⏳ Buffer for out-of-order chunks
  private nextExpectedIndex = 0; // 🔢 Track next expected chunk index

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
   * Enqueue TTS chunk with avatar state validation and ordering
   * Returns false if avatar not ready (chunk rejected)
   */
  enqueue(chunk: TTSChunk): boolean {
    // 🔒 VALIDATION: Check avatar state
    // Allow LOADING state to buffer chunks until ready
    if (this.avatarState === 'CLOSED' || this.avatarState === 'ERROR') {
      console.warn('[TTS Queue] ❌ Rejected - avatar state invalid:', {
        avatarState: this.avatarState,
        chunkId: chunk.id
      });

      this.metrics.rejected++;
      return false;
    }

    // 🔢 ORDERING: Handle out-of-order chunks
    if (chunk.chunkIndex === this.nextExpectedIndex) {
      // Correct order - add to queue immediately
      this.addToQueue(chunk);
      this.nextExpectedIndex++;

      // Check if we have subsequent chunks in buffer
      this.checkBuffer();
    } else if (chunk.chunkIndex > this.nextExpectedIndex) {
      // Future chunk - buffer it
      console.log(`[TTS Queue] ⏳ Buffering out-of-order chunk ${chunk.chunkIndex} (waiting for ${this.nextExpectedIndex})`);
      this.buffer.set(chunk.chunkIndex, chunk);
    } else {
      // Old chunk - ignore or log warning
      console.warn(`[TTS Queue] ⚠️ Received old/duplicate chunk ${chunk.chunkIndex} (expected ${this.nextExpectedIndex})`);
      // We don't play old chunks to prevent confusion
    }

    return true;
  }

  /**
   * Check buffer for next expected chunks
   */
  private checkBuffer() {
    while (this.buffer.has(this.nextExpectedIndex)) {
      const chunk = this.buffer.get(this.nextExpectedIndex)!;
      this.buffer.delete(this.nextExpectedIndex);

      console.log(`[TTS Queue] 🔓 Unbuffering chunk ${chunk.chunkIndex}`);
      this.addToQueue(chunk);
      this.nextExpectedIndex++;
    }
  }

  /**
   * Add chunk to processing queue
   */
  private addToQueue(chunk: TTSChunk) {
    this.queue.push({
      ...chunk,
      timestamp: chunk.timestamp || Date.now()
    });

    this.metrics.enqueued++;
    this.metrics.currentQueueLength = this.queue.length;

    console.log('[TTS Queue] ✅ Enqueued:', {
      id: chunk.id,
      index: chunk.chunkIndex,
      queueLength: this.queue.length,
      avatarState: this.avatarState
    });

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
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
   * Notify queue that audio playback has ended
   */
  notifyAudioEnded(chunkId: string): void {
    console.log('[TTS Queue] 🎤 Audio ended notification received:', chunkId);

    // 🎯 FIX: Require EXACT ID match - no more wildcard fallback
    // Unity HTML now sends correct chunk IDs in AUDIO_ENDED events
    const isMatch = this.currentlyPlaying?.id === chunkId;

    if (isMatch && this.playbackResolver) {
      console.log(`[TTS Queue] ✅ Resolving playback promise for: ${this.currentlyPlaying?.id}`);
      
      // Clear safety timeout when audio ends normally
      if (this.safetyTimeoutId) {
        clearTimeout(this.safetyTimeoutId);
        this.safetyTimeoutId = null;
        console.log('[TTS Queue] 🔕 Safety timeout cleared (audio ended normally)');
      }
      
      this.playbackResolver();
      this.playbackResolver = null;
    } else {
      console.warn('[TTS Queue] ⚠️ Received audio ended for non-playing chunk:', {
        receivedId: chunkId,
        currentId: this.currentlyPlaying?.id
      });
    }
  }

  private playbackResolver: (() => void) | null = null;
  private safetyTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Play chunk on Unity avatar with audio-phoneme timing sync
   */
  private async playChunk(chunk: TTSChunk): Promise<void> {
    // 🎯 Calculate actual duration from phoneme timestamps (more accurate than guessing)
    const lastPhonemeTime = chunk.phonemes.length > 0 
      ? Math.max(...chunk.phonemes.map(p => p.time)) 
      : 0;
    // Add 500ms buffer after last phoneme
    const estimatedDuration = Math.max(chunk.duration, lastPhonemeTime + 500);
    
    console.log('[TTS Queue] ▶️ Playing on avatar:', {
      id: chunk.id,
      phonemes: chunk.phonemes.length,
      providedDuration: chunk.duration,
      lastPhonemeTime,
      estimatedDuration
    });

    // 🎯 CENTRALIZED OFFSET: Compensate for Unity WebGL audio initialization delay
    // Azure phoneme timestamps start at ~50-100ms while audio playback begins immediately
    // Unity WebGL has ~150-200ms audio initialization overhead
    // Subtract offset to make visemes arrive EARLIER to sync with delayed audio playback
    const UNITY_AUDIO_INIT_DELAY_MS = 180;
    
    const adjustedPhonemes = chunk.phonemes.map(p => ({
      ...p,
      time: Math.max(0, p.time - UNITY_AUDIO_INIT_DELAY_MS) // Shift visemes earlier
    }));
    
    console.log('[TTS Queue] 🎤 Sending phonemes with Unity audio delay compensation:', {
      originalFirst: chunk.phonemes[0]?.time || 0,
      adjustedFirst: adjustedPhonemes[0]?.time || 0,
      offset: `-${UNITY_AUDIO_INIT_DELAY_MS}ms`,
      totalPhonemes: chunk.phonemes.length
    });

    // Send to Unity avatar with adjusted phoneme timestamps
    this.avatarRef.current?.sendAudioWithPhonemesToAvatar(
      chunk.audio,
      adjustedPhonemes,
      chunk.id
    );

    // 🎵 Wait for explicit AUDIO_ENDED signal from Unity
    // This is much more reliable than playing a dummy audio element in the browser
    await new Promise<void>((resolve) => {
      this.playbackResolver = resolve;

      // 🎯 FIX: Safety timeout based on actual estimated duration (minimum 45 seconds)
      // This prevents premature timeout while still providing a safety net
      const safetyTimeoutMs = Math.max(45000, estimatedDuration + 15000);

      // 🎯 FIX: Store timeout ID so we can clear it when audio ends normally
      this.safetyTimeoutId = setTimeout(() => {
        if (this.playbackResolver) {
          console.warn('[TTS Queue] ⏰ Safety timeout waiting for AUDIO_ENDED:', chunk.id, `(timeout: ${safetyTimeoutMs}ms)`);
          this.playbackResolver();
          this.playbackResolver = null;
        }
      }, safetyTimeoutMs);
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
    this.buffer.clear(); // 🧹 Clear buffer
    this.nextExpectedIndex = 0; // 🔢 Reset index
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
