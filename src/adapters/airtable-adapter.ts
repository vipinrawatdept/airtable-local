/**
 * Airtable SDK Adapter
 *
 * This adapter wraps the official Airtable.js SDK to conform to our
 * IAirtable* interfaces, allowing you to run scripts locally against
 * a real Airtable base.
 *
 * Usage:
 *   1. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env
 *   2. Run: npm run local
 */

import Airtable from "airtable";
import type {
  FieldSet as AirtableFieldSet,
  Records,
  Record as AirtableRecord,
} from "airtable";
import {
  IAirtableBase,
  IAirtableTable,
  IAirtableRecord,
  IAirtableField,
  IAirtableQueryResult,
  FieldSet,
  RecordSelectOptions,
} from "../types";
import { valueToString } from "../utils";

/**
 * Adapter for Airtable SDK Record
 */
class AirtableRecordAdapter implements IAirtableRecord {
  public id: string;
  public name: string;
  private record: AirtableRecord<AirtableFieldSet>;

  constructor(record: AirtableRecord<AirtableFieldSet>) {
    this.record = record;
    this.id = record.id;
    // Use the first field or 'Name' field as the record name
    this.name = (record.get("Name") as string) || record.id;
  }

  getCellValue(fieldNameOrId: string): unknown {
    return this.record.get(fieldNameOrId) ?? null;
  }

  getCellValueAsString(fieldNameOrId: string): string {
    return valueToString(this.getCellValue(fieldNameOrId));
  }
}

/**
 * Adapter for Airtable SDK Query Result
 */
class AirtableQueryResultAdapter implements IAirtableQueryResult {
  public records: IAirtableRecord[];
  private recordMap: Map<string, IAirtableRecord>;

  constructor(records: Records<AirtableFieldSet>) {
    this.records = records.map((r) => new AirtableRecordAdapter(r));
    this.recordMap = new Map(this.records.map((r) => [r.id, r]));
  }

  getRecord(recordId: string): IAirtableRecord | undefined {
    return this.recordMap.get(recordId);
  }
}

/**
 * Adapter for Airtable SDK Table
 */
class AirtableTableAdapter implements IAirtableTable {
  public id: string;
  public name: string;
  public fields: IAirtableField[] = []; // SDK doesn't expose fields directly
  private table: Airtable.Table<AirtableFieldSet>;

  constructor(tableName: string, airtableBase: Airtable.Base) {
    this.name = tableName;
    this.id = tableName; // SDK uses name as identifier
    this.table = airtableBase(tableName);
  }

  async selectRecordsAsync(
    options?: RecordSelectOptions
  ): Promise<IAirtableQueryResult> {
    const selectOptions: Airtable.SelectOptions<AirtableFieldSet> = {};

    if (options?.fields) {
      selectOptions.fields = options.fields;
    }

    if (options?.sorts) {
      selectOptions.sort = options.sorts.map((s) => ({
        field: s.field,
        direction: s.direction || "asc",
      }));
    }

    // Fetch all records (paginated automatically)
    const records = await this.table.select(selectOptions).all();

    // Filter by recordIds if specified (SDK doesn't support this directly)
    if (options?.recordIds) {
      const idSet = new Set(options.recordIds);
      const filtered = records.filter((r) => idSet.has(r.id));
      return new AirtableQueryResultAdapter(filtered);
    }

    return new AirtableQueryResultAdapter(records);
  }

  async updateRecordAsync(
    recordOrId: string | IAirtableRecord,
    fields: FieldSet
  ): Promise<void> {
    const id = typeof recordOrId === "string" ? recordOrId : recordOrId.id;
    await this.table.update(id, fields as AirtableFieldSet);
  }

  async updateRecordsAsync(
    records: Array<{ id: string; fields: FieldSet }>
  ): Promise<void> {
    // Airtable API allows max 10 records per batch
    const batchSize = 10;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize).map((r) => ({
        id: r.id,
        fields: r.fields as AirtableFieldSet,
      }));
      await this.table.update(batch);
    }
  }

  async createRecordAsync(fields: FieldSet): Promise<string> {
    const record = await this.table.create(fields as AirtableFieldSet);
    return record.id;
  }

  async createRecordsAsync(
    records: Array<{ fields: FieldSet }>
  ): Promise<string[]> {
    // Airtable API allows max 10 records per batch
    const batchSize = 10;
    const createdIds: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize).map((r) => ({
        fields: r.fields as AirtableFieldSet,
      }));
      const created = await this.table.create(batch);
      createdIds.push(...created.map((r) => r.id));
    }

    return createdIds;
  }

  async deleteRecordAsync(recordOrId: string | IAirtableRecord): Promise<void> {
    const id = typeof recordOrId === "string" ? recordOrId : recordOrId.id;
    await this.table.destroy(id);
  }

  async deleteRecordsAsync(
    recordsOrIds: Array<string | IAirtableRecord>
  ): Promise<void> {
    const ids = recordsOrIds.map((r) => (typeof r === "string" ? r : r.id));
    // Airtable API allows max 10 records per batch
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      await this.table.destroy(batch);
    }
  }

  getField(nameOrId: string): IAirtableField {
    // SDK doesn't expose field metadata directly
    // Return a placeholder - you'd need to use Airtable Metadata API for full support
    return {
      id: nameOrId,
      name: nameOrId,
      type: "unknown",
    };
  }
}

/**
 * Adapter for Airtable SDK Base
 *
 * Can automatically fetch table names from Airtable Metadata API
 * if no table names are provided.
 */
export class AirtableBaseAdapter implements IAirtableBase {
  public tables: IAirtableTable[] = [];
  private airtableBase: Airtable.Base;
  private tableMap: Map<string, IAirtableTable> = new Map();
  private apiKey: string;
  private baseId: string;

  constructor(apiKey: string, baseId: string, tableNames: string[] = []) {
    this.apiKey = apiKey;
    this.baseId = baseId;
    Airtable.configure({ apiKey });
    this.airtableBase = Airtable.base(baseId);

    // Create table adapters for specified tables
    for (const tableName of tableNames) {
      const tableAdapter = new AirtableTableAdapter(
        tableName,
        this.airtableBase
      );
      this.tables.push(tableAdapter);
      this.tableMap.set(tableName, tableAdapter);
    }
  }

  /**
   * Fetch table names from Airtable Metadata API
   * Requires `schema.bases:read` scope on your API token
   */
  async fetchTableNames(): Promise<string[]> {
    const url = `https://api.airtable.com/v0/meta/bases/${this.baseId}/tables`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch table metadata: ${response.status} ${response.statusText}. ` +
          `Make sure your API token has 'schema.bases:read' scope. Details: ${errorText}`
      );
    }

    const data = (await response.json()) as {
      tables: Array<{ name: string; id: string }>;
    };
    return data.tables.map((t) => t.name);
  }

  /**
   * Load all tables from Airtable Metadata API
   */
  async loadAllTables(): Promise<void> {
    const tableNames = await this.fetchTableNames();

    for (const tableName of tableNames) {
      if (!this.tableMap.has(tableName)) {
        const tableAdapter = new AirtableTableAdapter(
          tableName,
          this.airtableBase
        );
        this.tables.push(tableAdapter);
        this.tableMap.set(tableName, tableAdapter);
      }
    }
  }

  getTable(nameOrId: string): IAirtableTable {
    // If table exists in map, return it
    let table = this.tableMap.get(nameOrId);
    if (table) {
      return table;
    }

    // Otherwise, create a new adapter on-the-fly
    table = new AirtableTableAdapter(nameOrId, this.airtableBase);
    this.tableMap.set(nameOrId, table);
    return table;
  }

  /**
   * Add a table to the known tables list
   */
  addTable(tableName: string): void {
    if (!this.tableMap.has(tableName)) {
      const tableAdapter = new AirtableTableAdapter(
        tableName,
        this.airtableBase
      );
      this.tables.push(tableAdapter);
      this.tableMap.set(tableName, tableAdapter);
    }
  }
}

/**
 * Factory function to create an Airtable base adapter from environment variables
 */
export function createAirtableBaseFromEnv(
  tableNames: string[] = []
): AirtableBaseAdapter {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey) {
    throw new Error("AIRTABLE_API_KEY environment variable is not set");
  }

  if (!baseId) {
    throw new Error("AIRTABLE_BASE_ID environment variable is not set");
  }

  return new AirtableBaseAdapter(apiKey, baseId, tableNames);
}

/**
 * Factory function to create an Airtable base adapter and auto-load all tables
 */
export async function createAirtableBaseWithAutoLoad(): Promise<AirtableBaseAdapter> {
  const base = createAirtableBaseFromEnv([]);
  await base.loadAllTables();
  return base;
}
