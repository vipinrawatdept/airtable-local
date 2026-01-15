import { ILogger } from "./interfaces";

/**
 * NodeLogger - Console-based logger for local testing
 * Uses Node.js console methods
 */
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

/**
 * AirtableLogger - Logger for Airtable Scripting environment
 * Uses console.log for compatibility
 */
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
