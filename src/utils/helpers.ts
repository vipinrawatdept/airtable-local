/**
 * Common Helper Functions
 *
 * Shared utilities to reduce code duplication across adapters.
 */

/**
 * Convert any value to a string representation
 * Used by record adapters for getCellValueAsString
 */
export function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
