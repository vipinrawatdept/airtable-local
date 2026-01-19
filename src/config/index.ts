import * as dotenv from "dotenv";
import * as path from "path";
import { ConfigurationError } from "../types/errors";

dotenv.config();

export type LogLevel = "debug" | "info" | "warn" | "error";
export type DataMode = "airtable" | "csv";

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableNames: string[];
}

export interface CsvConfig {
  dataDir: string;
  autoSave: boolean;
}

export interface LogConfig {
  level: LogLevel;
  prefix: string;
}

export interface AppConfig {
  mode: DataMode;
  airtable: AirtableConfig;
  csv: CsvConfig;
  log: LogConfig;
}

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value.toLowerCase() === "true";
}

function parseLogLevel(value: string | undefined): LogLevel {
  if (!value) {
    return "info";
  }
  const level = value.toLowerCase() as LogLevel;
  if (LOG_LEVELS.includes(level)) {
    return level;
  }
  console.warn(`Invalid LOG_LEVEL "${value}", defaulting to "info"`);
  return "info";
}

function parseTableNames(value: string | undefined): string[] {
  if (!value || value.trim() === "") {
    return [];
  }
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function loadConfig(): AppConfig {
  const useCsvData = parseBoolean(process.env.USE_CSV_DATA, false);
  const mode: DataMode = useCsvData ? "csv" : "airtable";

  const config: AppConfig = {
    mode,
    airtable: {
      apiKey: process.env.AIRTABLE_API_KEY || "",
      baseId: process.env.AIRTABLE_BASE_ID || "",
      tableNames: parseTableNames(process.env.AIRTABLE_TABLE_NAMES),
    },
    csv: {
      dataDir: process.env.CSV_DATA_DIR || "./data",
      autoSave: parseBoolean(process.env.CSV_AUTO_SAVE, false),
    },
    log: {
      level: parseLogLevel(process.env.LOG_LEVEL),
      prefix: "[Airtable Script]",
    },
  };

  return config;
}

export function validateAirtableConfig(config: AppConfig): void {
  if (config.mode !== "airtable") {
    return;
  }

  const errors: string[] = [];

  if (!config.airtable.apiKey) {
    errors.push("AIRTABLE_API_KEY is required");
  } else if (!config.airtable.apiKey.startsWith("pat")) {
    errors.push("AIRTABLE_API_KEY should start with 'pat' (personal access token)");
  }

  if (!config.airtable.baseId) {
    errors.push("AIRTABLE_BASE_ID is required");
  } else if (!config.airtable.baseId.startsWith("app")) {
    errors.push("AIRTABLE_BASE_ID should start with 'app'");
  }

  if (errors.length > 0) {
    throw new ConfigurationError(
      `Configuration errors:\n  - ${errors.join("\n  - ")}\n\nPlease check your .env file.`
    );
  }
}

export function validateCsvConfig(config: AppConfig): void {
  if (config.mode !== "csv") {
    return;
  }

  if (!config.csv.dataDir) {
    throw new ConfigurationError("CSV_DATA_DIR is required when using CSV mode");
  }
}

export function validateConfig(config: AppConfig): void {
  if (config.mode === "airtable") {
    validateAirtableConfig(config);
  } else {
    validateCsvConfig(config);
  }
}

export function resolveDataDir(config: AppConfig): string {
  const dataDir = config.csv.dataDir;
  if (path.isAbsolute(dataDir)) {
    return dataDir;
  }
  return path.resolve(process.cwd(), dataDir);
}

// Singleton config instance
let cachedConfig: AppConfig | null = null;

/**
 * Gets the application configuration (cached)
 */
export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}

export default getConfig;
