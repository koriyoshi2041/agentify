import type { AgentifyIR, Emitter, EmitterResult } from "../types";
import { MCPServerEmitter } from "./mcp-emitter";
import { ClaudeMdEmitter } from "./claudemd-emitter";
import { AgentsMdEmitter } from "./agentsmd-emitter";

export { MCPServerEmitter } from "./mcp-emitter";
export { ClaudeMdEmitter } from "./claudemd-emitter";
export { AgentsMdEmitter } from "./agentsmd-emitter";

const EMITTERS: Record<string, () => Emitter> = {
  mcp: () => new MCPServerEmitter(),
  "claude.md": () => new ClaudeMdEmitter(),
  "agents.md": () => new AgentsMdEmitter(),
};

export function getAvailableFormats(): string[] {
  return Object.keys(EMITTERS);
}

export function createEmitter(format: string): Emitter {
  const factory = EMITTERS[format];
  if (!factory) {
    throw new Error(`Unknown format: ${format}. Available: ${getAvailableFormats().join(", ")}`);
  }
  return factory();
}

/**
 * Generate outputs for the specified formats from AgentifyIR.
 */
export async function generate(
  ir: AgentifyIR,
  outputDir: string,
  formats: readonly string[] = ["mcp"],
): Promise<EmitterResult[]> {
  const results: EmitterResult[] = [];
  for (const format of formats) {
    const emitter = createEmitter(format);
    const result = await emitter.emit(ir, { outputDir });
    results.push(result);
  }
  return results;
}

/**
 * Generate an MCP Server project from AgentifyIR.
 * @deprecated Use generate() with formats parameter instead
 */
export async function generateMCPServer(
  ir: AgentifyIR,
  outputDir: string,
): Promise<EmitterResult> {
  const emitter = new MCPServerEmitter();
  return emitter.emit(ir, { outputDir });
}
