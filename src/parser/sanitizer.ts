/**
 * Input sanitization for OpenAPI spec fields.
 * Prevents code injection and prompt injection via malicious spec content.
 *
 * Security threats (from Hacker review):
 * 1. Code injection via description fields containing eval/exec patterns
 * 2. Prompt injection via tool descriptions that manipulate Agent behavior
 * 3. Template injection via Handlebars expressions in field values
 */

const DANGEROUS_CODE_PATTERNS = [
  /\beval\s*\(/gi,
  /\bexec\s*\(/gi,
  /\bFunction\s*\(/gi,
  /\brequire\s*\(/gi,
  /\bimport\s*\(/gi,
  /\bchild_process/gi,
  /\bprocess\.env/gi,
  /`[^`]*\$\{/g,
  /<script[\s>]/gi,
] as const;

const HANDLEBARS_PATTERN = /\{\{[\s\S]*?\}\}/g;

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /you\s+are\s+now\s+/gi,
  /system\s*:\s*/gi,
  /\bdo\s+not\s+follow\b/gi,
  /\boverride\b.*\binstructions?\b/gi,
] as const;

export interface SanitizationResult {
  readonly value: string;
  readonly warnings: readonly string[];
}

function removeDangerousPatterns(input: string, fieldPath: string): SanitizationResult {
  const warnings: string[] = [];
  let cleaned = input;

  for (const pattern of DANGEROUS_CODE_PATTERNS) {
    if (pattern.test(cleaned)) {
      warnings.push(`[SECURITY] Removed dangerous code pattern in ${fieldPath}: ${pattern.source}`);
      cleaned = cleaned.replace(pattern, "[REMOVED]");
    }
  }

  if (HANDLEBARS_PATTERN.test(cleaned)) {
    warnings.push(`[SECURITY] Removed Handlebars expression in ${fieldPath}`);
    cleaned = cleaned.replace(HANDLEBARS_PATTERN, "[REMOVED]");
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      warnings.push(`[SECURITY] Removed prompt injection pattern in ${fieldPath}: ${pattern.source}`);
      cleaned = cleaned.replace(pattern, "[REMOVED]");
    }
  }

  return { value: cleaned, warnings };
}

export function sanitizeString(input: unknown, fieldPath: string): SanitizationResult {
  if (typeof input !== "string") {
    return { value: String(input ?? ""), warnings: [] };
  }

  return removeDangerousPatterns(input, fieldPath);
}

export function sanitizeDescription(input: unknown, fieldPath: string, maxLength = 500): SanitizationResult {
  const { value, warnings } = sanitizeString(input, fieldPath);

  const truncated = value.length > maxLength
    ? value.slice(0, maxLength) + "..."
    : value;

  return { value: truncated.trim(), warnings };
}

export function sanitizeSpecField(input: unknown, fieldPath: string): SanitizationResult {
  return sanitizeString(input, fieldPath);
}
