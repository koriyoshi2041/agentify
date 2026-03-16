# Agentify — Agent Interface Compiler

Agentify helps agents understand and work with APIs. Give it an OpenAPI spec (Swagger 2.0 or OpenAPI 3.x), and it either gives you structured data about the API or generates ready-to-use agent interface code.

## Two Modes of Operation

**`agentify parse`** — Returns the API's intermediate representation (IR) as JSON. Use this when you want to understand an API's structure, write your own documentation, or build custom integrations. The IR includes product metadata, domain groupings, individual capabilities with typed inputs/outputs, auth requirements, and a generation strategy based on API scale.

**`agentify transform`** — Generates agent interface code: MCP servers, CLIs, A2A discovery cards, skills files, and more. Use this when you need runnable artifacts, not just data.

There is also **`agentify self-describe`** which outputs Agentify's own agent interface files.

## When to Use Which

If you are an agent that wants to write CLAUDE.md, AGENTS.md, or .cursorrules for an API, use `parse` to get the structured IR, then write the documentation yourself. You will produce better, more contextual results than a template ever could.

If you need generated code (an MCP server, a CLI tool, an A2A card), use `transform`. These formats require deterministic, correct code — not prose.

## Commands

```bash
# Get structured API data as JSON
npx agentify-cli parse <spec-url-or-path>

# Generate agent interface code (default: all formats)
npx agentify-cli transform <spec-url-or-path> [-o dir] [-n name] [-f format1 format2 ...]

# Output Agentify's own interface files
npx agentify-cli self-describe [-o dir]
```

### Transform Formats

`mcp` (MCP Server), `claude.md`, `agents.md`, `cursorrules`, `skills` (skills.json), `llms.txt`, `gemini.md`, `a2a` (A2A Card), `cli` (Commander.js CLI)

## What the IR Contains

The `parse` command outputs an `AgentifyIR` object with:

- **product** — Name, description, version, base URL, docs link
- **domains** — Logical groupings of related capabilities (e.g., "pets", "users", "billing")
- **capabilities** — Individual API operations, each with: name, description, agent-optimized description, operation type (create/read/update/delete/list/search/execute), typed input/output schemas, HTTP metadata, auth requirements, side effects, idempotency, examples, and tags
- **auth** — Detected authentication scheme (apiKey, bearer, oauth2, basic, or none) with the environment variable name to use
- **strategy** — Generation strategy based on API scale: small (<30 endpoints), medium (30-100), or large (100+)

## Input Handling

Agentify uses lenient parsing. It handles non-compliant specs gracefully — missing descriptions, unusual schema patterns, and vendor extensions are tolerated rather than rejected. This matters because real-world OpenAPI specs are often imperfect.

Tested against: Petstore (20 endpoints), Notion (13), httpbin (73), Slack (174), Stripe (452), GitHub (1,093).

## Examples

```bash
# Understand what an API offers
npx agentify-cli parse https://petstore.swagger.io/v2/swagger.json

# Generate an MCP server for Stripe
npx agentify-cli transform https://raw.githubusercontent.com/.../stripe.yaml -f mcp

# Generate a CLI and A2A card
npx agentify-cli transform ./my-api.yaml -f cli a2a -o my-tools
```
