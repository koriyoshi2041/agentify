import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseOpenAPI } from "../src/parser/index";
import { ClaudeMdEmitter } from "../src/generator/claudemd-emitter";
import { AgentsMdEmitter } from "../src/generator/agentsmd-emitter";
import { generate, getAvailableFormats, createEmitter } from "../src/generator/index";
import type { AgentifyIR } from "../src/types";

const TEST_OUTPUT_DIR = path.join(import.meta.dirname, "../tmp/test-emitters");
const PETSTORE_URL = "https://petstore3.swagger.io/api/v3/openapi.json";

let petstoreIR: AgentifyIR;

describe("Emitter Registry", () => {
  it("lists all available formats", () => {
    const formats = getAvailableFormats();
    expect(formats).toContain("mcp");
    expect(formats).toContain("claude.md");
    expect(formats).toContain("agents.md");
  });

  it("creates emitters by format name", () => {
    const mcp = createEmitter("mcp");
    expect(mcp.name).toBe("mcp-server");

    const claude = createEmitter("claude.md");
    expect(claude.name).toBe("claude-md");

    const agents = createEmitter("agents.md");
    expect(agents.name).toBe("agents-md");
  });

  it("throws on unknown format", () => {
    expect(() => createEmitter("unknown")).toThrow("Unknown format: unknown");
  });
});

describe("CLAUDE.md Emitter", () => {
  beforeAll(async () => {
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    const { ir } = await parseOpenAPI(PETSTORE_URL);
    petstoreIR = ir;
  });

  afterAll(async () => {
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  it("generates a CLAUDE.md file", async () => {
    const emitter = new ClaudeMdEmitter();
    const outputDir = path.join(TEST_OUTPUT_DIR, "claudemd-test");
    const result = await emitter.emit(petstoreIR, { outputDir });

    expect(result.format).toBe("claude.md");
    expect(result.filesWritten).toHaveLength(1);
    expect(result.filesWritten[0]).toContain("CLAUDE.md");
    expect(result.warnings).toHaveLength(0);
  });

  it("contains product name and description", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "claudemd-content");
    const emitter = new ClaudeMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "CLAUDE.md"), "utf-8");

    expect(content).toContain(petstoreIR.product.name);
    expect(content).toContain("Agentify");
  });

  it("contains API overview with base URL and version", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "claudemd-overview");
    const emitter = new ClaudeMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "CLAUDE.md"), "utf-8");

    expect(content).toContain("## API Overview");
    expect(content).toContain(petstoreIR.product.baseUrl);
    expect(content).toContain(petstoreIR.product.version);
    expect(content).toContain(`${petstoreIR.capabilities.length}`);
  });

  it("contains domain-grouped operations table", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "claudemd-domains");
    const emitter = new ClaudeMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "CLAUDE.md"), "utf-8");

    expect(content).toContain("## Available Operations");
    expect(content).toContain("### Pet");
    expect(content).toContain("| Operation |");
    expect(content).toContain("add_pet");
    expect(content).toContain("get_pet_by_id");
  });

  it("contains auth configuration", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "claudemd-auth");
    const emitter = new ClaudeMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "CLAUDE.md"), "utf-8");

    if (petstoreIR.auth.type !== "none") {
      expect(content).toContain("## Authentication");
      expect(content).toContain(petstoreIR.auth.envVariable);
    }
  });

  it("contains generation strategy info", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "claudemd-strategy");
    const emitter = new ClaudeMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "CLAUDE.md"), "utf-8");

    expect(content).toContain("## Generation Strategy");
    expect(content).toContain(petstoreIR.strategy.scale);
  });
});

describe("AGENTS.md Emitter", () => {
  beforeAll(async () => {
    if (!petstoreIR) {
      const { ir } = await parseOpenAPI(PETSTORE_URL);
      petstoreIR = ir;
    }
  });

  it("generates an AGENTS.md file", async () => {
    const emitter = new AgentsMdEmitter();
    const outputDir = path.join(TEST_OUTPUT_DIR, "agentsmd-test");
    const result = await emitter.emit(petstoreIR, { outputDir });

    expect(result.format).toBe("agents.md");
    expect(result.filesWritten).toHaveLength(1);
    expect(result.filesWritten[0]).toContain("AGENTS.md");
    expect(result.warnings).toHaveLength(0);
  });

  it("contains identity section", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "agentsmd-identity");
    const emitter = new AgentsMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "AGENTS.md"), "utf-8");

    expect(content).toContain("## Identity");
    expect(content).toContain(petstoreIR.product.name);
    expect(content).toContain(petstoreIR.product.version);
    expect(content).toContain(petstoreIR.product.baseUrl);
  });

  it("contains capabilities by domain", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "agentsmd-caps");
    const emitter = new AgentsMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "AGENTS.md"), "utf-8");

    expect(content).toContain("## Capabilities");
    expect(content).toContain("### Pet");
    expect(content).toContain("add_pet");
    expect(content).toContain("get_pet_by_id");
  });

  it("contains authentication section", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "agentsmd-auth");
    const emitter = new AgentsMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "AGENTS.md"), "utf-8");

    expect(content).toContain("## Authentication");
  });

  it("contains protocols section referencing MCP", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "agentsmd-protocols");
    const emitter = new AgentsMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "AGENTS.md"), "utf-8");

    expect(content).toContain("## Protocols");
    expect(content).toContain("MCP");
  });

  it("contains constraints section with side effects count", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "agentsmd-constraints");
    const emitter = new AgentsMdEmitter();
    await emitter.emit(petstoreIR, { outputDir });

    const content = await fs.readFile(path.join(outputDir, "AGENTS.md"), "utf-8");

    expect(content).toContain("## Constraints");
    expect(content).toContain("side effects");
  });
});

describe("Multi-format generation", () => {
  beforeAll(async () => {
    if (!petstoreIR) {
      const { ir } = await parseOpenAPI(PETSTORE_URL);
      petstoreIR = ir;
    }
  });

  it("generates all three formats in one call", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "multi-format");
    const results = await generate(petstoreIR, outputDir, ["mcp", "claude.md", "agents.md"]);

    expect(results).toHaveLength(3);
    const [mcpResult, claudeResult, agentsResult] = results;
    expect(mcpResult!.format).toBe("mcp");
    expect(claudeResult!.format).toBe("claude.md");
    expect(agentsResult!.format).toBe("agents.md");

    // Verify files exist
    const claudeMd = await fs.readFile(path.join(outputDir, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("## API Overview");

    const agentsMd = await fs.readFile(path.join(outputDir, "AGENTS.md"), "utf-8");
    expect(agentsMd).toContain("## Identity");

    const serverTs = await fs.readFile(path.join(outputDir, "src/index.ts"), "utf-8");
    expect(serverTs).toContain("McpServer");
  });

  it("generates single format when specified", async () => {
    const outputDir = path.join(TEST_OUTPUT_DIR, "single-format");
    const results = await generate(petstoreIR, outputDir, ["claude.md"]);

    expect(results).toHaveLength(1);
    expect(results[0]!.format).toBe("claude.md");
  });
});
