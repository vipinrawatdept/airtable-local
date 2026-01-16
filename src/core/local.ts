/**
 * Local Runner
 *
 * Run your Airtable script locally using either:
 * - Real Airtable API (default)
 * - Local CSV files (faster, for testing)
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in your credentials
 *   2. Run: npm run local          (uses Airtable API)
 *   3. Run: npm run local:csv      (uses local CSV files)
 */

import "dotenv/config";
import { runScript } from "./main-logic";
import { NodeLogger } from "../utils";
import {
  createAirtableBaseFromEnv,
  createAirtableBaseWithAutoLoad,
  createCsvBaseFromEnv,
} from "../adapters";
import { IAirtableBase } from "../types";

async function main() {
  const useCsvData = process.env.USE_CSV_DATA === "true";
  const logger = new NodeLogger("[Local Runner]");

  let base: IAirtableBase;

  if (useCsvData) {
    // CSV Mode - Load from local CSV files
    logger.log("🔧 Starting local execution with CSV data...\n");

    const dataDir = process.env.CSV_DATA_DIR || "./data";
    const autoSave = process.env.CSV_AUTO_SAVE === "true";

    logger.log(`📂 Data directory: ${dataDir}`);
    logger.log(`💾 Auto-save changes: ${autoSave ? "enabled" : "disabled"}\n`);

    base = createCsvBaseFromEnv();
  } else {
    // API Mode - Use real Airtable API
    logger.log("🔧 Starting local execution with Airtable SDK...\n");

    const tableNames =
      process.env.AIRTABLE_TABLE_NAMES?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [];

    if (tableNames.length > 0) {
      // Use provided table names
      base = createAirtableBaseFromEnv(tableNames);
      logger.log(`📋 Pre-loaded tables: ${tableNames.join(", ")}\n`);
    } else {
      // Auto-discover tables from Airtable Metadata API
      logger.log("🔍 Auto-discovering tables from Airtable...");
      try {
        base = await createAirtableBaseWithAutoLoad();
        logger.log(
          `📋 Discovered ${base.tables.length} table(s): ${base.tables
            .map((t) => t.name)
            .join(", ")}\n`
        );
      } catch (error) {
        logger.warn(
          `⚠️  Could not auto-discover tables: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        logger.log(
          "   Make sure your API token has 'schema.bases:read' scope."
        );
        logger.log("   Falling back to on-demand table access.\n");
        base = createAirtableBaseFromEnv([]);
      }
    }
  }

  try {
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
