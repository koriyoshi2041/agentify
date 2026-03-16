<div align="center">

<h1>Agentify</h1>
<p>OpenAPI in. Agent interfaces out.</p>

<img src="assets/banner.svg" alt="Agentify — OpenAPI to 9 agent interface formats" width="800">

<br>

<a href="https://www.npmjs.com/package/agentify-cli"><img src="https://img.shields.io/npm/v/agentify-cli?color=cb3837&logo=npm&style=flat-square" alt="npm"></a>
<a href="https://github.com/koriyoshi2041/agentify/actions"><img src="https://img.shields.io/github/actions/workflow/status/koriyoshi2041/agentify/ci.yml?logo=github&style=flat-square" alt="CI"></a>
<a href="https://github.com/koriyoshi2041/agentify/blob/main/LICENSE"><img src="https://img.shields.io/github/license/koriyoshi2041/agentify?style=flat-square" alt="MIT License"></a>
<a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript"></a>

</div>

---

Your API has new users it doesn't know about yet — AI agents.

Claude Code reads `CLAUDE.md`. Cursor reads `.cursorrules`. Codex and Copilot read `AGENTS.md`. And if you want your API callable as a tool, you need an MCP server. That's a lot of files to write and keep in sync with your API spec.

Agentify reads your OpenAPI spec and writes them all.

```bash
npx agentify-cli transform https://petstore.swagger.io/v2/swagger.json
```

<p align="center">
  <img src="docs/demo.gif" alt="Agentify demo" width="700">
</p>

## What You Get

One command generates up to **9 formats** from a single OpenAPI spec:

| Format | Used by |
|--------|---------|
| **MCP Server** | Claude, ChatGPT, Copilot (with Dockerfile) |
| **CLAUDE.md** | Claude Code |
| **AGENTS.md** | Codex, Copilot, Cursor, Gemini CLI |
| **.cursorrules** | Cursor IDE |
| **Skills** | Agent platforms |
| **llms.txt** | LLM search engines |
| **GEMINI.md** | Gemini CLI |
| **A2A Card** | Google Agent-to-Agent protocol |
| **CLI** | A standalone command-line tool that makes real API calls |

## Quick Start

```bash
# Transform any OpenAPI spec (Swagger 2.0 or OpenAPI 3.x)
npx agentify-cli transform https://petstore.swagger.io/v2/swagger.json

# Pick specific formats
npx agentify-cli transform ./my-api.yaml -f mcp claude.md agents.md

# Generate a standalone CLI tool
npx agentify-cli transform ./my-api.yaml -f cli -o my-api-cli

# Custom output directory and project name
npx agentify-cli transform https://api.example.com/openapi.json -o ./output -n my-project
```

Example output:

```
  Agentify v0.4.1
  Agent Interface Compiler

  +-- 20 endpoints detected -> SMALL API strategy
  +-- 3 domains identified (pet, store, user)
  +-- Auth: apiKey (SWAGGER_PETSTORE_API_KEY)
  +-- Strategy: Direct tool mapping — one tool per endpoint

  > Generated mcp + claude.md + agents.md + cursorrules + llms.txt + gemini.md + skills + a2a (15 files)
  > Output: ./swagger-petstore-mcp-server
  > Security scan: PASSED
```

## Tested on Real APIs

Agentify handles APIs of any size — from 13-endpoint apps to 1,000+ endpoint platforms.

| API | Endpoints | Domains | TypeScript | Server starts |
|-----|-----------|---------|------------|---------------|
| **Notion** | 13 | 5 | PASS | PASS |
| **Petstore** (Swagger 2.0) | 20 | 3 | PASS | PASS |
| **httpbin** (non-compliant spec) | 73 | 11 | PASS | PASS |
| **Slack Web API** | 174 | 55 | PASS | PASS |
| **Stripe** | 452 | 1 | PASS | PASS |
| **GitHub REST API** | 1,093 | 43 | PASS | PASS |

Every generated MCP server compiles with zero TypeScript errors and starts immediately. Non-compliant specs (like httpbin) are auto-normalized with warnings instead of rejected. The GitHub REST API — 1,093 endpoints across 43 domains — produces a working server with 1,093 tools.

## How It Works

```
OpenAPI Spec (URL or file)
    |
    v
  PARSE ──> SANITIZE ──> ANALYZE ──> COMPILE ──> EMIT ──> SCAN ──> OUTPUT
              |              |           |          |        |
          Strip unsafe    Detect     Build IR    Run      Security
          patterns        domains,   (typed)     emitters  scan all
                          auth,                            generated
                          API scale                        code
```

Agentify parses your spec into an intermediate representation (**AgentifyIR**), then runs pluggable emitters to produce each output format. Every generated artifact goes through a security scan before being written to disk.

**Security built in:**
- Input sanitization (blocks `eval`, `exec`, `Function` constructor injection)
- Prompt injection pattern detection
- Generated code scanning

## Contributing

New emitters are welcome. Each one implements a simple interface:

```typescript
import type { Emitter, AgentifyIR, EmitterOptions, EmitterResult } from "../types";

export class MyFormatEmitter implements Emitter {
  readonly name = "my-format";
  readonly format = "my-format";

  async emit(ir: AgentifyIR, options: EmitterOptions): Promise<EmitterResult> {
    // Generate output files from the IR
    return { format: this.format, filesWritten: [...], warnings: [] };
  }
}
```

```
agentify/
+-- src/
|   +-- cli.ts              # CLI entry point
|   +-- parser/             # OpenAPI parsing + sanitization
|   +-- generator/          # Pluggable emitters for each format
|   +-- security/           # Input sanitization + output scanning
|   +-- types.ts            # AgentifyIR type definitions
+-- test/                   # Vitest test suite (136 tests)
```

## Status

This is early. It works on Swagger 2.0 and OpenAPI 3.x specs, handles auth detection, domain grouping, and API scale analysis. If you try it and something breaks, [open an issue](https://github.com/koriyoshi2041/agentify/issues) — that helps a lot.

- [x] OpenAPI parser, MCP emitter, security scanner, CLI
- [x] 9 output formats: MCP, CLAUDE.md, AGENTS.md, .cursorrules, Skills, llms.txt, GEMINI.md, A2A, CLI
- [ ] Capability graph and semantic grouping
- [ ] Web UI and one-click deploy
- [ ] Custom emitter plugins

## License

[MIT](LICENSE)
