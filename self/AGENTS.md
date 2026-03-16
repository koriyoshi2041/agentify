# AGENTS.md — Agentify

## Identity

Agentify is an Agent Interface Compiler. It reads OpenAPI specifications and either returns structured data about the API (parse mode) or generates agent interface code (transform mode).

Install: `npm install -g agentify-cli` or use via `npx agentify-cli`.

## How It Works

Agentify has a hybrid architecture. Some outputs are best generated deterministically (MCP servers, CLIs, A2A cards) while others — like documentation for intelligent agents — are better written by agents themselves using structured data.

**Parse mode** (`agentify parse <spec>`) outputs the intermediate representation (IR) as JSON. The IR contains product metadata, domain groupings, typed capabilities, auth configuration, and a scale-based generation strategy. Use this when you need to understand an API or write your own agent documentation.

**Transform mode** (`agentify transform <spec>`) generates runnable code and configuration files. It supports 9 output formats. Use this when you need deterministic artifacts.

**Self-describe** (`agentify self-describe`) outputs Agentify's own agent interface files.

## Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `parse <spec>` | Structured API analysis | JSON (AgentifyIR) to stdout |
| `transform <spec>` | Code generation | Files in output directory |
| `self-describe` | Agentify's own interfaces | skills.json, CLAUDE.md, AGENTS.md |

### Transform Options

- `-o, --output <dir>` — Output directory
- `-n, --name <name>` — Override project name
- `-f, --format <formats...>` — Select formats: mcp, claude.md, agents.md, cursorrules, skills, llms.txt, gemini.md, a2a, cli

## When to Use Each Command

Use `parse` when you are an agent that wants to reason about an API — its domains, capabilities, auth scheme, and scale. The JSON output is designed for programmatic consumption. This is the right choice if you plan to write documentation, analyze API coverage, or build custom tooling.

Use `transform` when you need generated code: an MCP server with tool handlers, a standalone CLI, an A2A discovery card, or a skills manifest. These formats require structural correctness that benefits from deterministic generation.

## Supported Inputs

- Swagger 2.0 and OpenAPI 3.x (JSON or YAML)
- URL or local file path
- Lenient parsing: non-compliant specs are handled gracefully

## Key Capabilities

- Parses OpenAPI into a flat, agent-optimized intermediate representation
- Detects auth schemes (apiKey, bearer, oauth2, basic) and maps them to environment variables
- Groups endpoints into semantic domains automatically
- Selects generation strategy by API scale (small/medium/large)
- Sanitizes all spec inputs to prevent injection in generated code
- Scans generated output for security issues

## Tested At Scale

| API | Endpoints | Notes |
|-----|-----------|-------|
| Notion | 13 | Small, clean spec |
| Petstore | 20 | Swagger 2.0 reference |
| httpbin | 73 | Medium, diverse operations |
| Slack | 174 | Large, complex auth |
| Stripe | 452 | Very large, nested schemas |
| GitHub | 1,093 | Stress test scale |

## Constraints

- Requires Node.js 18+
- Remote specs require internet access
- Generated MCP servers need their own `npm install` and env configuration

## Context

- Repository: https://github.com/koriyoshi2041/agentify
- npm: https://www.npmjs.com/package/agentify-cli
- License: MIT
