import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

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

    it("has a description that mentions agent formats", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      const match = content.match(/description:\s*(.+)/);
      expect(match).not.toBeNull();
      expect(match![1]).toContain("agent");
    });

    it("contains the transform and parse commands", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      expect(content).toContain("npx agentify-cli transform");
      expect(content).toContain("npx agentify-cli parse");
    });

    it("describes the hybrid workflow (deterministic + agent-authored)", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      expect(content).toContain("Deterministic generation");
      expect(content).toContain("Agent-authored documentation");
      expect(content).toContain("YOU");
    });

    it("mentions all documentation formats the agent should write", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      expect(content).toContain("CLAUDE.md");
      expect(content).toContain("AGENTS.md");
      expect(content).toContain(".cursorrules");
      expect(content).toContain("GEMINI.md");
      expect(content).toContain("llms.txt");
    });

    it("includes common user requests table", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "agentify.md"),
        "utf-8",
      );
      expect(content).toContain("## Common User Requests");
      expect(content).toContain("Make my API work with Claude");
    });
  });

  describe("CLAUDE.md", () => {
    it("exists and describes the two-mode workflow", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "CLAUDE.md"),
        "utf-8",
      );
      expect(content).toContain("## Two Modes of Operation");
      expect(content).toContain("## When to Use Which");
      expect(content).toContain("## Commands");
    });

    it("mentions the parse command and transform command", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "CLAUDE.md"),
        "utf-8",
      );
      expect(content).toContain("agentify parse");
      expect(content).toContain("agentify transform");
    });

    it("describes the IR structure", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "CLAUDE.md"),
        "utf-8",
      );
      expect(content).toContain("## What the IR Contains");
      expect(content).toContain("product");
      expect(content).toContain("domains");
      expect(content).toContain("capabilities");
    });
  });

  describe("AGENTS.md", () => {
    it("exists and follows the standard structure", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "AGENTS.md"),
        "utf-8",
      );
      expect(content).toContain("## Identity");
      expect(content).toContain("## How It Works");
      expect(content).toContain("## Commands");
      expect(content).toContain("## Constraints");
    });

    it("describes the hybrid architecture", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "AGENTS.md"),
        "utf-8",
      );
      expect(content).toContain("parse");
      expect(content).toContain("transform");
      expect(content).toContain("hybrid");
    });

    it("includes the tested APIs table", () => {
      const content = fs.readFileSync(
        path.join(SELF_DIR, "AGENTS.md"),
        "utf-8",
      );
      expect(content).toContain("## Tested At Scale");
      expect(content).toContain("GitHub");
      expect(content).toContain("1,093");
    });
  });
});
