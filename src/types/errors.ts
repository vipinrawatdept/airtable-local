export class AirtableLocalError extends Error {
  public readonly code: string;
  public readonly cause?: Error;
  public readonly timestamp: Date;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = "AirtableLocalError";
    this.code = code;
    this.cause = cause;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AirtableLocalError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message,
    };
  }
}

export class ConfigurationError extends AirtableLocalError {
  constructor(message: string, cause?: Error) {
    super(message, "CONFIGURATION_ERROR", cause);
    this.name = "ConfigurationError";
  }
}

export class RecordNotFoundError extends AirtableLocalError {
  public readonly recordId: string;
  public readonly tableName: string;

  constructor(recordId: string, tableName: string) {
    super(`Record "${recordId}" not found in table "${tableName}"`, "RECORD_NOT_FOUND");
    this.name = "RecordNotFoundError";
    this.recordId = recordId;
    this.tableName = tableName;
  }
}

export class TableNotFoundError extends AirtableLocalError {
  public readonly tableName: string;
  public readonly availableTables: string[];

  constructor(tableName: string, availableTables: string[] = []) {
    const message =
      availableTables.length > 0
        ? `Table "${tableName}" not found. Available tables: ${availableTables.join(", ")}`
        : `Table "${tableName}" not found`;
    super(message, "TABLE_NOT_FOUND");
    this.name = "TableNotFoundError";
    this.tableName = tableName;
    this.availableTables = availableTables;
  }
}

export class FieldNotFoundError extends AirtableLocalError {
  public readonly fieldName: string;
  public readonly tableName: string;

  constructor(fieldName: string, tableName: string) {
    super(`Field "${fieldName}" not found in table "${tableName}"`, "FIELD_NOT_FOUND");
    this.name = "FieldNotFoundError";
    this.fieldName = fieldName;
    this.tableName = tableName;
  }
}

export class ValidationError extends AirtableLocalError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(message: string, field?: string, value?: unknown) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }
}

export class ApiError extends AirtableLocalError {
  public readonly statusCode?: number;
  public readonly endpoint?: string;

  constructor(message: string, statusCode?: number, endpoint?: string, cause?: Error) {
    super(message, "API_ERROR", cause);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

export class RateLimitError extends ApiError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    super(`Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}ms` : ""}`, 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class CsvParseError extends AirtableLocalError {
  public readonly filePath: string;
  public readonly line?: number;

  constructor(message: string, filePath: string, line?: number) {
    super(
      `CSV parse error in "${filePath}"${line ? ` at line ${line}` : ""}: ${message}`,
      "CSV_PARSE_ERROR"
    );
    this.name = "CsvParseError";
    this.filePath = filePath;
    this.line = line;
  }
}

export function isAirtableLocalError(error: unknown): error is AirtableLocalError {
  return error instanceof AirtableLocalError;
}

export function wrapError(error: unknown, code: string = "UNKNOWN_ERROR"): AirtableLocalError {
  if (error instanceof AirtableLocalError) {
    return error;
  }

  if (error instanceof Error) {
    return new AirtableLocalError(error.message, code, error);
  }

  return new AirtableLocalError(String(error), code);
}
