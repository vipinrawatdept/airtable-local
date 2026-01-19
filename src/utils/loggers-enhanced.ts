import { ILogger } from "../types";
import { LogLevel, getConfig } from "../config";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class EnhancedNodeLogger implements ILogger {
  private prefix: string;
  private level: LogLevel;

  constructor(prefix: string = "[Airtable Script]", level?: LogLevel) {
    this.prefix = prefix;
    this.level = level || getConfig().log.level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog("debug")) return;
    console.debug(this.formatMessage("debug", message));
    if (data) console.debug(data);
  }

  log(message: string): void {
    if (!this.shouldLog("info")) return;
    console.log(`${this.prefix} ${message}`);
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog("info")) return;
    console.log(this.formatMessage("info", message));
    if (data) console.log(data);
  }

  inspect(data: unknown, label?: string): void {
    if (!this.shouldLog("debug")) return;
    if (label) {
      console.log(`${this.prefix} ${label}:`);
    }
    console.dir(data, { depth: null, colors: true });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog("warn")) return;
    console.warn(this.formatMessage("warn", message));
    if (data) console.warn(data);
  }

  error(message: string, error?: Error): void {
    if (!this.shouldLog("error")) return;
    console.error(this.formatMessage("error", message));
    if (error) {
      console.error(error.stack || error.message);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export class NodeLogger implements ILogger {
  private prefix: string;

  constructor(prefix: string = "[Airtable Script]") {
    this.prefix = prefix;
  }

  log(message: string): void {
    console.log(`${this.prefix} ${message}`);
  }

  inspect(data: unknown, label?: string): void {
    if (label) {
      console.log(`${this.prefix} ${label}:`);
    }
    console.dir(data, { depth: null, colors: true });
  }

  error(message: string): void {
    console.error(`${this.prefix} [ERROR] ${message}`);
  }

  warn(message: string): void {
    console.warn(`${this.prefix} [WARN] ${message}`);
  }
}

export class AirtableLogger implements ILogger {
  log(message: string): void {
    console.log(message);
  }

  inspect(data: unknown, label?: string): void {
    if (label) {
      console.log(label + ":");
    }
    console.log(data);
  }

  error(message: string): void {
    console.error(`❌ ERROR: ${message}`);
  }

  warn(message: string): void {
    console.warn(`⚠️ WARNING: ${message}`);
  }
}

export class SilentLogger implements ILogger {
  log(): void {}
  inspect(): void {}
  error(): void {}
  warn(): void {}
}
