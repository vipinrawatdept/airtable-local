import { IAirtableBase, ILogger } from "../types";

export async function runScript(base: IAirtableBase, logger: ILogger): Promise<void> {
  logger.log("🚀 Script started");

  try {
    const tables = base.tables;
    logger.log(`📊 Found ${tables.length} table(s) in this base`);

    for (const table of tables) {
      logger.log(`  - ${table.name} (${table.id})`);
    }

    if (tables.length > 0) {
      const firstTable = tables[0];
      logger.log(`\n📋 Fetching records from "${firstTable.name}"...`);

      const queryResult = await firstTable.selectRecordsAsync();
      const records = queryResult.records;

      logger.log(`✅ Retrieved ${records.length} record(s)`);

      const recordsToShow = records.slice(0, 5);
      for (const record of recordsToShow) {
        logger.log(`  - Record: ${record.name} (${record.id})`);
      }

      if (records.length > 5) {
        logger.log(`  ... and ${records.length - 5} more`);
      }

      await updateRecordsScript(base, firstTable.name, logger);
    }

    logger.log("\n✨ Script completed successfully!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Script failed: ${errorMessage}`);
    throw error;
  }
}

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
      const status = record.getCellValue("Status");

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

export interface UpdateRecordsConfig {
  sourceField: string;
  targetField: string;
  targetValue: unknown;
  skipCondition?: (value: unknown) => boolean;
}

const DEFAULT_UPDATE_CONFIG: UpdateRecordsConfig = {
  sourceField: "url",
  targetField: "llm_result",
  targetValue: "some new value",
  skipCondition: (value) => !value,
};

export async function updateRecordsScript(
  base: IAirtableBase,
  tableName: string,
  logger: ILogger,
  config: UpdateRecordsConfig = DEFAULT_UPDATE_CONFIG
): Promise<{ updated: number; skipped: number }> {
  logger.log(`\n🔄 Starting update records script on "${tableName}"...`);

  const table = base.getTable(tableName);
  const queryResult = await table.selectRecordsAsync();
  const records = queryResult.records;

  logger.log(`📋 Found ${records.length} record(s) to process`);

  let updated = 0;
  let skipped = 0;

  const shouldSkip = config.skipCondition || ((v) => !v);

  for (const record of records) {
    const sourceValue = record.getCellValue(config.sourceField);

    if (!shouldSkip(sourceValue)) {
      await table.updateRecordAsync(record.id, {
        [config.targetField]: config.targetValue,
      });
      updated++;
      logger.log(
        `  ✅ Updated record: ${record.id} → ${config.targetField}: "${config.targetValue}"`
      );
    } else {
      skipped++;
      logger.log(`  ⏭️  Skipped: ${record.id} (no ${config.sourceField})`);
    }
  }

  logger.log(`\n📊 Summary:`);
  logger.log(`   Updated: ${updated}`);
  logger.log(`   Skipped: ${skipped}`);

  return { updated, skipped };
}

export async function archiveOldRecords(
  base: IAirtableBase,
  tableName: string,
  dateField: string,
  daysOld: number,
  logger: ILogger
): Promise<{ archived: number; total: number }> {
  logger.log(`\n🗄️  Archiving records older than ${daysOld} days from "${tableName}"...`);

  const table = base.getTable(tableName);
  const queryResult = await table.selectRecordsAsync();
  const records = queryResult.records;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  let archived = 0;

  for (const record of records) {
    const dateValue = record.getCellValue(dateField);
    if (!dateValue) continue;

    const recordDate = new Date(String(dateValue));
    if (recordDate < cutoffDate) {
      await table.updateRecordAsync(record.id, {
        Archived: true,
        "Archived Date": new Date().toISOString(),
      });
      archived++;
      logger.log(
        `  📦 Archived: ${record.name} (${dateField}: ${recordDate.toLocaleDateString()})`
      );
    }
  }

  logger.log(`\n📊 Archive Summary: ${archived} of ${records.length} records archived`);
  return { archived, total: records.length };
}

export async function findDuplicatesByField(
  base: IAirtableBase,
  tableName: string,
  fieldName: string,
  logger: ILogger
): Promise<{ duplicates: Map<string, string[]>; count: number }> {
  logger.log(`\n🔍 Finding duplicates in "${tableName}" by field "${fieldName}"...`);

  const table = base.getTable(tableName);
  const queryResult = await table.selectRecordsAsync();
  const records = queryResult.records;

  const valueMap = new Map<string, string[]>();

  for (const record of records) {
    const value = record.getCellValue(fieldName);
    if (!value) continue;

    const key = String(value).toLowerCase().trim();
    if (!valueMap.has(key)) {
      valueMap.set(key, []);
    }
    valueMap.get(key)!.push(record.id);
  }

  const duplicates = new Map<string, string[]>();
  let totalDuplicates = 0;

  for (const [value, recordIds] of valueMap.entries()) {
    if (recordIds.length > 1) {
      duplicates.set(value, recordIds);
      totalDuplicates += recordIds.length - 1;
      logger.log(`  🔄 "${value}": ${recordIds.length} records (${recordIds.join(", ")})`);
    }
  }

  logger.log(
    `\n📊 Found ${duplicates.size} unique values with duplicates (${totalDuplicates} duplicate records)`
  );
  return { duplicates, count: totalDuplicates };
}

export async function copyRecordsBetweenTables(
  base: IAirtableBase,
  sourceTableName: string,
  targetTableName: string,
  fieldMapping: Record<string, string>,
  filterFn: (record: any) => boolean,
  logger: ILogger
): Promise<{ copied: number; skipped: number }> {
  logger.log(`\n📋 Copying records from "${sourceTableName}" to "${targetTableName}"...`);

  const sourceTable = base.getTable(sourceTableName);
  const targetTable = base.getTable(targetTableName);

  const queryResult = await sourceTable.selectRecordsAsync();
  const records = queryResult.records;

  let copied = 0;
  let skipped = 0;

  for (const record of records) {
    if (!filterFn(record)) {
      skipped++;
      continue;
    }

    const newFields: Record<string, unknown> = {};
    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      const value = record.getCellValue(sourceField);
      if (value !== null && value !== undefined) {
        newFields[targetField] = value;
      }
    }

    await targetTable.createRecordAsync(newFields);
    copied++;
    logger.log(`  ✅ Copied: ${record.name}`);
  }

  logger.log(`\n📊 Copy Summary: ${copied} copied, ${skipped} skipped`);
  return { copied, skipped };
}

export async function bulkUpdateByCondition(
  base: IAirtableBase,
  tableName: string,
  conditions: Array<{ field: string; value: unknown; updates: Record<string, unknown> }>,
  logger: ILogger
): Promise<{ updated: number; total: number }> {
  logger.log(`\n⚡ Bulk updating records in "${tableName}"...`);

  const table = base.getTable(tableName);
  const queryResult = await table.selectRecordsAsync();
  const records = queryResult.records;

  let updated = 0;

  for (const record of records) {
    for (const condition of conditions) {
      const fieldValue = record.getCellValue(condition.field);
      if (fieldValue === condition.value) {
        await table.updateRecordAsync(record.id, condition.updates);
        updated++;
        logger.log(`  ✅ Updated ${record.name}: ${condition.field}=${condition.value}`);
        break;
      }
    }
  }

  logger.log(`\n📊 Updated ${updated} of ${records.length} records`);
  return { updated, total: records.length };
}

export async function generateTableStatistics(
  base: IAirtableBase,
  tableName: string,
  groupByField: string,
  logger: ILogger
): Promise<Map<string, number>> {
  logger.log(`\n📈 Generating statistics for "${tableName}" grouped by "${groupByField}"...`);

  const table = base.getTable(tableName);
  const queryResult = await table.selectRecordsAsync();
  const records = queryResult.records;

  const stats = new Map<string, number>();

  for (const record of records) {
    const value = record.getCellValue(groupByField);
    const key = value ? String(value) : "(empty)";
    stats.set(key, (stats.get(key) || 0) + 1);
  }

  logger.log(`\n📊 Statistics:`);
  const sortedStats = Array.from(stats.entries()).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sortedStats) {
    const percentage = ((count / records.length) * 100).toFixed(1);
    logger.log(`  ${key}: ${count} (${percentage}%)`);
  }

  logger.log(`\n📋 Total records: ${records.length}`);
  return stats;
}

export async function cleanupEmptyRecords(
  base: IAirtableBase,
  tableName: string,
  requiredFields: string[],
  logger: ILogger
): Promise<{ deleted: number; total: number }> {
  logger.log(`\n🧹 Cleaning up empty records from "${tableName}"...`);
  logger.log(`   Required fields: ${requiredFields.join(", ")}`);

  const table = base.getTable(tableName);
  const queryResult = await table.selectRecordsAsync();
  const records = queryResult.records;

  const recordsToDelete: string[] = [];

  for (const record of records) {
    const isEmpty = requiredFields.every((field) => {
      const value = record.getCellValue(field);
      return value === null || value === undefined || value === "";
    });

    if (isEmpty) {
      recordsToDelete.push(record.id);
      logger.log(`  🗑️  Marked for deletion: ${record.id}`);
    }
  }

  if (recordsToDelete.length > 0) {
    await table.deleteRecordsAsync(recordsToDelete);
    logger.log(`\n✅ Deleted ${recordsToDelete.length} empty records`);
  } else {
    logger.log(`\n✅ No empty records found`);
  }

  return { deleted: recordsToDelete.length, total: records.length };
}
