import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import Airtable from "airtable";
import { stringify } from "csv-stringify/sync";

async function downloadTables() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const dataDir = process.env.CSV_DATA_DIR || "./data";

  if (!apiKey || !baseId) {
    console.error("❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env");
    process.exit(1);
  }

  Airtable.configure({ apiKey });
  const base = Airtable.base(baseId);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const tableNames = await getTableNames(apiKey, baseId);
  console.log(
    `📋 Found ${tableNames.length} table(s): ${tableNames.join(", ")}\n`
  );

  for (const tableName of tableNames) {
    try {
      console.log(`⬇️  Downloading "${tableName}"...`);
      const records = await base(tableName).select().all();

      if (records.length === 0) {
        console.log(`   ⚠️  No records found, skipping\n`);
        continue;
      }

      const fieldNames = new Set<string>();
      for (const record of records) {
        Object.keys(record.fields).forEach((f) => fieldNames.add(f));
      }

      const rows = records.map((record) => ({
        id: record.id,
        ...Object.fromEntries(
          Array.from(fieldNames).map((field) => [
            field,
            formatValue(record.get(field)),
          ])
        ),
      }));

      const csv = stringify(rows, {
        header: true,
        columns: ["id", ...Array.from(fieldNames)],
      });

      const safeName = tableName.replace(/[^a-zA-Z0-9-_]/g, "_");
      const filePath = path.join(dataDir, `${safeName}.csv`);
      fs.writeFileSync(filePath, csv, "utf-8");

      console.log(`   ✅ Saved ${records.length} records to ${filePath}\n`);
    } catch (error) {
      console.error(
        `   ❌ Failed: ${error instanceof Error ? error.message : error}\n`
      );
    }
  }

  console.log("🎉 Download complete!");
}

async function getTableNames(
  apiKey: string,
  baseId: string
): Promise<string[]> {
  const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const tableNames = process.env.AIRTABLE_TABLE_NAMES?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (tableNames?.length) {
      console.log(
        "⚠️  Could not fetch table list, using AIRTABLE_TABLE_NAMES from .env\n"
      );
      return tableNames;
    }
    throw new Error(
      `Failed to fetch tables. Add schema.bases:read scope or set AIRTABLE_TABLE_NAMES`
    );
  }

  const data = (await response.json()) as { tables: Array<{ name: string }> };
  return data.tables.map((t) => t.name);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

downloadTables();
