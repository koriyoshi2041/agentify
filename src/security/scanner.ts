/**
 * Security scanner for generated code.
 * Runs before output to ensure no dangerous patterns exist.
 *
 * Based on Hacker review findings:
 * - CRITICAL: eval/Function constructor in generated code
 * - CRITICAL: Unsanitized template literal interpolation
 * - HIGH: Process spawn without input validation
 * - MEDIUM: Hardcoded credentials patterns
 */

export interface ScanViolation {
  readonly severity: "critical" | "high" | "medium";
  readonly pattern: string;
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
}

export interface ScanResult {
  readonly passed: boolean;
  readonly violations: readonly ScanViolation[];
  readonly scannedFiles: number;
}

interface PatternRule {
  readonly regex: RegExp;
  readonly severity: ScanViolation["severity"];
  readonly message: string;
}

const RULES: readonly PatternRule[] = [
  {
    regex: /\beval\s*\(/g,
    severity: "critical",
    message: "eval() is forbidden in generated code — potential code injection",
  },
  {
    regex: /\bnew\s+Function\s*\(/g,
    severity: "critical",
    message: "new Function() is forbidden — potential code injection",
  },
  {
    regex: /\brequire\s*\(\s*['"`][^'"]*['"`]\s*\+/g,
    severity: "high",
    message: "Dynamic require with concatenation — potential path traversal",
  },
  {
    regex: /`[^`]*\$\{[^}]*(?:req|input|param|body|query|header|url)[^}]*\}/gi,
    severity: "high",
    message: "Unsanitized user input in template literal",
  },
  {
    regex: /(?:password|secret|token|apikey|api_key)\s*[:=]\s*['"][^'"]+['"]/gi,
    severity: "medium",
    message: "Possible hardcoded credential detected",
  },
  {
    regex: /process\.env\.\w+\s*\|\|\s*['"][^'"]+['"]/g,
    severity: "medium",
    message: "Fallback value for env variable — ensure no real secrets",
  },
];

export function scanCode(content: string, filename?: string): ScanResult {
  const violations: ScanViolation[] = [];

  for (const rule of RULES) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const beforeMatch = content.slice(0, match.index);
      const lineNumber = beforeMatch.split("\n").length;
      const lastNewline = beforeMatch.lastIndexOf("\n");
      const column = match.index - lastNewline;

      violations.push({
        severity: rule.severity,
        pattern: rule.regex.source,
        message: `${rule.message}${filename ? ` (${filename}:${lineNumber})` : ` (line ${lineNumber})`}`,
        line: lineNumber,
        column,
      });
    }
  }

  return {
    passed: violations.filter(v => v.severity === "critical").length === 0,
    violations,
    scannedFiles: 1,
  };
}

export function scanMultipleFiles(
  files: ReadonlyMap<string, string>,
): ScanResult {
  const allViolations: ScanViolation[] = [];
  let scannedCount = 0;

  for (const [filename, content] of files) {
    const result = scanCode(content, filename);
    allViolations.push(...result.violations);
    scannedCount++;
  }

  return {
    passed: allViolations.filter(v => v.severity === "critical").length === 0,
    violations: allViolations,
    scannedFiles: scannedCount,
  };
}
