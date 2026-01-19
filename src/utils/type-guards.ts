import { IAirtableRecord, IAirtableTable, IAirtableBase, FieldSet } from "../types";
import { ValidationError } from "../types/errors";

export function isRecord(value: unknown): value is IAirtableRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "getCellValue" in value &&
    typeof (value as IAirtableRecord).getCellValue === "function"
  );
}

export function isTable(value: unknown): value is IAirtableTable {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "selectRecordsAsync" in value &&
    typeof (value as IAirtableTable).selectRecordsAsync === "function"
  );
}

export function isBase(value: unknown): value is IAirtableBase {
  return (
    typeof value === "object" &&
    value !== null &&
    "tables" in value &&
    "getTable" in value &&
    typeof (value as IAirtableBase).getTable === "function"
  );
}

export function isFieldSet(value: unknown): value is FieldSet {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidRecordId(value: unknown): value is string {
  return typeof value === "string" && /^rec[a-zA-Z0-9]+$/.test(value);
}

export function isValidTableId(value: unknown): value is string {
  return typeof value === "string" && /^tbl[a-zA-Z0-9]+$/.test(value);
}

export function isValidBaseId(value: unknown): value is string {
  return typeof value === "string" && /^app[a-zA-Z0-9]+$/.test(value);
}

export function isValidFieldId(value: unknown): value is string {
  return typeof value === "string" && /^fld[a-zA-Z0-9]+$/.test(value);
}

export function validateFieldSet(fields: FieldSet, _tableName?: string): void {
  if (!isFieldSet(fields)) {
    throw new ValidationError("Fields must be a non-null object", "fields", fields);
  }

  for (const [key, value] of Object.entries(fields)) {
    if (!isNonEmptyString(key)) {
      throw new ValidationError(`Invalid field name: "${key}"`, key, value);
    }

    if (value === undefined) {
      throw new ValidationError(
        `Field "${key}" has undefined value. Use null to clear a field.`,
        key,
        value
      );
    }
  }
}

export function validateRecordId(id: unknown, context?: string): asserts id is string {
  if (!isNonEmptyString(id)) {
    throw new ValidationError(
      `Invalid record ID${context ? ` in ${context}` : ""}: expected non-empty string`,
      "id",
      id
    );
  }
}

export function validateTableName(name: unknown, context?: string): asserts name is string {
  if (!isNonEmptyString(name)) {
    throw new ValidationError(
      `Invalid table name${context ? ` in ${context}` : ""}: expected non-empty string`,
      "name",
      name
    );
  }
}

export function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(message);
  }
}
