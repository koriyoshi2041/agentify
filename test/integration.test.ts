import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseOpenAPI } from "../src/parser/index";
import { generateMCPServer } from "../src/generator/index";

const TEST_OUTPUT_DIR = path.join(import.meta.dirname, "../tmp/test-output");
const PETSTORE_URL = "https://petstore3.swagger.io/api/v3/openapi.json";

describe("Parser → Generator Integration", () => {
  beforeAll(async () => {
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  it("parses Petstore OpenAPI spec into valid IR", async () => {
    const { ir, warnings } = await parseOpenAPI(PETSTORE_URL);

    expect(ir.product.name).toBe("Swagger Petstore - OpenAPI 3.0");
    expect(ir.product.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(ir.product.baseUrl).toContain("petstore3.swagger.io");

    expect(ir.capabilities.length).toBeGreaterThan(10);
    expect(ir.domains.length).toBeGreaterThan(0);

    expect(ir.strategy.scale).toBe("small");
    expect(ir.strategy.endpointCount).toBe(ir.capabilities.length);

    // Verify all capabilities have required fields
    for (const cap of ir.capabilities) {
      expect(cap.id).toBeTruthy();
      expect(cap.name).toBeTruthy();
      expect(cap.description).toBeTruthy();
      expect(cap.http.method).toBeTruthy();
      expect(cap.http.path).toBeTruthy();
    }

    // Verify domains are correctly grouped
    const petDomain = ir.domains.find(d => d.name === "pet");
    expect(petDomain).toBeDefined();
    expect(petDomain!.capabilityIds.length).toBeGreaterThan(0);

    // Verify no security warnings from clean spec
    const criticalWarnings = warnings.filter(w => w.includes("CRITICAL"));
    expect(criticalWarnings).toHaveLength(0);
  });

  it("generates a complete MCP Server project from Petstore IR", async () => {
    const { ir } = await parseOpenAPI(PETSTORE_URL);

    const outputDir = path.join(TEST_OUTPUT_DIR, "petstore-mcp");
    const result = await generateMCPServer(ir, outputDir);

    expect(result.format).toBe("mcp");
    expect(result.filesWritten.length).toBeGreaterThanOrEqual(7);

    // Verify all expected files exist
    const expectedFiles = [
      "src/index.ts",
      "src/tools.ts",
      "src/handlers.ts",
      "package.json",
      "tsconfig.json",
      "Dockerfile",
      ".env.example",
      "README.md",
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(outputDir, file);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists, `Expected ${file} to exist`).toBe(true);
    }

    // Verify package.json is valid JSON with correct deps
    const pkgContent = await fs.readFile(path.join(outputDir, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgContent);
    expect(pkg.name).toContain("petstore");
    expect(pkg.dependencies["@modelcontextprotocol/sdk"]).toBeDefined();
    expect(pkg.description).toContain("Agentify");

    // Verify server source imports MCP SDK
    const serverSrc = await fs.readFile(path.join(outputDir, "src/index.ts"), "utf-8");
    expect(serverSrc).toContain("McpServer");
    expect(serverSrc).toContain("StdioServerTransport");

    // Verify tools are registered
    const toolsSrc = await fs.readFile(path.join(outputDir, "src/tools.ts"), "utf-8");
    expect(toolsSrc).toContain("add_pet");
    expect(toolsSrc).toContain("get_pet_by_id");
    expect(toolsSrc).toContain("place_order");

    // Verify handlers have proper API request function
    const handlersSrc = await fs.readFile(path.join(outputDir, "src/handlers.ts"), "utf-8");
    expect(handlersSrc).toContain("petstore3.swagger.io");
    expect(handlersSrc).toContain("apiRequest");

    // Verify README mentions Agentify
    const readme = await fs.readFile(path.join(outputDir, "README.md"), "utf-8");
    expect(readme).toContain("Agentify");
    expect(readme).toContain("pet");
  });

  it("generates unique tool names (no duplicates)", async () => {
    const { ir } = await parseOpenAPI(PETSTORE_URL);

    const names = ir.capabilities.map(c => c.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("generates quoted Zod property names and no duplicate properties", async () => {
    const { ir } = await parseOpenAPI(PETSTORE_URL);

    const outputDir = path.join(TEST_OUTPUT_DIR, "petstore-zod-check");
    await generateMCPServer(ir, outputDir);

    const toolsSrc = await fs.readFile(path.join(outputDir, "src/tools.ts"), "utf-8");

    // All property names should be quoted (valid JS even with hyphens)
    const unquotedProps = toolsSrc.match(/^\s{4}(\w[\w-]*\w)\s*:/gm);
    expect(unquotedProps ?? []).toHaveLength(0);

    // No duplicate property names within any single Zod shape
    // Extract each tool's Zod shape block and check for duplicate keys
    const shapeBlocks = toolsSrc.match(/\{[\s\S]*?\}/g) ?? [];
    for (const block of shapeBlocks) {
      const propNames = [...block.matchAll(/"(\w+)":\s*z\./g)].map(m => m[1]);
      const uniqueProps = new Set(propNames);
      expect(uniqueProps.size).toBe(propNames.length);
    }
  });

  it("correctly determines generation strategy by endpoint count", async () => {
    const { ir } = await parseOpenAPI(PETSTORE_URL);

    // Petstore has ~19 endpoints → small strategy
    expect(ir.strategy.scale).toBe("small");
    expect(ir.strategy.reason).toContain("direct tool mapping");
  });

  it("extracts auth configuration from spec", async () => {
    const { ir } = await parseOpenAPI(PETSTORE_URL);

    // Petstore uses OAuth2
    expect(ir.auth.type).toBe("oauth2");
    expect(ir.auth.envVariable).toBeTruthy();
  });
});
