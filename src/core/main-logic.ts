import { IAirtableBase, ILogger } from "../types";

/**
 * Main script logic with Dependency Injection
 *
 * This function contains your Airtable script logic.
 * It receives the base and logger as dependencies, making it:
 * - Testable (pass mocks during testing)
 * - Environment-agnostic (works in Node.js and Airtable)
 *
 * @param base - The Airtable base (real or mocked)
 * @param logger - The logger implementation (NodeLogger or AirtableLogger)
 */
export async function runScript(
  base: IAirtableBase,
  logger: ILogger
): Promise<void> {
  logger.log("🚀 Script started");

  try {
    // Example: Get all tables in the base
    const tables = base.tables;
    logger.log(`📊 Found ${tables.length} table(s) in this base`);

    // Example: List table names
    for (const table of tables) {
      logger.log(`  - ${table.name} (${table.id})`);
    }

    // Example: If there's at least one table, fetch its records
    if (tables.length > 0) {
      const firstTable = tables[0];
      logger.log(`\n📋 Fetching records from "${firstTable.name}"...`);

      const queryResult = await firstTable.selectRecordsAsync();
      const records = queryResult.records;

      logger.log(`✅ Retrieved ${records.length} record(s)`);

      // Example: Log first 5 records
      const recordsToShow = records.slice(0, 5);
      for (const record of recordsToShow) {
        logger.log(`  - Record: ${record.name} (${record.id})`);
      }

      if (records.length > 5) {
        logger.log(`  ... and ${records.length - 5} more`);
      }

      // ═══════════════════════════════════════════════════════════
      // Run update records script
      // ═══════════════════════════════════════════════════════════
      await updateRecordsScript(base, firstTable.name, logger);
    }

    logger.log("\n✨ Script completed successfully!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Script failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Example: Process records in a table
 *
 * @param base - The Airtable base
 * @param tableName - Name of the table to process
 * @param logger - The logger implementation
 */
export async function processTableRecords(
  base: IAirtableBase,
  tableName: string,
  logger: ILogger
): Promise<{ processed: number; errors: number }> {
  logger.log(`Processing table: ${tableName}`);

  const table = base.getTable(tableName);
  const queryResult = await table.selectRecordsAsync();
  const records = queryResult.records;

  let processed = 0;
  let errors = 0;

  for (const record of records) {
    try {
      // Example: Get a cell value
      const status = record.getCellValue("Status");

      // Example: Update record based on condition
      if (status === "Pending") {
        await table.updateRecordAsync(record.id, {
          Status: "Processed",
          "Processed Date": new Date().toISOString(),
        });
        processed++;
        logger.log(`  ✓ Processed record: ${record.name}`);
      }
    } catch (err) {
      errors++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`  ✗ Failed to process ${record.id}: ${errorMessage}`);
    }
  }

  logger.log(`\nSummary: ${processed} processed, ${errors} errors`);
  return { processed, errors };
}

/**
 * Example: Create new records
 */
export async function createSampleRecords(
  base: IAirtableBase,
  tableName: string,
  count: number,
  logger: ILogger
): Promise<string[]> {
  logger.log(`Creating ${count} sample records in "${tableName}"`);

  const table = base.getTable(tableName);
  const createdIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const recordId = await table.createRecordAsync({
      Name: `Sample Record ${i + 1}`,
      Status: "New",
      Created: new Date().toISOString(),
    });
    createdIds.push(recordId);
    logger.log(`  Created record ${i + 1}: ${recordId}`);
  }

  return createdIds;
}

/**
 * Update records script - Updates records based on criteria
 *
 * @param base - The Airtable base
 * @param tableName - Name of the table to update
 * @param logger - The logger implementation
 */
export async function updateRecordsScript(
  base: IAirtableBase,
  tableName: string,
  logger: ILogger
): Promise<{ updated: number; skipped: number }> {
  logger.log(`\n🔄 Starting update records script on "${tableName}"...`);

  const table = base.getTable(tableName);
  const queryResult = await table.selectRecordsAsync();
  const records = queryResult.records;

  logger.log(`📋 Found ${records.length} record(s) to process`);

  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const url = record.getCellValue("url");

    // Update all records with a new llm_result value
    if (url) {
      await table.updateRecordAsync(record.id, {
        llm_result: "some new value",
      });
      updated++;
      logger.log(
        `  ✅ Updated record: ${record.id} → llm_result: "some new value"`
      );
    } else {
      skipped++;
      logger.log(`  ⏭️  Skipped: ${record.id} (no URL)`);
    }
  }

  logger.log(`\n📊 Summary:`);
  logger.log(`   Updated: ${updated}`);
  logger.log(`   Skipped: ${skipped}`);

  return { updated, skipped };
}
