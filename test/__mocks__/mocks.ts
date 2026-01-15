/**
 * Mock Airtable Classes for Testing
 *
 * These mocks simulate Airtable's API for local testing with Jest.
 * They implement the interfaces defined in src/types/interfaces.ts
 */

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

/**
 * Mock Record - Simulates an Airtable record
 */
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
    const value = this.getCellValue(fieldNameOrId);
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Update the record's fields (used internally by MockTable)
   */
  _updateFields(fields: FieldSet): void {
    Object.assign(this.fields, fields);
    if (fields["Name"] !== undefined) {
      this.name = fields["Name"] as string;
    }
  }

  /**
   * Get all fields (useful for testing assertions)
   */
  _getAllFields(): FieldSet {
    return { ...this.fields };
  }
}

/**
 * Mock Query Result - Simulates selectRecordsAsync result
 */
export class MockQueryResult implements IAirtableQueryResult {
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

/**
 * Mock Field - Simulates an Airtable field definition
 */
export class MockField implements IAirtableField {
  public id: string;
  public name: string;
  public type: string;
  public options?: unknown;

  constructor(
    id: string,
    name: string,
    type: string = "singleLineText",
    options?: unknown
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.options = options;
  }
}

/**
 * Mock Table - Simulates an Airtable table
 */
export class MockTable implements IAirtableTable {
  public id: string;
  public name: string;
  public fields: MockField[];
  private records: Map<string, MockRecord>;
  private nextRecordId: number;

  // Track method calls for testing
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

  async selectRecordsAsync(
    options?: RecordSelectOptions
  ): Promise<MockQueryResult> {
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

  async updateRecordAsync(
    recordOrId: string | IAirtableRecord,
    fields: FieldSet
  ): Promise<void> {
    const id = typeof recordOrId === "string" ? recordOrId : recordOrId.id;
    this._calls.updateRecordAsync.push({ id, fields });

    const record = this.records.get(id);
    if (!record) {
      throw new Error(
        `Record with ID "${id}" not found in table "${this.name}"`
      );
    }
    record._updateFields(fields);
  }

  async updateRecordsAsync(
    records: Array<{ id: string; fields: FieldSet }>
  ): Promise<void> {
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
    this._calls.deleteRecordAsync.push(id);

    if (!this.records.has(id)) {
      throw new Error(
        `Record with ID "${id}" not found in table "${this.name}"`
      );
    }
    this.records.delete(id);
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

  /**
   * Get a record by ID (useful for testing assertions)
   */
  _getRecord(id: string): MockRecord | undefined {
    return this.records.get(id);
  }

  /**
   * Get all records (useful for testing assertions)
   */
  _getAllRecords(): MockRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Reset call tracking (useful between tests)
   */
  _resetCalls(): void {
    this._calls = {
      selectRecordsAsync: [],
      updateRecordAsync: [],
      createRecordAsync: [],
      deleteRecordAsync: [],
    };
  }
}

/**
 * Mock Base - Simulates an Airtable base
 */
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

  /**
   * Add a table to the base
   */
  addTable(table: MockTable): void {
    this.tables.push(table);
    this.tableMap.set(table.id, table);
    this.tableMap.set(table.name, table);
  }
}

/**
 * Mock Logger - Captures logs for testing assertions
 */
export class MockLogger implements ILogger {
  public logs: Array<{ type: string; message: string; data?: unknown }> = [];

  log(message: string): void {
    this.logs.push({ type: "log", message });
  }

  inspect(data: unknown, label?: string): void {
    this.logs.push({ type: "inspect", message: label || "", data });
  }

  error(message: string): void {
    this.logs.push({ type: "error", message });
  }

  warn(message: string): void {
    this.logs.push({ type: "warn", message });
  }

  /**
   * Clear all captured logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get logs of a specific type
   */
  getLogsByType(
    type: "log" | "inspect" | "error" | "warn"
  ): Array<{ message: string; data?: unknown }> {
    return this.logs.filter((l) => l.type === type);
  }

  /**
   * Check if a message was logged
   */
  hasLog(message: string): boolean {
    return this.logs.some((l) => l.message.includes(message));
  }
}

/**
 * Factory function to create a mock base with sample data
 */
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
      choices: [
        { name: "Pending" },
        { name: "In Progress" },
        { name: "Completed" },
      ],
    }),
    new MockField("fldPriority", "Priority", "singleSelect", {
      choices: [{ name: "Low" }, { name: "Medium" }, { name: "High" }],
    }),
  ];

  const table = new MockTable("tblTasks", "Tasks", records, fields);
  const base = new MockBase([table]);

  return { base, table, records };
}
