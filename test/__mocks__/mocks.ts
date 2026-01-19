import {
  IAirtableBase,
  IAirtableTable,
  IAirtableRecord,
  IAirtableField,
  IAirtableQueryResult,
  FieldSet,
  RecordSelectOptions,
  ILogger,
} from "../../src/types";
import { valueToString } from "../../src/utils";

export class MockRecord implements IAirtableRecord {
  public id: string;
  public name: string;
  private fields: FieldSet;

  constructor(id: string, fields: FieldSet) {
    this.id = id;
    this.fields = { ...fields };
    // Use 'Name' field as the record name, or fall back to id
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
}

class MockQueryResult implements IAirtableQueryResult {
  public records: MockRecord[];
  private recordMap: Map<string, MockRecord>;

  constructor(records: MockRecord[]) {
    this.records = records;
    this.recordMap = new Map(records.map((r) => [r.id, r]));
  }

  getRecord(recordId: string): MockRecord | undefined {
    return this.recordMap.get(recordId);
  }
}

class MockField implements IAirtableField {
  public id: string;
  public name: string;
  public type: string;
  public options?: unknown;

  constructor(id: string, name: string, type: string = "singleLineText", options?: unknown) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.options = options;
  }
}

export class MockTable implements IAirtableTable {
  public id: string;
  public name: string;
  public fields: MockField[];
  private records: Map<string, MockRecord>;
  private nextRecordId: number;

  public _calls: {
    selectRecordsAsync: RecordSelectOptions[];
    updateRecordAsync: Array<{ id: string; fields: FieldSet }>;
    createRecordAsync: FieldSet[];
    deleteRecordAsync: string[];
  };

  constructor(
    id: string,
    name: string,
    initialRecords: MockRecord[] = [],
    fields: MockField[] = []
  ) {
    this.id = id;
    this.name = name;
    this.fields =
      fields.length > 0
        ? fields
        : [
            new MockField("fldName", "Name", "singleLineText"),
            new MockField("fldStatus", "Status", "singleSelect"),
          ];
    this.records = new Map(initialRecords.map((r) => [r.id, r]));
    this.nextRecordId = initialRecords.length + 1;
    this._calls = {
      selectRecordsAsync: [],
      updateRecordAsync: [],
      createRecordAsync: [],
      deleteRecordAsync: [],
    };
  }

  async selectRecordsAsync(options?: RecordSelectOptions): Promise<MockQueryResult> {
    this._calls.selectRecordsAsync.push(options || {});

    let records = Array.from(this.records.values());

    // Filter by recordIds if specified
    if (options?.recordIds) {
      const idSet = new Set(options.recordIds);
      records = records.filter((r) => idSet.has(r.id));
    }

    // Sort if specified
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

    return new MockQueryResult(records);
  }

  async updateRecordAsync(recordOrId: string | IAirtableRecord, fields: FieldSet): Promise<void> {
    const id = typeof recordOrId === "string" ? recordOrId : recordOrId.id;
    this._calls.updateRecordAsync.push({ id, fields });

    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Record with ID "${id}" not found in table "${this.name}"`);
    }
    record._updateFields(fields);
  }

  async updateRecordsAsync(records: Array<{ id: string; fields: FieldSet }>): Promise<void> {
    for (const { id, fields } of records) {
      await this.updateRecordAsync(id, fields);
    }
  }

  async createRecordAsync(fields: FieldSet): Promise<string> {
    this._calls.createRecordAsync.push(fields);

    const id = `rec${String(this.nextRecordId++).padStart(10, "0")}`;
    const record = new MockRecord(id, fields);
    this.records.set(id, record);
    return id;
  }

  async createRecordsAsync(records: Array<{ fields: FieldSet }>): Promise<string[]> {
    const ids: string[] = [];
    for (const { fields } of records) {
      const id = await this.createRecordAsync(fields);
      ids.push(id);
    }
    return ids;
  }

  async deleteRecordAsync(recordOrId: string | IAirtableRecord): Promise<void> {
    const id = typeof recordOrId === "string" ? recordOrId : recordOrId.id;
    this._calls.deleteRecordAsync.push(id);

    if (!this.records.has(id)) {
      throw new Error(`Record with ID "${id}" not found in table "${this.name}"`);
    }
    this.records.delete(id);
  }

  async deleteRecordsAsync(recordsOrIds: Array<string | IAirtableRecord>): Promise<void> {
    for (const recordOrId of recordsOrIds) {
      await this.deleteRecordAsync(recordOrId);
    }
  }

  getField(nameOrId: string): IAirtableField {
    const field = this.fields.find((f) => f.name === nameOrId || f.id === nameOrId);
    if (!field) {
      throw new Error(`Field "${nameOrId}" not found in table "${this.name}"`);
    }
    return field;
  }

  _getRecord(id: string): MockRecord | undefined {
    return this.records.get(id);
  }
}

export class MockBase implements IAirtableBase {
  public tables: MockTable[];
  private tableMap: Map<string, MockTable>;

  constructor(tables: MockTable[] = []) {
    this.tables = tables;
    this.tableMap = new Map();
    for (const table of tables) {
      this.tableMap.set(table.id, table);
      this.tableMap.set(table.name, table);
    }
  }

  getTable(nameOrId: string): IAirtableTable {
    const table = this.tableMap.get(nameOrId);
    if (!table) {
      throw new Error(`Table "${nameOrId}" not found in base`);
    }
    return table;
  }

  addTable(name: string, records: Array<Record<string, unknown>>): MockTable {
    const mockRecords = records.map(
      (r) => new MockRecord((r.id as string) || `rec${Math.random().toString(36).slice(2)}`, r)
    );
    const table = new MockTable(name, name, mockRecords);
    this.tables.push(table);
    this.tableMap.set(name, table);
    return table;
  }
}

export class MockLogger implements ILogger {
  public logs: string[] = [];
  public errors: string[] = [];
  public warnings: string[] = [];

  log(message: string): void {
    this.logs.push(message);
  }

  inspect(data: unknown, label?: string): void {
    this.logs.push(label || JSON.stringify(data));
  }

  error(message: string): void {
    this.errors.push(message);
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  clear(): void {
    this.logs = [];
    this.errors = [];
    this.warnings = [];
  }

  hasLog(message: string): boolean {
    return this.logs.some((l) => l.includes(message));
  }
}

export function createMockBaseWithSampleData(): {
  base: MockBase;
  table: MockTable;
  records: MockRecord[];
} {
  const records = [
    new MockRecord("rec001", {
      Name: "Task 1",
      Status: "Pending",
      Priority: "High",
    }),
    new MockRecord("rec002", {
      Name: "Task 2",
      Status: "Completed",
      Priority: "Medium",
    }),
    new MockRecord("rec003", {
      Name: "Task 3",
      Status: "Pending",
      Priority: "Low",
    }),
    new MockRecord("rec004", {
      Name: "Task 4",
      Status: "In Progress",
      Priority: "High",
    }),
    new MockRecord("rec005", {
      Name: "Task 5",
      Status: "Pending",
      Priority: "Medium",
    }),
  ];

  const fields = [
    new MockField("fldName", "Name", "singleLineText"),
    new MockField("fldStatus", "Status", "singleSelect", {
      choices: [{ name: "Pending" }, { name: "In Progress" }, { name: "Completed" }],
    }),
    new MockField("fldPriority", "Priority", "singleSelect", {
      choices: [{ name: "Low" }, { name: "Medium" }, { name: "High" }],
    }),
  ];

  const table = new MockTable("tblTasks", "Tasks", records, fields);
  const base = new MockBase([table]);

  return { base, table, records };
}
