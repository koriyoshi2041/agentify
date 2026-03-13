import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { getAvailableFormats } from "../src/generator/index";

const SELF_DIR = path.resolve(process.cwd(), "self");

describe("Self-Description Files", () => {
  describe("agentify.md (Claude Code skill)", () => {
    it("exists and has valid YAML frontmatter", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      expect(content).toMatch(/^---\n/);
      expect(content).toContain("name: agentify");
      expect(content).toContain("description:");
    });

    it("has a description that mentions agent interface formats", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      const match = content.match(/description:\s*(.+)/);
      expect(match).not.toBeNull();
      expect(match![1]).toContain("agent interface formats");
    });

    it("contains the transform command usage", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      expect(content).toContain("npx agentify-cli transform");
      expect(content).toContain("--output");
      expect(content).toContain("--format");
    });

    it("lists all available formats", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      const available = getAvailableFormats();
      for (const fmt of available) {
        expect(content).toContain(fmt);
      }
    });

    it("includes examples section", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      expect(content).toContain("## Examples");
      expect(content).toContain("petstore.swagger.io");
    });
  });

  describe("CLAUDE.md", () => {
    it("exists and contains usage instructions", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "CLAUDE.md"),
        "utf-8",
      );
      expect(content).toContain("npx agentify-cli transform");
      expect(content).toContain("## When to Use");
      expect(content).toContain("## Examples");
    });

    it("lists all available formats", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "CLAUDE.md"),
        "utf-8",
      );
      const available = getAvailableFormats();
      for (const fmt of available) {
        expect(content).toContain(fmt);
      }
    });
  });

  describe("AGENTS.md", () => {
    it("exists and follows the standard structure", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "AGENTS.md"),
        "utf-8",
      );
      expect(content).toContain("## Identity");
      expect(content).toContain("## Capabilities");
      expect(content).toContain("## Authentication");
      expect(content).toContain("## Protocols");
      expect(content).toContain("## Constraints");
    });

    it("contains the transform command", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "AGENTS.md"),
        "utf-8",
      );
      expect(content).toContain("npx agentify-cli transform");
    });
  });
});
