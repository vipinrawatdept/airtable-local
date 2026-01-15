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

import { runScript } from "./main-logic";
import { AirtableLogger } from "../utils";
import { IAirtableBase } from "../types";

/**
 * Environment detection
 * In Airtable Scripts, 'base' is a global object
 */
function isAirtableEnvironment(): boolean {
  return typeof (globalThis as Record<string, unknown>).base !== "undefined";
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
      logger.error("Script execution failed");
      // Re-throw to show error in Airtable
      throw error;
    }
  } else {
    // Running outside Airtable (e.g., in Node.js via esbuild watch)
    // This won't normally run - use npm run local or npm test instead
    console.log("Not running in Airtable environment.");
    console.log('Use "npm run local" to run against real Airtable data.');
    console.log('Use "npm test" to run unit tests with mocks.');
  }
})();
