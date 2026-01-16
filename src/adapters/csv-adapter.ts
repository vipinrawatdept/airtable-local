import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
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

class CsvRecordAdapter implements IAirtableRecord {
  public id: string;
  public name: string;
  private fields: FieldSet;

  constructor(id: string, fields: FieldSet) {
    this.id = id;
    this.fields = { ...fields };
    this.name = (fields["Name"] as string) || id;
  }

  getCellValue(fieldNameOrId: string): unknown {
    return this.fields[fieldNameOrId] ?? null;
  }

  getCellValueAsString(fieldNameOrId: string): string {
    return valueToString(this.getCellValue(fieldNameOrId));
  }

  _updateFields(fields: FieldSet): void {
    Object.assign(this.fields, fields);
    if (fields["Name"] !== undefined) {
      this.name = fields["Name"] as string;
    }
  }

  _getAllFields(): FieldSet {
    return { ...this.fields };
  }
}

class CsvQueryResultAdapter implements IAirtableQueryResult {
  public records: IAirtableRecord[];
  private recordMap: Map<string, IAirtableRecord>;

  constructor(records: IAirtableRecord[]) {
    this.records = records;
    this.recordMap = new Map(records.map((r) => [r.id, r]));
  }

  getRecord(recordId: string): IAirtableRecord | undefined {
    return this.recordMap.get(recordId);
  }
}

class CsvTableAdapter implements IAirtableTable {
  public id: string;
  public name: string;
  public fields: IAirtableField[] = [];
  private records: Map<string, CsvRecordAdapter>;
  private csvFilePath: string;
  private fieldNames: string[];
  private nextRecordId: number;
  private autoSave: boolean;

  constructor(name: string, csvFilePath: string, autoSave: boolean = false) {
    this.name = name;
    this.id = name;
    this.csvFilePath = csvFilePath;
    this.records = new Map();
    this.fieldNames = [];
    this.nextRecordId = 1;
    this.autoSave = autoSave;

    this.loadFromCsv();
  }

  private loadFromCsv(): void {
    if (!fs.existsSync(this.csvFilePath)) {
      console.warn(`CSV file not found: ${this.csvFilePath}`);
      return;
    }

    const content = fs.readFileSync(this.csvFilePath, "utf-8");
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    if (rows.length === 0) {
      return;
    }

    this.fieldNames = Object.keys(rows[0]);
    this.fields = this.fieldNames.map((name, index) => ({
      id: `fld${index}`,
      name,
      type: "singleLineText",
    }));

    for (const row of rows) {
      const id = row.id || row.Id || row.ID || `rec${this.nextRecordId++}`;

      const fields: FieldSet = {};
      for (const [key, value] of Object.entries(row)) {
        if (key.toLowerCase() !== "id") {
          fields[key] = this.parseValue(value);
        }
      }

      const record = new CsvRecordAdapter(id, fields);
      this.records.set(id, record);
    }

    const maxId = Math.max(
      ...Array.from(this.records.keys()).map(
        (id) => parseInt(id.replace(/\D/g, "")) || 0
      )
    );
    this.nextRecordId = maxId + 1;
  }

  private parseValue(value: string): unknown {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;

    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") {
      return num;
    }

    if (
      (value.startsWith("[") && value.endsWith("]")) ||
      (value.startsWith("{") && value.endsWith("}"))
    ) {
      try {
        return JSON.parse(value);
      } catch {
        // Not valid JSON
      }
    }

    return value;
  }

  private saveToCsv(): void {
    if (!this.autoSave) return;

    const records = Array.from(this.records.values());
    const rows = records.map((record) => ({
      id: record.id,
      ...record._getAllFields(),
    }));

    const output = stringify(rows, {
      header: true,
      columns: [
        "id",
        ...this.fieldNames.filter((f) => f.toLowerCase() !== "id"),
      ],
    });

    fs.writeFileSync(this.csvFilePath, output, "utf-8");
  }

  async selectRecordsAsync(
    options?: RecordSelectOptions
  ): Promise<IAirtableQueryResult> {
    let records = Array.from(this.records.values()) as IAirtableRecord[];

    if (options?.recordIds) {
      const idSet = new Set(options.recordIds);
      records = records.filter((r) => idSet.has(r.id));
    }

    if (options?.sorts) {
      for (const sort of [...options.sorts].reverse()) {
        records.sort((a, b) => {
          const aVal = String(a.getCellValue(sort.field) ?? "");
          const bVal = String(b.getCellValue(sort.field) ?? "");
          const comparison = aVal.localeCompare(bVal);
          return sort.direction === "desc" ? -comparison : comparison;
        });
      }
    }

    return new CsvQueryResultAdapter(records);
  }

  async updateRecordAsync(
    recordOrId: string | IAirtableRecord,
    fields: FieldSet
  ): Promise<void> {
    const id = typeof recordOrId === "string" ? recordOrId : recordOrId.id;
    const record = this.records.get(id);

    if (!record) {
      throw new Error(
        `Record with ID "${id}" not found in table "${this.name}"`
      );
    }

    record._updateFields(fields);
    this.saveToCsv();
  }

  async updateRecordsAsync(
    records: Array<{ id: string; fields: FieldSet }>
  ): Promise<void> {
    for (const { id, fields } of records) {
      await this.updateRecordAsync(id, fields);
    }
  }

  async createRecordAsync(fields: FieldSet): Promise<string> {
    const id = `rec${String(this.nextRecordId++).padStart(10, "0")}`;
    const record = new CsvRecordAdapter(id, fields);
    this.records.set(id, record);
    this.saveToCsv();
    return id;
  }

  async createRecordsAsync(
    records: Array<{ fields: FieldSet }>
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const { fields } of records) {
      const id = await this.createRecordAsync(fields);
      ids.push(id);
    }
    return ids;
  }

  async deleteRecordAsync(recordOrId: string | IAirtableRecord): Promise<void> {
    const id = typeof recordOrId === "string" ? recordOrId : recordOrId.id;

    if (!this.records.has(id)) {
      throw new Error(
        `Record with ID "${id}" not found in table "${this.name}"`
      );
    }

    this.records.delete(id);
    this.saveToCsv();
  }

  async deleteRecordsAsync(
    recordsOrIds: Array<string | IAirtableRecord>
  ): Promise<void> {
    for (const recordOrId of recordsOrIds) {
      await this.deleteRecordAsync(recordOrId);
    }
  }

  getField(nameOrId: string): IAirtableField {
    const field = this.fields.find(
      (f) => f.name === nameOrId || f.id === nameOrId
    );
    if (!field) {
      throw new Error(`Field "${nameOrId}" not found in table "${this.name}"`);
    }
    return field;
  }
}

export class CsvBaseAdapter implements IAirtableBase {
  public tables: IAirtableTable[] = [];
  private tableMap: Map<string, IAirtableTable> = new Map();
  private dataDir: string;
  private autoSave: boolean;

  constructor(dataDir: string, autoSave: boolean = false) {
    this.dataDir = dataDir;
    this.autoSave = autoSave;
    this.loadTables();
  }

  private loadTables(): void {
    if (!fs.existsSync(this.dataDir)) {
      console.warn(`Data directory not found: ${this.dataDir}`);
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`Created data directory: ${this.dataDir}`);
      return;
    }

    const files = fs.readdirSync(this.dataDir);
    const csvFiles = files.filter((f) => f.endsWith(".csv"));

    for (const file of csvFiles) {
      const tableName = path.basename(file, ".csv");
      const filePath = path.join(this.dataDir, file);
      const table = new CsvTableAdapter(tableName, filePath, this.autoSave);

      this.tables.push(table);
      this.tableMap.set(tableName, table);
    }

    console.log(
      `📂 Loaded ${csvFiles.length} table(s) from CSV: ${csvFiles
        .map((f) => path.basename(f, ".csv"))
        .join(", ")}`
    );
  }

  getTable(nameOrId: string): IAirtableTable {
    const table = this.tableMap.get(nameOrId);
    if (!table) {
      throw new Error(
        `Table "${nameOrId}" not found. Available tables: ${Array.from(
          this.tableMap.keys()
        ).join(", ")}`
      );
    }
    return table;
  }
}

export function createCsvBaseFromEnv(): CsvBaseAdapter {
  const dataDir = process.env.CSV_DATA_DIR || "./data";
  const autoSave = process.env.CSV_AUTO_SAVE === "true";

  return new CsvBaseAdapter(dataDir, autoSave);
}
