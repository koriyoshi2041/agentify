import { z } from "zod";

// ─── Generation Strategy ────────────────────────────────

export type ApiScale = "small" | "medium" | "large";

export interface GenerationStrategy {
  readonly scale: ApiScale;
  readonly endpointCount: number;
  readonly reason: string;
}

// ─── Auth ────────────────────────────────────────────────

export type AuthType = "none" | "apiKey" | "bearer" | "oauth2" | "basic" | "custom";

export interface AuthConfig {
  readonly type: AuthType;
  readonly scheme?: string;
  readonly headerName?: string;
  readonly envVariable: string;
  readonly description: string;
}

export interface AuthRequirement {
  readonly required: boolean;
  readonly type: AuthType;
  readonly scopes?: readonly string[];
}

// ─── Schema ──────────────────────────────────────────────

export type ParameterLocation = "path" | "query" | "header" | "cookie" | "body";

export interface SchemaProperty {
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly required: boolean;
  readonly in?: ParameterLocation;
  readonly format?: string;
  readonly enum?: readonly string[];
  readonly default?: unknown;
  readonly example?: unknown;
}

export interface SchemaDefinition {
  readonly type: string;
  readonly properties: readonly SchemaProperty[];
  readonly description: string;
  readonly required: readonly string[];
  readonly jsonSchema?: Record<string, unknown>;
}

// ─── HTTP Metadata ───────────────────────────────────────

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "head" | "options";

export interface HttpMetadata {
  readonly method: HttpMethod;
  readonly path: string;
  readonly baseUrl: string;
  readonly contentType?: string;
  readonly responseType?: string;
}

// ─── Example ─────────────────────────────────────────────

export interface CapabilityExample {
  readonly name: string;
  readonly description: string;
  readonly input: Record<string, unknown>;
  readonly output?: Record<string, unknown>;
}

// ─── Operation Type ──────────────────────────────────────

export type OperationType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "list"
  | "search"
  | "execute"
  | "custom";

// ─── Capability (core IR unit) ───────────────────────────

export interface Capability {
  readonly id: string;
  readonly domain: string;
  readonly name: string;
  readonly description: string;
  readonly agentDescription: string;
  readonly operation: OperationType;
  readonly input: SchemaDefinition;
  readonly output: SchemaDefinition;
  readonly auth: AuthRequirement;
  readonly http: HttpMetadata;
  readonly sideEffects: boolean;
  readonly idempotent: boolean;
  readonly examples: readonly CapabilityExample[];
  readonly tags: readonly string[];
  readonly deprecated: boolean;
}

// ─── Domain ──────────────────────────────────────────────

export interface Domain {
  readonly name: string;
  readonly description: string;
  readonly capabilityIds: readonly string[];
}

// ─── Product Meta ────────────────────────────────────────

export interface ProductMeta {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly baseUrl: string;
  readonly docsUrl?: string;
  readonly contactEmail?: string;
  readonly license?: string;
}

// ─── AgentifyIR (top-level) ──────────────────────────────

export interface AgentifyIR {
  readonly product: ProductMeta;
  readonly domains: readonly Domain[];
  readonly capabilities: readonly Capability[];
  readonly auth: AuthConfig;
  readonly strategy: GenerationStrategy;
}

// ─── Emitter Interface ───────────────────────────────────
// M1+ emitters (Skills, CLAUDE.md, .cursorrules) will implement this

export interface EmitterOptions {
  readonly outputDir: string;
  readonly overwrite?: boolean;
}

export interface EmitterResult {
  readonly format: string;
  readonly filesWritten: readonly string[];
  readonly warnings: readonly string[];
}

export interface Emitter {
  readonly name: string;
  readonly format: string;
  emit(ir: AgentifyIR, options: EmitterOptions): Promise<EmitterResult>;
}

// ─── Zod Schemas for Input Validation ────────────────────

export const CliInputSchema = z.object({
  input: z.string().min(1, "Input URL or file path is required"),
  output: z.string().optional(),
  name: z.string().optional(),
  format: z.array(z.string()).default(["mcp"]),
  overwrite: z.boolean().default(false),
});

export type CliInput = z.infer<typeof CliInputSchema>;
