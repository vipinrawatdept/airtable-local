export interface ILogger {
  log(message: string): void;
  inspect(data: unknown, label?: string): void;
  error(message: string): void;
  warn(message: string): void;
}

export interface IAirtableBase {
  getTable(nameOrId: string): IAirtableTable;
  tables: IAirtableTable[];
}

export interface IAirtableTable {
  id: string;
  name: string;
  selectRecordsAsync(
    options?: RecordSelectOptions
  ): Promise<IAirtableQueryResult>;
  updateRecordAsync(
    recordOrId: string | IAirtableRecord,
    fields: FieldSet
  ): Promise<void>;
  updateRecordsAsync(
    records: Array<{ id: string; fields: FieldSet }>
  ): Promise<void>;
  createRecordAsync(fields: FieldSet): Promise<string>;
  createRecordsAsync(records: Array<{ fields: FieldSet }>): Promise<string[]>;
  deleteRecordAsync(recordOrId: string | IAirtableRecord): Promise<void>;
  deleteRecordsAsync(
    recordsOrIds: Array<string | IAirtableRecord>
  ): Promise<void>;
  getField(nameOrId: string): IAirtableField;
  fields: IAirtableField[];
}

export interface IAirtableQueryResult {
  records: IAirtableRecord[];
  getRecord(recordId: string): IAirtableRecord | undefined;
}

export interface IAirtableRecord {
  id: string;
  name: string;
  getCellValue(fieldNameOrId: string): unknown;
  getCellValueAsString(fieldNameOrId: string): string;
}

export interface IAirtableField {
  id: string;
  name: string;
  type: string;
  options?: unknown;
}

export type FieldSet = Record<string, unknown>;

export interface RecordSelectOptions {
  fields?: string[];
  sorts?: Array<{ field: string; direction?: "asc" | "desc" }>;
  recordIds?: string[];
}
