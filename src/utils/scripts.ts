import { IAirtableBase, IAirtableRecord, ILogger } from "../types";

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

  const header = fields.map((f) => f.padEnd(15)).join(" | ");
  lines.push(header);
  lines.push("─".repeat(header.length));

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
