# Agentify - The Meta-Tool for Agent-Native Product Transformation

## Project Vision

Agentify 是一个 **Agent Interface Compiler**——从一个 source of truth 编译出产品在 Agent 时代需要的所有接口格式（MCP Server, Skills, CLI, CLAUDE.md, .cursorrules, A2A Card 等）。

**Tagline:** "One command. Every agent speaks your product."

**核心体验:** `npx agentify transform <openapi-url>` → 完整的 Agent 接口套件

**产品成熟度目标:** 让任何 L1+ 产品一键升级到 L4（Agent-Native 全接口套件）

## Project Status

- [x] 项目初始化
- [x] 调研阶段（4 份报告）→ `research/`
- [x] 产品规划 v1 → `docs/product-plan.md`
- [x] 七人专家评审 → `research/reviews/`
- [x] 计划修订 v1 → `research/reviews/SYNTHESIS.md`
- [x] 愿景 v2 探索（2 份 UX 研究 + 7 份愿景探索）
- [x] **Vision v2 定稿** → `docs/vision-v2.md`
- [x] **Milestone 0: Foundation（第 1 周）** ✅ 核心完成
- [ ] **Milestone 1: Multi-Format MVP（第 2-3 周）** ← 当前
- [ ] Milestone 2: Intelligence Layer（第 4-5 周）
- [ ] Milestone 3: Self-Serve & Ecosystem（第 6-8 周）
- [ ] Milestone 4: Scale & Enterprise（第 9-14 周）

## Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-02 | 项目启动，代号 Agentify | 产品核心是将传统产品 "Agent化" |
| 2026-03-02 | 定位：端到端 Agent 化转型平台 | 市场空白点，无竞品覆盖全链路 |
| 2026-03-02 | GTM：开源核心 + 付费增值 | 建立 developer mindshare |
| 2026-03-02 | **[修订] 单包结构，砍掉 monorepo** | 7 人评审一致认为 monorepo 过早 |
| 2026-03-02 | **[修订] 扁平 IR 替代 Capability Graph** | Graph 推迟到 Phase 2，Phase 0.5 用 ParsedCapability[] |
| 2026-03-02 | **[修订] 安全是 Day 1，不是 Phase 3** | Hacker 发现 3 个 CRITICAL 安全威胁 |
| 2026-03-02 | **[修订] 分层生成策略** | Agent 科学家发现 context window 灾难 |
| 2026-03-02 | **[修订] 移除 ts-morph** | 老派开发者：15MB 依赖，Handlebars 足够 |
| 2026-03-02 | **[修订] 窗口期 6-9 月（非 12-18）** | 创业者调研发现云厂商已在行动 |
| 2026-03-02 | **[v2] 定位升级：Agent Interface Compiler** | 不只是 MCP，而是全格式输出 |
| 2026-03-02 | **[v2] 多格式输出（MCP+Skills+Docs+IDE rules）** | MCP+Skill 协同 +25% 任务完成率 |
| 2026-03-02 | **[v2] 5 级产品成熟度模型（L0-L4）** | L4 目前不存在，Agentify 填补空白 |
| 2026-03-02 | **[v2] Milestone 路线图（M0-M4，14 周）** | M0:MCP → M1:多格式 → M2:智能 → M3:自举 → M4:规模 |
| 2026-03-03 | **M0 核心实现完成** | Parser+Emitter+Scanner+CLI, 21 tests pass, Petstore demo verified |
| 2026-03-03 | **发现新竞品 openapi-to-skills** | 165 stars, 588 API 转换, Skills 不再是蓝海但我们做多格式统一 |
| 2026-03-03 | **时间窗口收窄至 4-7 个月** | 市场情报研究员更新：Speakeasy $37.5M 融资 |
| 2026-03-03 | **营销策略三份报告** | GTM 冷启动、增长飞轮、市场情报 → research/marketing/ |
| 2026-03-06 | **竞品形势加剧** | Speakeasy 21 Skills, Stainless 免费层扩大, 窗口收窄至 3-5 月 |
| 2026-03-06 | **npm 包名: @agentify/cli** | `agentify` 被占, 用 scoped 包 (@agentify org 已拥有) |
| 2026-03-06 | **AGENTS.md 为必生成格式** | 60K+ 采纳, Linux Foundation 标准, AI 编码工具自动读取 |
| 2026-03-06 | **GEO 策略: 内容 > 文件** | llms.txt 无 AI 引用相关性, 权威内容才是 LLM 引用来源 |
| 2026-03-06 | **社区: 低维护开源** | GitHub Issues+Discussions only, 不开 Discord, 自动化管理 |
| 2026-03-06 | **Pre-launch 分析完成** | 4 agent 团队调研 → research/strategy/ |

## Key Research Findings

- **MCP 是事实标准**: 18,000+ servers, Anthropic/OpenAI/Google 全面采纳
- **双协议体系**: MCP (Agent↔Tool) + A2A (Agent↔Agent)
- **市场**: Agentic AI $9.89B (2026), CAGR 42%
- **空白**: 无端到端转型工具、无 Readiness 评估
- **Context Window 问题**: 大型 API 不能每个 endpoint 一个 tool（GitHub MCP = 93 tools = 55K tokens）
- **安全威胁**: OpenAPI spec 投毒可导致代码注入和 prompt injection

## Tech Stack (修订后)

| 组件 | 选择 | 备注 |
|------|------|------|
| 语言 | TypeScript (strict mode) | |
| 运行时 | tsx（开发）/ tsup（构建） | 不依赖 Node 22 实验特性 |
| Schema | Zod | 输入验证 + 类型推断 |
| 代码生成 | Handlebars 模板 | 移除 ts-morph |
| MCP SDK | @modelcontextprotocol/sdk | |
| 测试 | Vitest | |
| OpenAPI | @apidevtools/swagger-parser | |
| 包管理 | 单包 agentify | 不要 monorepo |

## Project Structure (修订后)

```
agentify/
├── src/
│   ├── cli.ts              # CLI 入口
│   ├── parser/             # OpenAPI 解析 + sanitization
│   ├── generator/          # MCP Server 代码生成
│   │   ├── strategies/     # 分层生成策略 (small/medium/large)
│   │   └── templates/      # Handlebars 模板
│   ├── security/           # 输入净化 + 生成代码扫描
│   └── types.ts            # 扁平 IR 类型定义
├── templates/              # 生成项目模板 (Dockerfile, .env.example, etc.)
├── test/
├── research/               # 调研报告 (不随 npm 发布)
├── docs/                   # 产品文档
└── package.json
```

## Security Requirements (NEW)

- **ALL** OpenAPI spec 字段必须经过 sanitization
- 生成的代码禁止 eval/exec/Function 构造
- 生成的代码必须通过安全扫描
- Dog-fooding MCP Server 必须有 SSRF 防护
- .env.example 不包含真实密钥

## 分层生成策略 (NEW)

| API 规模 | endpoint 数 | 策略 | 理由 |
|---------|------------|------|------|
| 小型 | <30 | 每个 endpoint 一个 tool | 简单直接 |
| 中型 | 30-100 | Tool Search + Lazy Loading | 减少 context 占用 |
| 大型 | 100+ | Code Execution + Docs Search | Stainless 模式，减 98.7% tokens |

## Coding Conventions

- TypeScript strict mode
- 不可变数据模式（NEVER mutate）
- 小文件原则（200-400 行，最大 800 行）
- TDD 开发流程（Red → Green → Refactor）
- 所有讨论和见解记录到 research/ 目录
- 安全优先：输入验证、输出扫描

## Reference Documents

- 产品计划 v1: `docs/product-plan.md`
- 计划修订综合: `research/reviews/SYNTHESIS.md`
- 调研报告: `research/agent-native/`, `research/traditional-products/`, `research/market-analysis/`, `research/architecture/`
- 专家评审: `research/reviews/`
