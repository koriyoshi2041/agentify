<p align="center">
  <h1 align="center">Agentify</h1>
  <p align="center">
    <strong>Agent Interface Compiler</strong> — One command. Every agent speaks your product.
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@agentify/cli"><img src="https://img.shields.io/npm/v/@agentify/cli?color=cb3837&logo=npm" alt="npm"></a>
  <a href="https://github.com/koriyoshi2041/agentify/actions"><img src="https://img.shields.io/github/actions/workflow/status/koriyoshi2041/agentify/ci.yml?logo=github" alt="CI"></a>
  <a href="https://github.com/koriyoshi2041/agentify/blob/main/LICENSE"><img src="https://img.shields.io/github/license/koriyoshi2041/agentify" alt="MIT License"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
</p>

---

Agentify transforms any OpenAPI specification into a complete suite of agent interfaces. Instead of manually building MCP servers, writing CLAUDE.md files, crafting agent skills, and configuring IDE rules separately, Agentify compiles them all from a single source of truth.

```bash
npx @agentify/cli transform https://petstore.swagger.io/v2/swagger.json
```

<!-- TODO: Replace with actual demo GIF recorded via VHS -->
<!--
<p align="center">
  <img src="docs/demo.gif" alt="Agentify demo" width="600">
</p>
-->

## The Problem

AI agents are the new users of your API. But making your product agent-accessible requires building and maintaining multiple interface formats:

| Format | Who consumes it | Manual effort |
|--------|----------------|---------------|
| MCP Server | Claude, ChatGPT, Copilot | Days of coding |
| CLAUDE.md | Claude Code | Write from scratch |
| AGENTS.md | Codex, Copilot, Cursor, Gemini CLI | Write from scratch |
| .cursorrules | Cursor IDE | Write from scratch |
| Skills | 30+ agent platforms | Per-platform work |
| llms.txt | LLM search engines | Manual authoring |
| A2A Card | Google Agent-to-Agent protocol | JSON schema work |

**That's 7+ formats to build, test, and keep in sync.** Every API change means updating all of them.

## The Solution

Agentify is a compiler. OpenAPI in, every agent format out.

```
                    +---> MCP Server (with Dockerfile)
                    |
                    +---> CLAUDE.md
                    |
OpenAPI Spec -----> +---> AGENTS.md
                    |
                    +---> .cursorrules
                    |
                    +---> Skills
                    |
                    +---> llms.txt
                    |
                    +---> A2A Card
```

## Quick Start

```bash
# Transform any OpenAPI spec
npx @agentify/cli transform https://petstore.swagger.io/v2/swagger.json

# Specify output directory
npx @agentify/cli transform ./my-api.yaml -o ./output

# Override project name
npx @agentify/cli transform https://api.example.com/openapi.json -n my-project
```

**Output:**

```
  Agentify v0.1.0
  Agent Interface Compiler

  +-- 20 endpoints detected -> SMALL API strategy
  +-- 3 domains identified (pet, store, user)
  +-- Auth: apiKey (SWAGGER_PETSTORE_API_KEY)
  +-- Strategy: Direct tool mapping — one tool per endpoint

  > Generated MCP Server (8 files)
  > Output: ./petstore-mcp-server
  > Security scan: PASSED
```

## Features

**Smart Strategy Selection** — Automatically chooses the right generation strategy based on API size:

| API Size | Endpoints | Strategy | Why |
|----------|-----------|----------|-----|
| Small | < 30 | Direct mapping | One tool per endpoint, simple and complete |
| Medium | 30-100 | Tool Search + Lazy Loading | Reduces context window usage |
| Large | 100+ | Code Execution + Docs Search | Avoids the "93 tools = 55K tokens" problem |

**Security First** — Every generated artifact passes through:
- Input sanitization (blocks eval, exec, Function constructor, require/import injection)
- Handlebars template injection prevention
- Prompt injection pattern detection
- Generated code security scanning

**Production Ready** — Generated MCP servers include:
- TypeScript source with full type safety
- Dockerfile for containerized deployment
- Environment variable configuration (.env.example)
- Express-based HTTP transport

## Output Format Status

| Format | Status | Description |
|--------|--------|-------------|
| MCP Server | Available | Full server with tools, handlers, Dockerfile |
| CLAUDE.md | Planned | Project context for Claude Code |
| AGENTS.md | Planned | Universal agent instructions |
| .cursorrules | Planned | Cursor IDE agent rules |
| Skills | Planned | Agent instruction files for 30+ platforms |
| llms.txt | Planned | LLM-readable documentation |
| A2A Card | Planned | Google Agent-to-Agent discovery |

## How It Works

```
1. PARSE        OpenAPI 3.0/3.1 spec (URL or file)
                  |
2. SANITIZE     Strip dangerous patterns from all spec fields
                  |
3. ANALYZE      Detect domains, auth, scale -> pick strategy
                  |
4. COMPILE      Generate AgentifyIR (intermediate representation)
                  |
5. EMIT         Run selected emitters (MCP, Skills, Docs, etc.)
                  |
6. SCAN         Security scan all generated code
                  |
7. OUTPUT       Write files to disk
```

**AgentifyIR** is the canonical intermediate representation — a flat, typed structure that captures everything an emitter needs: product metadata, capabilities (endpoints), domains, auth config, and generation strategy.

## Architecture

```
agentify/
+-- src/
|   +-- cli.ts              # CLI entry point (Commander.js)
|   +-- parser/             # OpenAPI parsing + input sanitization
|   +-- generator/          # Pluggable emitters for each format
|   |   +-- templates/      # Handlebars templates
|   +-- security/           # Input sanitization + output scanning
|   +-- types.ts            # AgentifyIR type definitions
+-- templates/              # Generated project templates
+-- test/                   # Vitest test suite
```

## Contributing

Agentify welcomes contributions, especially **new emitters** (output formats). Each emitter implements a simple interface:

```typescript
import type { Emitter, AgentifyIR, EmitterOptions, EmitterResult } from "../types";

export class MyFormatEmitter implements Emitter {
  readonly name = "my-format";
  readonly format = "my-format";

  async emit(ir: AgentifyIR, options: EmitterOptions): Promise<EmitterResult> {
    // Generate output files from the IR
    return { filesWritten: [...], warnings: [] };
  }
}
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Roadmap

- [x] **M0: Foundation** — OpenAPI parser, MCP emitter, security scanner, CLI
- [ ] **M1: Multi-Format** — Skills, CLAUDE.md, AGENTS.md, .cursorrules, llms.txt, A2A
- [ ] **M2: Intelligence** — Capability graph, semantic grouping, context optimization
- [ ] **M3: Self-Serve** — Web UI, one-click deploy, registry integrations
- [ ] **M4: Scale** — Enterprise features, custom emitters, CI/CD integration

## Compared to Alternatives

| Feature | Agentify | Speakeasy | Stainless | openapi-to-skills |
|---------|----------|-----------|-----------|-------------------|
| MCP Server | Yes | Yes | No | No |
| Skills | Planned | CLI only | No | Yes |
| CLAUDE.md | Planned | No | No | No |
| AGENTS.md | Planned | No | No | No |
| .cursorrules | Planned | No | No | No |
| llms.txt | Planned | Yes | No | No |
| A2A Card | Planned | No | No | No |
| Context-aware strategy | Yes | No | Yes | No |
| Security scanning | Yes | Unknown | Unknown | No |
| Open source | MIT | No | No | MIT |

**No existing tool compiles one OpenAPI spec into all agent interface formats.**

## License

[MIT](LICENSE) -- Agentify Contributors
