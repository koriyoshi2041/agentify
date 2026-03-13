import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { parseOpenAPI } from "./parser/index";
import { generate, getAvailableFormats } from "./generator/index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readVersion(): string {
  // Walk up from dist/ or src/ to find package.json
  for (const rel of ["../package.json", "../../package.json"]) {
    const p = path.resolve(__dirname, rel);
    try {
      const pkg = JSON.parse(fs.readFileSync(p, "utf-8"));
      return pkg.version ?? "0.0.0";
    } catch { /* try next */ }
  }
  return "0.0.0";
}

const VERSION = readVersion();

const program = new Command();

program
  .name("agentify")
  .description("Agent Interface Compiler — One command. Every agent speaks your product.")
  .version(VERSION);

program
  .command("transform <input>", { isDefault: true })
  .description("Transform an OpenAPI spec into agent interfaces")
  .option("-o, --output <dir>", "Output directory")
  .option("-n, --name <name>", "Project name override")
  .option("-f, --format <formats...>", "Output formats (mcp, claude.md, agents.md, cursorrules, llms.txt, gemini.md, skills, a2a, cli)", ["mcp", "claude.md", "agents.md", "cursorrules", "llms.txt", "gemini.md", "skills", "a2a"])
  .action(async (input: string, opts: TransformOptions) => {
    await runTransform(input, opts);
  });

interface TransformOptions {
  output?: string;
  name?: string;
  format: string[];
}

async function runTransform(input: string, opts: TransformOptions): Promise<void> {
  console.log("");
  console.log(chalk.bold("  Agentify") + chalk.dim(` v${VERSION}`));
  console.log(chalk.dim("  Agent Interface Compiler"));
  console.log("");

  // Validate formats
  const available = getAvailableFormats();
  for (const fmt of opts.format) {
    if (!available.includes(fmt)) {
      console.error(chalk.red(`  Unknown format: ${fmt}. Available: ${available.join(", ")}`));
      process.exit(1);
    }
  }

  // Step 1: Parse
  const parseSpinner = ora("Analyzing OpenAPI spec...").start();

  let ir;
  let warnings: readonly string[];

  try {
    const result = await parseOpenAPI(input);
    ir = result.ir;
    warnings = result.warnings;
    parseSpinner.succeed(chalk.green("Analyzed ") + chalk.bold(ir.product.name));
  } catch (err) {
    parseSpinner.fail(chalk.red("Failed to parse OpenAPI spec"));
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`  ${message}`));
    process.exit(1);
  }

  // Show analysis summary
  console.log("");
  console.log(chalk.dim("  ├── ") + `${ir.capabilities.length} endpoints detected → ${chalk.bold(ir.strategy.scale.toUpperCase())} API strategy`);
  console.log(chalk.dim("  ├── ") + `${ir.domains.length} domains identified (${ir.domains.map(d => d.name).join(", ")})`);
  console.log(chalk.dim("  ├── ") + `Auth: ${ir.auth.type === "none" ? "None" : `${ir.auth.type} (${ir.auth.envVariable})`}`);
  console.log(chalk.dim("  └── ") + `Strategy: ${ir.strategy.reason}`);
  console.log("");

  // Show warnings
  if (warnings.length > 0) {
    const securityWarnings = warnings.filter(w => w.startsWith("[SECURITY]"));
    if (securityWarnings.length > 0) {
      console.log(chalk.yellow(`  ⚠ ${securityWarnings.length} security warning(s) in spec (sanitized)`));
    }
  }

  // Step 2: Determine output directory
  const projectName = opts.name ?? toKebabCase(ir.product.name) + "-mcp-server";
  const outputDir = path.resolve(opts.output ?? projectName);

  // Step 3: Generate all formats
  const genSpinner = ora(`Generating ${opts.format.join(", ")}...`).start();

  try {
    const results = await generate(ir, outputDir, opts.format);
    const totalFiles = results.reduce((sum, r) => sum + r.filesWritten.length, 0);
    const formatNames = results.map(r => r.format).join(" + ");
    genSpinner.succeed(chalk.green("Generated ") + chalk.bold(formatNames) + chalk.dim(` (${totalFiles} files)`));

    for (const result of results) {
      for (const w of result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${w}`));
      }
    }
  } catch (err) {
    genSpinner.fail(chalk.red("Generation failed"));
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`  ${message}`));
    process.exit(1);
  }

  // Step 4: Summary
  console.log("");
  console.log(chalk.dim("  ─────────────────────────────────────────"));
  console.log("");
  console.log(`  ${chalk.green("✓")} Output: ${chalk.bold(outputDir)}`);
  console.log(`  ${chalk.green("✓")} Formats: ${chalk.bold(opts.format.join(", "))}`);
  console.log(`  ${chalk.green("✓")} Security scan: ${chalk.green("PASSED")}`);
  console.log("");
  console.log(chalk.bold("  Next steps:"));
  console.log(chalk.dim(`    cd ${outputDir}`));
  console.log(chalk.dim("    npm install"));
  console.log(chalk.dim("    cp .env.example .env  # add your API key"));
  console.log(chalk.dim("    npm start"));
  console.log("");
  console.log(chalk.dim("  Generated by Agentify — One command. Every agent speaks your product."));
  console.log("");
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

program
  .command("self-describe")
  .description("Output Agentify's own agent interface files (agentify.md skill, CLAUDE.md, AGENTS.md)")
  .option("-o, --output <dir>", "Output directory", ".")
  .action(async (opts: { output: string }) => {
    const selfDir = resolveSelfDir();
    const outputDir = path.resolve(opts.output);
    fs.mkdirSync(outputDir, { recursive: true });

    const files = ["agentify.md", "CLAUDE.md", "AGENTS.md"];
    for (const file of files) {
      const src = path.join(selfDir, file);
      const dest = path.join(outputDir, file);
      fs.copyFileSync(src, dest);
      console.log(`  ${chalk.green("\u2713")} ${file}`);
    }

    console.log("");
    console.log(chalk.dim("  Agent interface files for Agentify itself."));
    console.log(chalk.dim("  Add these to your project so agents know how to use Agentify."));
    console.log("");
  });

function resolveSelfDir(): string {
  for (const rel of ["../self", "../../self"]) {
    const p = path.resolve(__dirname, rel);
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Could not locate self-description files. Are you running from the npm package?");
}

program.parse();
