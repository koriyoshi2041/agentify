import type { AgentifyIR, EmitterResult } from "../types";
import { MCPServerEmitter } from "./mcp-emitter";

export { MCPServerEmitter } from "./mcp-emitter";

/**
 * Generate an MCP Server project from AgentifyIR.
 */
export async function generateMCPServer(
  ir: AgentifyIR,
  outputDir: string,
): Promise<EmitterResult> {
  const emitter = new MCPServerEmitter();
  return emitter.emit(ir, { outputDir });
}
