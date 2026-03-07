#!/usr/bin/env npx tsx

/**
 * Demo script showing how the determinism check would catch a regression
 * 
 * This temporarily modifies the flight generation to be non-deterministic
 * and shows that our check catches it immediately.
 */

import { generateFlights, SearchParams } from '../lib/flightGen';

// Monkey patch generateFlights to be non-deterministic for demo
const originalGenerateFlights = generateFlights;
function nonDeterministicGenerateFlights(params: SearchParams, seed?: number) {
  const flights = originalGenerateFlights(params, seed);
  
  // Add some randomness to make it non-deterministic
  if (flights.length > 0) {
    // Randomly modify a price to break determinism
    const randomIndex = Math.floor(Math.random() * flights.length);
    flights[randomIndex].priceUsd += Math.floor(Math.random() * 10);
  }
  
  return flights;
}

// Replace the function temporarily
(global as any).generateFlights = nonDeterministicGenerateFlights;

// Simple determinism check (copied from main script)
function checkDeterminism(): boolean {
  console.log('🔍 Testing with NON-DETERMINISTIC flight generation...\n');
  
  const scenario: SearchParams = { origin: 'LAX', dest: 'JFK', date: '2024-06-15', cabin: 'ECONOMY' };
  
  // Generate flights multiple times
  const run1 = nonDeterministicGenerateFlights(scenario);
  const run2 = nonDeterministicGenerateFlights(scenario);
  
  // Create hashes
  const hash1 = JSON.stringify(run1.map(f => f.priceUsd).sort());
  const hash2 = JSON.stringify(run2.map(f => f.priceUsd).sort());
  
  const areIdentical = hash1 === hash2;
  
  console.log(`Run 1 prices: ${run1.map(f => f.priceUsd).slice(0, 5).join(', ')}...`);
  console.log(`Run 2 prices: ${run2.map(f => f.priceUsd).slice(0, 5).join(', ')}...`);
  console.log(`Hashes match: ${areIdentical ? 'YES' : 'NO'}`);
  
  if (areIdentical) {
    console.log('\n✅ Results are identical (unexpected!)');
  } else {
    console.log('\n❌ Results differ - NON-DETERMINISTIC detected!');
    console.log('This would alert you that changes have broken determinism.');
  }
  
  return areIdentical;
}

if (require.main === module) {
  console.log('🧪 Demo: How the determinism check catches regressions\n');
  console.log('This script temporarily makes flight generation non-deterministic');
  console.log('to show how our check would catch the problem.\n');
  
  const passed = checkDeterminism();
  
  console.log('\n💡 In real usage:');
  console.log('- If you see this error after making changes');
  console.log('- Check what you modified in flight generation logic');
  console.log('- Fix the code to restore determinism');
  console.log('- The check should then pass');
  
  process.exit(passed ? 0 : 1);
}