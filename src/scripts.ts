/**
 * Complex Airtable Script Examples
 *
 * These demonstrate real-world use cases for Airtable automation:
 * - Data analysis and reporting
 * - Cross-table operations
 * - Batch processing with progress
 * - Data validation and cleanup
 */

import { IAirtableBase, IAirtableRecord, ILogger } from "./interfaces";

/**
 * Analyze records and generate a summary report
 * Groups records by a field and counts them
 */
export async function generateFieldAnalysis(
  base: IAirtableBase,
  tableName: string,
  fieldName: string,
  logger: ILogger
): Promise<Map<string, number>> {
  logger.log(`\n📊 Analyzing "${fieldName}" in "${tableName}"...`);

  const table = base.getTable(tableName);
  const { records } = await table.selectRecordsAsync();

  const counts = new Map<string, number>();
  let nullCount = 0;

  for (const record of records) {
    const value = record.getCellValue(fieldName);

    if (value === null || value === undefined) {
      nullCount++;
      continue;
    }

    const key = String(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  // Sort by count descending
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  logger.log(`\n📈 Distribution of "${fieldName}":`);
  logger.log(`${"─".repeat(40)}`);

  for (const [value, count] of sorted) {
    const percentage = ((count / records.length) * 100).toFixed(1);
    const bar = "█".repeat(Math.round((count / records.length) * 20));
    logger.log(
      `  ${value.padEnd(20)} ${count
        .toString()
        .padStart(4)} (${percentage}%) ${bar}`
    );
  }

  if (nullCount > 0) {
    logger.log(
      `  ${"(empty)".padEnd(20)} ${nullCount.toString().padStart(4)} (${(
        (nullCount / records.length) *
        100
      ).toFixed(1)}%)`
    );
  }

  logger.log(`${"─".repeat(40)}`);
  logger.log(`  Total records: ${records.length}`);

  return counts;
}

/**
 * Find duplicate records based on a field
 */
export async function findDuplicates(
  base: IAirtableBase,
  tableName: string,
  fieldName: string,
  logger: ILogger
): Promise<Map<string, IAirtableRecord[]>> {
  logger.log(`\n🔍 Finding duplicates in "${tableName}" by "${fieldName}"...`);

  const table = base.getTable(tableName);
  const { records } = await table.selectRecordsAsync();

  // Group records by field value
  const groups = new Map<string, IAirtableRecord[]>();

  for (const record of records) {
    const value = record.getCellValueAsString(fieldName);
    if (!value) continue;

    const existing = groups.get(value) || [];
    existing.push(record);
    groups.set(value, existing);
  }

  // Filter to only duplicates
  const duplicates = new Map<string, IAirtableRecord[]>();
  for (const [value, recordList] of groups) {
    if (recordList.length > 1) {
      duplicates.set(value, recordList);
    }
  }

  if (duplicates.size === 0) {
    logger.log(`✅ No duplicates found!`);
  } else {
    logger.log(`\n⚠️  Found ${duplicates.size} duplicate value(s):`);
    for (const [value, recordList] of duplicates) {
      logger.log(`\n  "${value}" appears ${recordList.length} times:`);
      for (const record of recordList) {
        logger.log(`    - ${record.id}: ${record.name}`);
      }
    }
  }

  return duplicates;
}

/**
 * Batch update records with progress tracking
 */
export async function batchUpdateWithProgress(
  base: IAirtableBase,
  tableName: string,
  filterFn: (record: IAirtableRecord) => boolean,
  updateFn: (record: IAirtableRecord) => Record<string, unknown>,
  logger: ILogger
): Promise<{ updated: number; skipped: number; errors: number }> {
  logger.log(`\n⚡ Starting batch update on "${tableName}"...`);

  const table = base.getTable(tableName);
  const { records } = await table.selectRecordsAsync();

  const toUpdate = records.filter(filterFn);
  const total = toUpdate.length;

  logger.log(
    `📋 Found ${total} records to update (${
      records.length - total
    } skipped by filter)`
  );

  let updated = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < toUpdate.length; i++) {
    const record = toUpdate[i];

    // Progress indicator every 10 records or at the end
    if (i % 10 === 0 || i === toUpdate.length - 1) {
      const progress = Math.round(((i + 1) / total) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.log(
        `  Progress: ${progress}% (${i + 1}/${total}) - ${elapsed}s elapsed`
      );
    }

    try {
      const fields = updateFn(record);
      await table.updateRecordAsync(record.id, fields);
      updated++;
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`  ✗ Failed to update ${record.id}: ${msg}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.log(`\n✅ Batch update complete in ${totalTime}s`);
  logger.log(
    `   Updated: ${updated}, Skipped: ${
      records.length - total
    }, Errors: ${errors}`
  );

  return { updated, skipped: records.length - total, errors };
}

/**
 * Cross-reference two tables and find orphaned records
 */
export async function findOrphanedRecords(
  base: IAirtableBase,
  sourceTable: string,
  sourceField: string,
  targetTable: string,
  targetField: string,
  logger: ILogger
): Promise<IAirtableRecord[]> {
  logger.log(
    `\n🔗 Cross-referencing "${sourceTable}.${sourceField}" → "${targetTable}.${targetField}"...`
  );

  const source = base.getTable(sourceTable);
  const target = base.getTable(targetTable);

  const [sourceResult, targetResult] = await Promise.all([
    source.selectRecordsAsync(),
    target.selectRecordsAsync(),
  ]);

  // Build set of valid target values
  const validValues = new Set<string>();
  for (const record of targetResult.records) {
    const value = record.getCellValueAsString(targetField);
    if (value) validValues.add(value);
  }

  // Find source records with no matching target
  const orphaned: IAirtableRecord[] = [];
  for (const record of sourceResult.records) {
    const value = record.getCellValueAsString(sourceField);
    if (value && !validValues.has(value)) {
      orphaned.push(record);
    }
  }

  if (orphaned.length === 0) {
    logger.log(`✅ All records have valid references!`);
  } else {
    logger.log(`\n⚠️  Found ${orphaned.length} orphaned record(s):`);
    for (const record of orphaned.slice(0, 10)) {
      const value = record.getCellValueAsString(sourceField);
      logger.log(`  - ${record.name}: "${value}" not found in ${targetTable}`);
    }
    if (orphaned.length > 10) {
      logger.log(`  ... and ${orphaned.length - 10} more`);
    }
  }

  return orphaned;
}

/**
 * Calculate statistics for numeric fields
 */
export async function calculateNumericStats(
  base: IAirtableBase,
  tableName: string,
  fieldName: string,
  logger: ILogger
): Promise<{
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  median: number;
}> {
  logger.log(
    `\n🔢 Calculating statistics for "${fieldName}" in "${tableName}"...`
  );

  const table = base.getTable(tableName);
  const { records } = await table.selectRecordsAsync();

  const values: number[] = [];
  for (const record of records) {
    const value = record.getCellValue(fieldName);
    if (typeof value === "number") {
      values.push(value);
    }
  }

  if (values.length === 0) {
    logger.warn(`No numeric values found in "${fieldName}"`);
    return { count: 0, sum: 0, avg: 0, min: 0, max: 0, median: 0 };
  }

  values.sort((a, b) => a - b);

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = values[0];
  const max = values[values.length - 1];
  const median =
    values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];

  logger.log(`\n📊 Statistics for "${fieldName}":`);
  logger.log(`${"─".repeat(30)}`);
  logger.log(`  Count:  ${values.length}`);
  logger.log(`  Sum:    ${sum.toLocaleString()}`);
  logger.log(`  Avg:    ${avg.toFixed(2)}`);
  logger.log(`  Min:    ${min.toLocaleString()}`);
  logger.log(`  Max:    ${max.toLocaleString()}`);
  logger.log(`  Median: ${median.toFixed(2)}`);
  logger.log(`${"─".repeat(30)}`);

  return { count: values.length, sum, avg, min, max, median };
}

/**
 * Generate a text-based report of table contents
 */
export async function generateTableReport(
  base: IAirtableBase,
  tableName: string,
  fields: string[],
  logger: ILogger
): Promise<string> {
  logger.log(`\n📝 Generating report for "${tableName}"...`);

  const table = base.getTable(tableName);
  const { records } = await table.selectRecordsAsync();

  const lines: string[] = [];
  lines.push(`\n${"═".repeat(60)}`);
  lines.push(`  TABLE REPORT: ${tableName}`);
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push(`  Total Records: ${records.length}`);
  lines.push(`${"═".repeat(60)}\n`);

  // Header
  const header = fields.map((f) => f.padEnd(15)).join(" | ");
  lines.push(header);
  lines.push("─".repeat(header.length));

  // Data rows
  for (const record of records.slice(0, 20)) {
    const row = fields
      .map((field) => {
        const value = record.getCellValueAsString(field);
        return (value || "-").substring(0, 15).padEnd(15);
      })
      .join(" | ");
    lines.push(row);
  }

  if (records.length > 20) {
    lines.push(`... and ${records.length - 20} more records`);
  }

  lines.push(`\n${"═".repeat(60)}`);

  const report = lines.join("\n");
  logger.log(report);

  return report;
}

/**
 * Search records across all tables for a value
 */
export async function searchAllTables(
  base: IAirtableBase,
  searchTerm: string,
  logger: ILogger
): Promise<Map<string, IAirtableRecord[]>> {
  logger.log(`\n🔎 Searching all tables for "${searchTerm}"...`);

  const results = new Map<string, IAirtableRecord[]>();
  const searchLower = searchTerm.toLowerCase();

  for (const table of base.tables) {
    const { records } = await table.selectRecordsAsync();
    const matches: IAirtableRecord[] = [];

    for (const record of records) {
      // Search in record name
      if (record.name.toLowerCase().includes(searchLower)) {
        matches.push(record);
      }
    }

    if (matches.length > 0) {
      results.set(table.name, matches);
    }
  }

  const totalMatches = [...results.values()].reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  if (totalMatches === 0) {
    logger.log(`  No matches found for "${searchTerm}"`);
  } else {
    logger.log(
      `\n✅ Found ${totalMatches} match(es) across ${results.size} table(s):`
    );
    for (const [tableName, matches] of results) {
      logger.log(`\n  📁 ${tableName} (${matches.length} matches):`);
      for (const record of matches.slice(0, 5)) {
        logger.log(`    - ${record.name} (${record.id})`);
      }
      if (matches.length > 5) {
        logger.log(`    ... and ${matches.length - 5} more`);
      }
    }
  }

  return results;
}
