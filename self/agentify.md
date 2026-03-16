---
name: agentify
description: Transform any API into agent-consumable formats. Uses Agentify for deterministic code generation (MCP, CLI, A2A, Skills) and guides you to write intelligent agent documentation (CLAUDE.md, AGENTS.md, .cursorrules, GEMINI.md, llms.txt) informed by parsed API structure.
---

Help the user make their API accessible to AI agents using Agentify.

## How This Works

Agentify operates in two modes, and you should use both:

1. **Deterministic generation** — MCP servers, CLI tools, A2A cards, skills.json need exact syntax, correct imports, and valid TypeScript. Use `agentify transform` for these.
2. **Agent-authored documentation** — CLAUDE.md, AGENTS.md, .cursorrules, GEMINI.md, llms.txt are natural language files that benefit from your intelligence. YOU write these, informed by the API structure Agentify reveals.

A mechanical template lists every endpoint like a data dump. You can do better: explain what the API does conceptually, group operations by use case, warn about side effects, and suggest common workflows.

## Step 1: Understand the API

Use `parse` to get the API's intermediate representation (IR) as structured JSON:

```bash
npx agentify-cli parse <spec-url-or-path>
```

This outputs the full IR to stdout — product metadata, domains, capabilities with typed schemas, auth config, and generation strategy. Warnings go to stderr.

For a lighter version suitable for context windows:

```bash
npx agentify-cli parse <spec-url-or-path> --summary
```

Read the IR to understand the API's structure: its domains, endpoints, input/output schemas, auth requirements, and which operations have side effects. Use this understanding to write intelligent documentation in Step 3.

## Step 2: Generate Code (deterministic)

For formats that require precise, compilable code:

```bash
# MCP server — full server with tools, handlers, Dockerfile
npx agentify-cli transform <spec> -f mcp -o ./output

# CLI tool — standalone Commander.js CLI
npx agentify-cli transform <spec> -f cli -o ./output

# Multiple code formats together
npx agentify-cli transform <spec> -f mcp cli a2a skills -o ./output
```

### Options

- `-o, --output <dir>` — where to write output (default: `<name>-mcp-server`)
- `-n, --name <name>` — override project name
- `-f, --format <formats...>` — pick specific formats

### Code Formats

| Format | Flag | What it generates |
|--------|------|-------------------|
| MCP Server | `mcp` | Full TypeScript MCP server with tools, handlers, Dockerfile |
| CLI | `cli` | Standalone Commander.js command-line tool |
| A2A Card | `a2a` | Google Agent-to-Agent discovery card (JSON) |
| Skills | `skills` | Structured capability file (skills.json) |

These are best generated deterministically because they need exact syntax, correct imports, and valid code.

## Step 3: Write Agent Documentation (YOU do this)

For documentation formats, YOU should write them based on what you learned about the API. Do not use `agentify transform` for these — your intelligence produces better results than templates.

### Formats you should author

**CLAUDE.md** — Project context for Claude Code sessions.

Write as if briefing a new team member. Include:
- What the API does and its core domain concepts (not just "provides endpoints for X")
- Authentication setup: what env vars to set, how to obtain credentials
- The mental model behind the API design — why resources are organized the way they are
- Common workflows: "To create a pet, first POST /pet, then upload an image with POST /pet/{petId}/uploadImage"
- Which operations are safe to call repeatedly vs. which have side effects
- Gotchas: rate limits, pagination patterns, required field combinations, ordering dependencies
- Which operations are most commonly used together

**AGENTS.md** — Universal agent instructions (Linux Foundation / Agentic AI Foundation standard).

Follow the AGENTS.md spec structure:
- **Identity**: One sentence on what the API/product is
- **Capabilities**: Group by use case, not by HTTP method. For each capability: what it does, the command or endpoint, inputs, outputs, side effects
- **Authentication**: How to authenticate, what scopes are needed
- **Constraints**: Rate limits, size limits, required preconditions
- **Context**: Links to docs, repo, support

**.cursorrules** — Cursor IDE agent rules.

Write terse, directive rules. Examples:
- "Always include Authorization header with Bearer token from PETSTORE_API_KEY env var."
- "Check pet status before calling updatePet — status must be 'available'."
- "Use findPetsByStatus for filtered queries, not getPetById in a loop."
- "POST /pet returns the created pet with server-assigned ID — use that ID for subsequent calls."
- "File uploads to /pet/{petId}/uploadImage require multipart/form-data, not JSON."

**GEMINI.md** — Gemini CLI project context.

Similar to CLAUDE.md, but also include a Gemini-specific MCP configuration JSON block showing how to connect the generated MCP server:
```json
{
  "mcpServers": {
    "<api-name>": {
      "command": "node",
      "args": ["./output/dist/server.js"],
      "env": { "API_KEY": "" }
    }
  }
}
```

**llms.txt** — Ultra-condensed LLM-readable summary.

Keep it minimal. Structure:
- One h1 with the API name
- One-line description
- Key endpoints grouped by domain (just name and one-line purpose, no parameters)
- Auth info (one line)
- Link to full docs

### What makes GOOD agent documentation

**DO:**
- Explain the API's purpose and core concepts in natural language
- Group operations by USE CASE, not just API tags ("Managing Pets" not "pet-controller")
- Highlight which operations have side effects and which are safe to retry
- Suggest common multi-step workflows and operation sequences
- Include authentication setup with specific env var names
- Note rate limits, pagination patterns, required field combinations
- Write in the VOICE of the target format (Cursor rules are terse; CLAUDE.md is conversational)
- Mention which operations return paginated results and how to handle pagination

**DON'T:**
- Mechanically list every endpoint with its parameters (the MCP server handles that)
- Copy-paste the OpenAPI description verbatim
- Include request/response schemas in full (agents discover these via MCP tools)
- Write generic boilerplate ("This API provides endpoints for...")
- Add parameter details for every operation (focus on gotchas and non-obvious requirements)

## Common User Requests

| User says | What to do |
|-----------|------------|
| "Make my API work with Claude" | `parse` to understand the API, `transform -f mcp` for the server, then write CLAUDE.md yourself |
| "Generate everything for my API" | `parse` for understanding, `transform -f mcp cli a2a skills` for code, then write all doc formats yourself |
| "Just the MCP server" | `npx agentify-cli transform <spec> -f mcp` |
| "What does this API do?" | `npx agentify-cli parse <spec> --summary` then explain in plain language |
| "Convert to all formats" | `transform` for code formats, then write doc formats using `parse` output |
| "Set up for Cursor" | `parse` to understand the API, `transform -f mcp` for the server, then write .cursorrules yourself |
| "I need agent docs for this API" | `parse` to get structured data, then write CLAUDE.md + AGENTS.md + .cursorrules |

## Supported Input

- OpenAPI 3.x (JSON or YAML)
- Swagger 2.0 (JSON or YAML)
- URL or local file path
- Non-compliant specs are auto-normalized with warnings

## After Generation

Guide the user through setup:

```bash
cd <output-dir>
npm install
cp .env.example .env   # add API credentials
npm start              # starts the MCP server
```

For CLI output, the generated tool is a standalone binary — guide them to `npm install && npm link` for global access.
