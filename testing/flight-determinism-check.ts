#!/usr/bin/env npx tsx

/**
 * Flight Data Distribution Tracker
 * 
 * Verifies determinism and tracks data distribution changes across snapshots.
 * 
 * Usage: 
 *   npx tsx testing/flight-determinism-check.ts           # Check determinism
 *   npx tsx testing/flight-determinism-check.ts --snapshot # Create new snapshot
 *   npx tsx testing/flight-determinism-check.ts --compare  # Compare against last snapshot
 */

import { generateFlights, SearchParams } from '../lib/flightGen';
import { generateLayoverFlights } from '../lib/layoverGen';
import { GLOBAL_RNG_SEED } from '../lib/flightConfig';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const SNAPSHOTS_DIR = './testing/data-snapshots';

// Test scenarios - broad coverage for the deterministic generator
const TEST_SCENARIOS: SearchParams[] = [
  // Basic domestic
  { origin: 'LAX', dest: 'SFO', date: '2024-03-15', cabin: 'ECONOMY' },
  // International  
  { origin: 'JFK', dest: 'LHR', date: '2024-07-10', cabin: 'ECONOMY' },
  // Business class
  { origin: 'JFK', dest: 'LAX', date: '2024-06-20', cabin: 'BUSINESS' },
  // Weekend pricing
  { origin: 'ORD', dest: 'DEN', date: '2024-04-12', cabin: 'ECONOMY' }, // Friday
  // Edge case
  { origin: 'LAX', dest: 'LAX', date: '2024-04-01', cabin: 'ECONOMY' }, // Should be empty
  // Country major-airport expansion determinism: pick representative pairs
  // These are generator-level checks using concrete airports that should be returned by country expansion
  { origin: 'SFO', dest: 'HND', date: '2024-10-18', cabin: 'ECONOMY' }, // Japan major airports include HND/NRT
  { origin: 'NRT', dest: 'LAX', date: '2024-10-25', cabin: 'ECONOMY' },
  { origin: 'JFK', dest: 'LHR', date: '2024-11-05', cabin: 'ECONOMY' }, // UK major airports include LHR/LGW
];

interface DataSnapshot {
  version: string;
  timestamp: string;
  gitCommit?: string;
  rngSeed: number;
  scenarios: {
    [key: string]: {
      directFlights: number;
      layoverFlights: number;
      priceRange: { min: number; max: number };
      airlines: string[];
      aircraftTypes: string[];
      sampleFlightNumbers: string[];
      hash: string;
    };
  };
}

function hashFlights(flights: any[]): string {
  // Create a deterministic hash of the flight data
  const sorted = flights.map(f => ({
    flightNumber: f.flightNumber,
    airline: f.airline,
    priceUsd: f.priceUsd,
    depart: f.depart,
    arrive: f.arrive,
    durationMin: f.durationMin,
    distanceKm: f.distanceKm,
    emissions: f.emissions,
    cabinPricing: f.cabinPricing
  })).sort((a, b) => a.flightNumber.localeCompare(b.flightNumber));
  
  return JSON.stringify(sorted);
}

function getGitCommit(): string | undefined {
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

function generateDataSnapshot(): DataSnapshot {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  
  const scenarios: DataSnapshot['scenarios'] = {};
  
  for (const scenario of TEST_SCENARIOS) {
    const scenarioKey = `${scenario.origin}-${scenario.dest}-${scenario.cabin}`;
    
    const directFlights = generateFlights(scenario, GLOBAL_RNG_SEED);
    const layoverFlights = scenario.origin !== scenario.dest 
      ? generateLayoverFlights(scenario, GLOBAL_RNG_SEED) 
      : [];
    
    const allFlights = [...directFlights, ...layoverFlights];
    const prices = allFlights.map(f => f.priceUsd).filter(p => p > 0);
    
    scenarios[scenarioKey] = {
      directFlights: directFlights.length,
      layoverFlights: layoverFlights.length,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0
      },
      airlines: Array.from(new Set(allFlights.map(f => f.airline))).sort(),
      aircraftTypes: Array.from(new Set(allFlights.map(f => f.aircraft))).sort(),
      sampleFlightNumbers: directFlights.slice(0, 5).map(f => f.flightNumber),
      hash: hashFlights(allFlights)
    };
  }
  
  return {
    version: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    timestamp: new Date().toISOString(),
    gitCommit: getGitCommit(),
    rngSeed: GLOBAL_RNG_SEED,
    scenarios
  };
}

function saveSnapshot(snapshot: DataSnapshot): string {
  const filename = `data-snapshot-${snapshot.version}.json`;
  const filepath = join(SNAPSHOTS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  return filepath;
}

function getLatestSnapshot(): DataSnapshot | null {
  if (!existsSync(SNAPSHOTS_DIR)) return null;
  
  try {
    const fs = require('fs');
    const files = fs.readdirSync(SNAPSHOTS_DIR)
      .filter((f: string) => f.startsWith('data-snapshot-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) return null;
    
    const latestFile = join(SNAPSHOTS_DIR, files[0]);
    return JSON.parse(readFileSync(latestFile, 'utf8'));
  } catch {
    return null;
  }
}

function compareSnapshots(current: DataSnapshot, previous: DataSnapshot): {
  hasChanges: boolean;
  changes: string[];
  changeReport: string;
} {
  const changes: string[] = [];
  let hasDataChanges = false;
  
  // Compare RNG seed
  if (current.rngSeed !== previous.rngSeed) {
    changes.push(`RNG seed changed: ${previous.rngSeed} → ${current.rngSeed}`);
    hasDataChanges = true;
  }
  
  // Compare each scenario
  for (const scenarioKey of Object.keys(current.scenarios)) {
    const curr = current.scenarios[scenarioKey];
    const prev = previous.scenarios[scenarioKey];
    
    if (!prev) {
      changes.push(`New scenario added: ${scenarioKey}`);
      hasDataChanges = true;
      continue;
    }
    
    // Check for data distribution changes
    if (curr.hash !== prev.hash) {
      changes.push(`Data distribution changed for ${scenarioKey}`);
      hasDataChanges = true;
      
      if (curr.directFlights !== prev.directFlights) {
        changes.push(`  - Flight count: ${prev.directFlights} → ${curr.directFlights} direct flights`);
      }
      
      if (curr.priceRange.min !== prev.priceRange.min || curr.priceRange.max !== prev.priceRange.max) {
        changes.push(`  - Price range: $${prev.priceRange.min}-$${prev.priceRange.max} → $${curr.priceRange.min}-$${curr.priceRange.max}`);
      }
      
      const addedAirlines = curr.airlines.filter(a => !prev.airlines.includes(a));
      const removedAirlines = prev.airlines.filter(a => !curr.airlines.includes(a));
      
      if (addedAirlines.length > 0) {
        changes.push(`  - Airlines added: ${addedAirlines.join(', ')}`);
      }
      if (removedAirlines.length > 0) {
        changes.push(`  - Airlines removed: ${removedAirlines.join(', ')}`);
      }
    }
  }
  
  // Generate change report
  let changeReport = '';
  if (hasDataChanges) {
    changeReport = `
DATA DISTRIBUTION CHANGE NOTICE

Flight data distribution has changed as of ${current.timestamp}.

Previous snapshot: ${previous.version} (${previous.timestamp})
Current snapshot: ${current.version} (${current.timestamp})

Changes detected:
${changes.map(c => `• ${c}`).join('\n')}

Suggested follow-up:
- Review the generator changes that produced this delta
- Re-run local checks against the updated output
- Commit a new snapshot if the change is intentional

Git commits:
- Previous: ${previous.gitCommit || 'unknown'}
- Current: ${current.gitCommit || 'unknown'}
`;
  }
  
  return {
    hasChanges: hasDataChanges,
    changes,
    changeReport
  };
}

function checkDeterminism(): boolean {
  console.log('🔍 Checking flight generation determinism...\n');
  
  let allPassed = true;
  const seed = GLOBAL_RNG_SEED;
  
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    const scenarioName = `${scenario.origin}→${scenario.dest} ${scenario.cabin}`;
    
    try {
      // Generate flights multiple times with same inputs
      const run1 = generateFlights(scenario, seed);
      const run2 = generateFlights(scenario, seed);
      const run3 = generateFlights(scenario, seed);
      
      // Also test layover flights for non-empty routes
      const layover1 = scenario.origin !== scenario.dest ? generateLayoverFlights(scenario, seed) : [];
      const layover2 = scenario.origin !== scenario.dest ? generateLayoverFlights(scenario, seed) : [];
      
      // Hash the results
      const hash1 = hashFlights(run1);
      const hash2 = hashFlights(run2);
      const hash3 = hashFlights(run3);
      
      const layoverHash1 = hashFlights(layover1);
      const layoverHash2 = hashFlights(layover2);
      
      // Check if all runs are identical
      const directMatch = hash1 === hash2 && hash2 === hash3;
      const layoverMatch = layoverHash1 === layoverHash2;
      
      if (directMatch && layoverMatch) {
        console.log(`✅ ${scenarioName} - ${run1.length} direct, ${layover1.length} layover flights`);
      } else {
        console.log(`❌ ${scenarioName} - NON-DETERMINISTIC!`);
        if (!directMatch) {
          console.log(`   Direct flights differ between runs`);
        }
        if (!layoverMatch) {
          console.log(`   Layover flights differ between runs`);
        }
        allPassed = false;
      }
      
    } catch (error) {
      console.log(`❌ ${scenarioName} - ERROR: ${error}`);
      allPassed = false;
    }
  }
  
  console.log(`\n📊 Result: ${allPassed ? '✅ DETERMINISTIC' : '❌ NON-DETERMINISTIC'}`);
  
  if (!allPassed) {
    console.log('\n⚠️  Flight generation is not deterministic!');
    console.log('This means the same inputs are producing different outputs.');
    console.log('Check recent changes to flight generation logic.');
  } else {
    console.log('\n🎉 Flight generation is deterministic!');
    console.log('Same inputs always produce identical outputs.');
  }
  
  return allPassed;
}

// Quick distribution check - just verify we're getting reasonable variety
function checkDistribution(): boolean {
  console.log('\n📈 Quick distribution check...');
  
  const scenario: SearchParams = { origin: 'LAX', dest: 'JFK', date: '2024-06-15', cabin: 'ECONOMY' };
  const flights = generateFlights(scenario, GLOBAL_RNG_SEED);
  
  if (flights.length === 0) {
    console.log('❌ No flights generated - something is wrong');
    return false;
  }
  
  const airlines = new Set(flights.map(f => f.airline));
  const aircraftTypes = new Set(flights.map(f => f.aircraft));
  const prices = flights.map(f => f.priceUsd);
  const priceRange = Math.max(...prices) - Math.min(...prices);
  
  console.log(`   Flights: ${flights.length}`);
  console.log(`   Airlines: ${airlines.size} (${Array.from(airlines).join(', ')})`);
  console.log(`   Aircraft: ${aircraftTypes.size} types`);
  console.log(`   Price range: $${Math.min(...prices)}-$${Math.max(...prices)} (spread: $${priceRange})`);
  
  // Basic sanity checks
  const hasVariety = airlines.size > 1 && aircraftTypes.size > 1 && priceRange > 0;
  
  if (hasVariety) {
    console.log('✅ Distribution looks healthy');
  } else {
    console.log('⚠️  Distribution looks suspicious - may indicate a problem');
  }
  
  return hasVariety;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === '--snapshot') {
    // Create a new snapshot baseline
    console.log('📸 Creating new data distribution snapshot...\n');
    
    const snapshot = generateDataSnapshot();
    const filepath = saveSnapshot(snapshot);
    
    console.log('✅ Snapshot created successfully!');
    console.log(`📁 File: ${filepath}`);
    console.log(`🏷️  Version: ${snapshot.version}`);
    console.log(`🔗 Git commit: ${snapshot.gitCommit || 'unknown'}`);
    console.log(`🎲 RNG seed: ${snapshot.rngSeed}`);
    
    console.log('\n📊 Summary:');
    for (const [scenarioKey, data] of Object.entries(snapshot.scenarios)) {
      console.log(`   ${scenarioKey}: ${data.directFlights} direct, ${data.layoverFlights} layover flights`);
    }
    
    console.log('\n📝 Suggested next steps:');
    console.log('1. Commit this snapshot to version control');
    console.log('2. If this represents a change, run --compare to inspect the delta');
    console.log('3. Update documentation if the new distribution is intentional');
    
  } else if (command === '--compare') {
    // Compare against the last snapshot baseline
    console.log('📊 Comparing against previous data snapshot...\n');
    
    const current = generateDataSnapshot();
    const previous = getLatestSnapshot();
    
    if (!previous) {
      console.log('⚠️  No previous snapshot found. Creating first snapshot...');
      const filepath = saveSnapshot(current);
      console.log(`✅ Initial snapshot saved: ${filepath}`);
      process.exit(0);
    }
    
    const comparison = compareSnapshots(current, previous);
    
    if (comparison.hasChanges) {
      console.log('🚨 DATA DISTRIBUTION CHANGES DETECTED!');
      console.log('\nChanges:');
      comparison.changes.forEach(change => console.log(`  • ${change}`));
      
      console.log('\n📝 Change report:');
      console.log('=' .repeat(60));
      console.log(comparison.changeReport);
      console.log('=' .repeat(60));
      
      // Save new snapshot
      const filepath = saveSnapshot(current);
      console.log(`\n💾 New snapshot saved: ${filepath}`);
      
      // Save change report
      const messageFile = join(SNAPSHOTS_DIR, `change-report-${current.version}.txt`);
      writeFileSync(messageFile, comparison.changeReport);
      console.log(`📝 Change report saved: ${messageFile}`);
      
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('1. Review the changes above');
      console.log('2. Decide whether this output change is intentional');
      console.log('3. Update snapshots and documentation if needed');
      console.log('4. Commit the new snapshot to version control');
      
      process.exit(1); // Exit with error to stop deployment if run in CI
    } else {
      console.log('✅ No data distribution changes detected');
      console.log(`📊 Data remains consistent with snapshot ${previous.version}`);
      process.exit(0);
    }
    
  } else {
    // Default: just check determinism
    const deterministicPassed = checkDeterminism();
    const distributionPassed = checkDistribution();
    
    const overallPassed = deterministicPassed && distributionPassed;
    
    console.log(`\n🎯 Overall: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (overallPassed) {
      console.log('\n🧭 Determinism status: ✅ MAINTAINED');
      console.log('Flight data generation remains deterministic.');
    } else {
      console.log('\n🚨 Determinism status: ❌ REGRESSED');
      console.log('Flight data generation is no longer deterministic!');
      console.log('Inspect recent generator changes before accepting the new output.');
    }
    
    // Exit with error code if any checks failed
    process.exit(overallPassed ? 0 : 1);
  }
}
