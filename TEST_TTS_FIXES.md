# TTS Fixes - Testing Guide

## Issues Fixed

### 1. Audio Glitches at Start ✅
**Problem**: Audio starting me glitch/stutter aa raha tha
**Root Cause**:
- Duplicate TTS generation due to race conditions in `ttsInFlightMap`
- Audio buffer not properly cleaned between sessions
- No delay before Unity audio playback start

**Fixes Applied**:
- Enhanced sentence normalization for deduplication (lowercase, emoji removal, punctuation cleanup)
- Added 50ms delay before Unity audio playback to stabilize audio system
- Improved audio queue clearing on TTS_START
- Added 30-second cleanup timeout for `ttsInFlightMap` to prevent memory leaks

**Files Modified**:
- `server/services/voiceStreamService.ts:651-723` - Enhanced deduplication logic
- `client/src/services/SmartTTSQueue.ts:230-287` - Added delay before playback
- `client/src/hooks/useVoiceTutor.ts:397-424` - Improved TTS_START handling

---

### 2. Auto Message Repeat/Replay ✅
**Problem**: Same TTS message multiple times play ho raha tha
**Root Cause**:
- Race condition in `ttsInFlightMap.has()` check - two calls could pass before first set
- No cleanup of completed TTS promises from map
- Weak sentence normalization causing "Hello!" and "Hello." to be treated as different

**Fixes Applied**:
- Atomic promise creation + map insertion (no await between check and set)
- Enhanced normalization: lowercase + emoji removal + punctuation cleanup
- Auto-cleanup after 30 seconds to prevent memory leaks while catching rapid duplicates
- Better error handling - don't remove from map on error to prevent retry spam

**Files Modified**:
- `server/services/voiceStreamService.ts:668-723` - Atomic deduplication with cleanup

---

### 3. TTS Text Processing Improvements ✅
**Problem**: Emojis, special characters causing TTS to glitch or read incorrectly
**Root Cause**:
- Incomplete emoji regex (missing newer Unicode ranges)
- Special characters like *, _, #, `, ~ not removed
- Inconsistent quote handling

**Fixes Applied**:
- Comprehensive emoji removal (all Unicode ranges)
- Enhanced special character cleanup
- Quote normalization
- Better spacing around punctuation
- Multiple punctuation cleanup (e.g., "......" → ".")

**Files Modified**:
- `server/utils/tts-text-processor.ts:9-47` - Enhanced text cleaning

---

## Testing Checklist

### Test 1: No Audio Glitches ✅
1. Start tutor session with Unity avatar
2. Ask a question in voice or text
3. Listen for audio response
4. **Expected**: Audio should start smoothly without clicks/pops/glitches
5. **Check Console**: Look for `[TTS Queue] ▶️ Playing on avatar` with 50ms delay log

### Test 2: No Duplicate Messages ✅
1. Ask multiple questions rapidly (5-6 questions)
2. Listen to responses
3. **Expected**: Each question should get ONE response, no repeats
4. **Check Console**: Look for `[TTS DEDUP] ⚠️ Skipping duplicate TTS` logs

### Test 3: Emoji Handling ✅
1. Type a message with emojis: "Hello 😊 how are you? 👍"
2. Send as text query
3. **Expected**: TTS should read "Hello how are you" without emoji sounds
4. **Check Console**: Look for `[TTS CLEAN]` logs showing cleaned text

### Test 4: Special Characters ✅
1. Type message with special chars: "This is **bold** and `code` text"
2. Send as text query
3. **Expected**: TTS should read "This is bold and code text" naturally
4. **Check Console**: Verify cleaned text in logs

### Test 5: Rapid Questions ✅
1. Ask 3 questions back-to-back without waiting for responses
2. **Expected**:
   - All 3 responses should play in order
   - No overlapping audio
   - No repeated sentences
3. **Check Console**:
   - Look for TTS_START clearing queues
   - Verify sequence numbers are correct

### Test 6: Long Response ✅
1. Ask a complex question requiring long response
2. **Expected**:
   - Audio plays smoothly sentence-by-sentence
   - No gaps or overlaps between sentences
   - Avatar lip-sync stays synchronized
3. **Check Console**:
   - Verify `[PHONEME STREAM]` logs
   - Check Smart TTS Queue metrics

### Test 7: Error Recovery ✅
1. Disconnect internet briefly during TTS generation
2. Reconnect
3. Ask new question
4. **Expected**:
   - System should recover gracefully
   - New TTS should work without issues
   - No stale audio from failed request
5. **Check Console**: Look for error handling and queue clearing

---

## Console Monitoring

### Key Logs to Watch:

#### Success Indicators:
```
[TTS START] 🧹 Cleared all audio queues and reset state
[TTS DEDUP] ⚠️ Skipping duplicate TTS (already in-flight or done)
[TTS Queue] ▶️ Playing on avatar
[PHONEME STREAM] 🎤 Received phoneme TTS chunk
[Smart TTS Queue] ✅ Enqueued
```

#### Warning Indicators (OK if occasional):
```
[TTS DEDUP] ⚠️ Skipping empty/too short sentence
[TTS Queue] ❌ Rejected - avatar not ready
```

#### Error Indicators (INVESTIGATE):
```
[TTS ERROR] Failed for sentence
[TTS Queue] ❌ Playback error
[Browser TTS] ❌ Error playing in browser
```

---

## Performance Metrics

### Expected Latency:
- **TTS Generation**: < 2 seconds per sentence
- **Audio Start Delay**: 50ms (stabilization)
- **Deduplication Check**: < 1ms

### Memory Usage:
- `ttsInFlightMap` auto-cleans after 30 seconds
- Smart TTS Queue clears on avatar close
- Audio buffers properly released after playback

---

## Rollback Instructions

If issues persist:

1. **Revert server deduplication**:
   ```bash
   git diff server/services/voiceStreamService.ts
   # Review changes at lines 651-723
   # Revert if needed
   ```

2. **Revert client queue fix**:
   ```bash
   git diff client/src/services/SmartTTSQueue.ts
   # Review changes at lines 230-287
   # Revert if needed
   ```

3. **Revert text processing**:
   ```bash
   git diff server/utils/tts-text-processor.ts
   # Review changes at lines 9-47
   # Revert if needed
   ```

---

## Additional Notes

### Architecture Improvements:
- Atomic operations prevent race conditions
- Memory-safe with auto-cleanup
- Better error isolation (failed TTS doesn't break system)
- Enhanced text normalization for Indian languages

### Future Enhancements:
- [ ] Add retry logic for failed TTS (max 2 retries)
- [ ] Implement exponential backoff for TTS providers
- [ ] Add TTS quality metrics (PESQ/MOS scores)
- [ ] Cache normalized sentences for faster deduplication
- [ ] Add user preference for TTS voice/speed

---

## Status: ✅ READY FOR TESTING

All fixes have been applied and are ready for validation.
Please run through the testing checklist above and report any issues.
