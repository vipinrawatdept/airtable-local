/**
 * Logger Interface - Adapter Pattern
 * Allows swapping between Node.js console and Airtable output
 */
export interface ILogger {
  /**
   * Log a simple text message
   */
  log(message: string): void;

  /**
   * Log an object or complex data structure for inspection
   */
  inspect(data: unknown, label?: string): void;

  /**
   * Log an error message
   */
  error(message: string): void;

  /**
   * Log a warning message
   */
  warn(message: string): void;
}

/**
 * Airtable Base interface (simplified for scripting)
 */
export interface IAirtableBase {
  getTable(nameOrId: string): IAirtableTable;
  tables: IAirtableTable[];
}

/**
 * Airtable Table interface
 */
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

/**
 * Airtable Query Result interface
 */
export interface IAirtableQueryResult {
  records: IAirtableRecord[];
  getRecord(recordId: string): IAirtableRecord | undefined;
}

/**
 * Airtable Record interface
 */
export interface IAirtableRecord {
  id: string;
  name: string;
  getCellValue(fieldNameOrId: string): unknown;
  getCellValueAsString(fieldNameOrId: string): string;
}

/**
 * Airtable Field interface
 */
export interface IAirtableField {
  id: string;
  name: string;
  type: string;
  options?: unknown;
}

/**
 * Field set for creating/updating records
 */
export type FieldSet = Record<string, unknown>;

/**
 * Options for selecting records
 */
export interface RecordSelectOptions {
  fields?: string[];
  sorts?: Array<{ field: string; direction?: "asc" | "desc" }>;
  recordIds?: string[];
}
