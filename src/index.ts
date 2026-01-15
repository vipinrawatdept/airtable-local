/**
 * Entry Point for Airtable Script
 * 
 * This file detects the environment and injects the appropriate dependencies:
 * - In Airtable: Uses real 'base' global and AirtableLogger
 * - In Node.js: This file won't run directly (use tests instead)
 * 
 * When bundled with esbuild, this becomes a single file you can paste
 * into Airtable's Scripting block.
 */

import { runScript } from './mainLogic';
import { AirtableLogger } from './loggers';
import { IAirtableBase } from './interfaces';

/**
 * Environment detection
 * In Airtable Scripts, 'base' is a global object
 */
function isAirtableEnvironment(): boolean {
  return typeof (globalThis as Record<string, unknown>).base !== 'undefined';
}

/**
 * Get the Airtable base from the global scope
 */
function getAirtableBase(): IAirtableBase {
  // @ts-expect-error - 'base' is a global in Airtable Scripts
  return base as IAirtableBase;
}

/**
 * Main execution
 * 
 * Automatically runs when the script is executed in Airtable.
 * The IIFE (Immediately Invoked Function Expression) pattern ensures
 * the script runs immediately when pasted into Airtable.
 */
(async () => {
  if (isAirtableEnvironment()) {
    // Running in Airtable - use real base and AirtableLogger
    const airtableBase = getAirtableBase();
    const logger = new AirtableLogger();

    try {
      await runScript(airtableBase, logger);
    } catch (error) {
      logger.error('Script execution failed');
      // Re-throw to show error in Airtable
      throw error;
    }
  } else {
    // Running outside Airtable (e.g., accidentally in Node.js)
    console.log('⚠️  This script is designed to run in Airtable.');
    console.log('   For local testing, run: npm test');
    console.log('   For building, run: npm run build');
  }
})();
