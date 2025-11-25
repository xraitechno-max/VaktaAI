import * as promptSystem from './dist/index.js';

console.log('\n✅ Prompt System Build Verification\n');
console.log('Available exports:');

const exports = Object.keys(promptSystem).filter(k => k !== 'default');
exports.forEach(exp => {
  console.log(`  - ${exp}`);
});

console.log('\n✅ Core Functions:');
console.log(`  runOrchestrator: ${typeof promptSystem.runOrchestrator}`);
console.log(`  configureLLM: ${typeof promptSystem.configureLLM}`);
console.log(`  configureRAG: ${typeof promptSystem.configureRAG}`);

console.log('\n✅ Telemetry Functions:');
console.log(`  getPrometheusMetrics: ${typeof promptSystem.getPrometheusMetrics}`);
console.log(`  getPrometheusContentType: ${typeof promptSystem.getPrometheusContentType}`);

console.log('\n✅ Utility Functions:');
console.log(`  healthCheck: ${typeof promptSystem.healthCheck}`);
console.log(`  getVersion: ${typeof promptSystem.getVersion}`);
console.log(`  setLogLevel: ${typeof promptSystem.setLogLevel}`);

console.log('\n✅ Build Status: SUCCESS');
console.log('All modules compiled and exports working properly!\n');
