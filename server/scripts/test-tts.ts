#!/usr/bin/env tsx
/**
 * 🎤 TTS Multi-Provider Test Script
 *
 * Tests all TTS providers:
 * - Sarvam AI (primary)
 * - Google Cloud TTS (fallback)
 * - AWS Polly (cheapest)
 *
 * Usage:
 *   npx tsx server/scripts/test-tts.ts
 *
 * Or add to package.json:
 *   "test:tts": "tsx server/scripts/test-tts.ts"
 */

import 'dotenv/config';
import { ttsRouter } from '../services/tts';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'test-output');

// Test text samples
const TEST_SAMPLES = {
  hindi: 'नमस्ते! मैं VaktaAI हूं, आपकी AI शिक्षक।',
  hinglish: 'Hello! Main aapka AI tutor hoon. Kya aap ready hain?',
  english: 'Good morning! Perfect time for learning. Let\'s begin today\'s lesson.',
  emoji_test: 'Welcome to VaktaAI! 🎓 Let\'s learn together! 📚',
  ssml_test: '<speak>Welcome to <emphasis level="strong">VaktaAI</emphasis>! <break time="500ms"/> Let\'s begin.</speak>',
};

async function main() {
  console.log('');
  console.log('🎤 ========================================');
  console.log('   TTS Multi-Provider System Test');
  console.log('========================================');
  console.log('');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }

  // Test 1: Provider Health Check
  console.log('📊 Test 1: Provider Health Check');
  console.log('─────────────────────────────────');
  try {
    const status = await ttsRouter.getProviderStatus();
    for (const [name, health] of Object.entries(status)) {
      console.log(`  ${name}: ${health.available ? '✅ healthy' : '❌ unavailable'}`);
      console.log(`    Last check: ${health.lastCheck.toISOString()}`);
    }
  } catch (error) {
    console.error('  ❌ Health check failed:', error);
  }
  console.log('');

  // Test 2: Basic Synthesis (Avatar Context)
  console.log('🎯 Test 2: Basic Synthesis - Avatar Context');
  console.log('─────────────────────────────────');
  console.log('  Context: avatar (Sarvam → Google → Polly)');
  try {
    const result = await ttsRouter.synthesize(
      TEST_SAMPLES.hinglish,
      {}, // Let router pick default voice
      'avatar'
    );

    const filename = path.join(OUTPUT_DIR, 'test-avatar.mp3');
    fs.writeFileSync(filename, result.audioBuffer);

    console.log(`  ✅ Success with provider: ${result.provider}`);
    console.log(`  📦 Audio size: ${result.audioBuffer.length} bytes`);
    console.log(`  💾 Cached: ${result.cached ? 'Yes' : 'No'}`);
    console.log(`  📄 Saved to: ${filename}`);
  } catch (error) {
    console.error('  ❌ Failed:', error);
  }
  console.log('');

  // Test 3: Quick Context
  console.log('⚡ Test 3: Quick Synthesis - Quick Context');
  console.log('─────────────────────────────────');
  console.log('  Context: quick (Google → Sarvam → Polly)');
  try {
    const result = await ttsRouter.synthesize(
      TEST_SAMPLES.english,
      { languageCode: 'en-IN' }, // Let router pick default voice
      'quick'
    );

    const filename = path.join(OUTPUT_DIR, 'test-quick.mp3');
    fs.writeFileSync(filename, result.audioBuffer);

    console.log(`  ✅ Success with provider: ${result.provider}`);
    console.log(`  📦 Audio size: ${result.audioBuffer.length} bytes`);
    console.log(`  💾 Cached: ${result.cached ? 'Yes' : 'No'}`);
    console.log(`  📄 Saved to: ${filename}`);
  } catch (error) {
    console.error('  ❌ Failed:', error);
  }
  console.log('');

  // Test 4: Practice Context (Cheapest)
  console.log('💰 Test 4: Practice Synthesis - Practice Context');
  console.log('─────────────────────────────────');
  console.log('  Context: practice (Polly → Sarvam → Google)');
  try {
    const result = await ttsRouter.synthesize(
      TEST_SAMPLES.hindi,
      { languageCode: 'hi-IN' }, // Let router pick default voice
      'practice'
    );

    const filename = path.join(OUTPUT_DIR, 'test-practice.mp3');
    fs.writeFileSync(filename, result.audioBuffer);

    console.log(`  ✅ Success with provider: ${result.provider}`);
    console.log(`  📦 Audio size: ${result.audioBuffer.length} bytes`);
    console.log(`  💾 Cached: ${result.cached ? 'Yes' : 'No'}`);
    console.log(`  📄 Saved to: ${filename}`);
  } catch (error) {
    console.error('  ❌ Failed:', error);
  }
  console.log('');

  // Test 5: Phoneme Generation (Polly)
  console.log('🎤 Test 5: Phoneme Synthesis - With Visemes');
  console.log('─────────────────────────────────');
  console.log('  Feature: Polly visemes for lip-sync');
  try {
    const result = await ttsRouter.synthesizeWithPhonemes(
      TEST_SAMPLES.hinglish,
      { languageCode: 'en-IN' }, // Let Polly pick default voice
      'avatar'
    );

    const filename = path.join(OUTPUT_DIR, 'test-phonemes.mp3');
    fs.writeFileSync(filename, result.audioBuffer);

    console.log(`  ✅ Success with provider: ${result.provider}`);
    console.log(`  📦 Audio size: ${result.audioBuffer.length} bytes`);
    console.log(`  🔊 Visemes: ${result.phonemes?.length || 0} phonemes`);
    console.log(`  📄 Saved to: ${filename}`);

    if (result.phonemes && result.phonemes.length > 0) {
      console.log('  Sample visemes (first 5):');
      result.phonemes.slice(0, 5).forEach(p => {
        console.log(`    - time: ${p.time}ms, value: ${p.value}`);
      });
    }
  } catch (error) {
    console.error('  ❌ Failed:', error);
  }
  console.log('');

  // Test 6: Emoji Cleaning Test
  console.log('🧹 Test 6: Emoji Cleaning Test');
  console.log('─────────────────────────────────');
  console.log(`  Text with emoji: "${TEST_SAMPLES.emoji_test}"`);
  try {
    const result = await ttsRouter.synthesize(
      TEST_SAMPLES.emoji_test,
      { languageCode: 'en-IN' }, // Let router pick default voice
      'quick'
    );

    const filename = path.join(OUTPUT_DIR, 'test-emoji-cleaned.mp3');
    fs.writeFileSync(filename, result.audioBuffer);

    console.log(`  ✅ Success (emojis should be removed from audio)`);
    console.log(`  📦 Audio size: ${result.audioBuffer.length} bytes`);
    console.log(`  📄 Saved to: ${filename}`);
  } catch (error) {
    console.error('  ❌ Failed:', error);
  }
  console.log('');

  // Test 7: Cache Test
  console.log('💾 Test 7: Cache Effectiveness Test');
  console.log('─────────────────────────────────');
  console.log('  First request (should not be cached):');
  const cacheTestText = 'This is a cache test. Let me know if this works!';
  try {
    const result1 = await ttsRouter.synthesize(cacheTestText, {}, 'avatar');
    console.log(`    Provider: ${result1.provider}, Cached: ${result1.cached}`);

    console.log('  Second request (should be cached):');
    const result2 = await ttsRouter.synthesize(cacheTestText, {}, 'avatar');
    console.log(`    Provider: ${result2.provider}, Cached: ${result2.cached}`);

    if (result2.cached) {
      console.log('  ✅ Cache working correctly!');
    } else {
      console.log('  ⚠️  Cache not working (check TTS_CACHE_ENABLED in .env)');
    }
  } catch (error) {
    console.error('  ❌ Failed:', error);
  }
  console.log('');

  // Test 8: Cache Stats
  console.log('📈 Test 8: Cache Statistics');
  console.log('─────────────────────────────────');
  try {
    const stats = ttsRouter.getCacheStats();
    console.log(`  Enabled: ${stats.enabled ? 'Yes' : 'No'}`);
    console.log(`  Size: ${stats.size} entries`);
    console.log(`  TTL: ${stats.ttl} seconds (${Math.round(stats.ttl / 86400)} days)`);
  } catch (error) {
    console.error('  ❌ Failed:', error);
  }
  console.log('');

  // Final Summary
  console.log('✨ ========================================');
  console.log('   Test Complete!');
  console.log('========================================');
  console.log('');
  console.log('📁 Output files saved to:', OUTPUT_DIR);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Play the generated MP3 files to verify quality');
  console.log('  2. Check server logs for provider routing details');
  console.log('  3. Visit http://localhost:5001/api/debug/tts-health for live status');
  console.log('');
}

// Run tests
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
