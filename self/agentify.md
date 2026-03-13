---
name: agentify
description: Transform any OpenAPI spec into 9 agent interface formats (MCP Server, CLAUDE.md, AGENTS.md, .cursorrules, Skills, llms.txt, GEMINI.md, A2A Card, CLI)
---

You are helping the user transform an OpenAPI specification into agent interface formats using Agentify.

## Steps

1. Ask the user for the OpenAPI spec URL or file path if not provided
2. Determine which formats to generate (default: all 8 standard formats, CLI is opt-in)
3. Run the transform command:

```bash
npx agentify-cli transform <input> [options]
```

### Options

- `-o, --output <dir>` — Output directory (default: `<product-name>-mcp-server`)
- `-n, --name <name>` — Override project name
- `-f, --format <formats...>` — Select formats: mcp, claude.md, agents.md, cursorrules, skills, llms.txt, gemini.md, a2a, cli

### Available Formats

| Format | Flag | What it generates |
|--------|------|-------------------|
| MCP Server | `mcp` | Full TypeScript server with tools, handlers, Dockerfile |
| CLAUDE.md | `claude.md` | Project context for Claude Code |
| AGENTS.md | `agents.md` | Universal agent instructions (Linux Foundation standard) |
| .cursorrules | `cursorrules` | Cursor IDE agent rules |
| Skills | `skills` | Structured capability file (skills.json) |
| llms.txt | `llms.txt` | LLM-readable condensed documentation |
| GEMINI.md | `gemini.md` | Gemini CLI project context |
| A2A Card | `a2a` | Google Agent-to-Agent discovery card |
| CLI | `cli` | Standalone command-line tool (opt-in, not in defaults) |

## Examples

```bash
# All default formats
npx agentify-cli transform https://petstore.swagger.io/v2/swagger.json

# Only MCP server
npx agentify-cli transform ./api-spec.yaml -f mcp -o my-mcp-server

# Generate a CLI tool
npx agentify-cli transform ./spec.json -f cli

# Specific formats
npx agentify-cli transform ./spec.json -f mcp skills a2a
```

## Supported Inputs

- Swagger 2.0 (JSON/YAML)
- OpenAPI 3.0.x / 3.1.x (JSON/YAML)
- URL or local file path

## After Generation

Guide the user through next steps:
1. `cd <output-dir>`
2. `npm install`
3. `cp .env.example .env` and configure API keys
4. `npm start`
