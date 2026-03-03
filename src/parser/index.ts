export { parseOpenAPISpec, type ParseResult } from "./openapi-parser";
export { sanitizeString, sanitizeDescription, sanitizeSpecField } from "./sanitizer";

import type { AgentifyIR } from "../types";
import { parseOpenAPISpec } from "./openapi-parser";

/**
 * Main entry point for parsing OpenAPI specs.
 * Accepts a URL or local file path.
 */
export async function parseOpenAPI(input: string): Promise<{
  ir: AgentifyIR;
  warnings: readonly string[];
}> {
  return parseOpenAPISpec(input);
}
