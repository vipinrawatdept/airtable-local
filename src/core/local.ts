/**
 * Local Runner
 *
 * Run your Airtable script locally against a real Airtable base
 * using the official Airtable SDK.
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in your credentials
 *   2. Run: npm run local
 */

import "dotenv/config";
import { runScript } from "./main-logic";
import { NodeLogger } from "../utils";
import { createAirtableBaseFromEnv } from "../adapters";

async function main() {
  const logger = new NodeLogger("[Local Runner]");

  logger.log("🔧 Starting local execution with Airtable SDK...\n");

  try {
    // Create base adapter from environment variables
    // Optionally specify table names to pre-load them into base.tables
    const tableNames =
      process.env.AIRTABLE_TABLE_NAMES?.split(",").map((s) => s.trim()) || [];
    const base = createAirtableBaseFromEnv(tableNames);

    if (tableNames.length > 0) {
      logger.log(`📋 Pre-loaded tables: ${tableNames.join(", ")}`);
    } else {
      logger.log(
        "ℹ️  No tables pre-loaded. Set AIRTABLE_TABLE_NAMES in .env to list tables."
      );
      logger.log("   Tables will be accessed on-demand via base.getTable()\n");
    }

    // Run the main script
    await runScript(base, logger);

    logger.log("\n🎉 Local execution completed!");
  } catch (error) {
    logger.error(
      `Local execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exit(1);
  }
}

main();
