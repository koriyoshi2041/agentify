import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import type {
  AgentifyIR,
  ApiScale,
  AuthConfig,
  AuthRequirement,
  AuthType,
  Capability,
  CapabilityExample,
  Domain,
  GenerationStrategy,
  HttpMethod,
  OperationType,
  ProductMeta,
  SchemaDefinition,
  SchemaProperty,
} from "../types";
import { sanitizeDescription, sanitizeSpecField } from "./sanitizer";

type OASDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;
type OASOperation = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
type OASParameter = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
type OASSchema = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;
type OASRequestBody = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;
type OASResponse = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;

const HTTP_METHODS: readonly HttpMethod[] = ["get", "post", "put", "patch", "delete", "head", "options"];

export interface ParseResult {
  readonly ir: AgentifyIR;
  readonly warnings: readonly string[];
}

export async function parseOpenAPISpec(input: string): Promise<ParseResult> {
  const warnings: string[] = [];

  const rawApi = await SwaggerParser.validate(input) as OASDocument;
  const api = await SwaggerParser.dereference(rawApi) as OASDocument;

  const product = extractProductMeta(api, warnings);
  const auth = extractAuthConfig(api, warnings);
  const capabilities = extractCapabilities(api, warnings);
  const domains = groupIntoDomains(capabilities);
  const strategy = determineStrategy(capabilities.length);

  return {
    ir: { product, domains, capabilities, auth, strategy },
    warnings,
  };
}

function extractProductMeta(api: OASDocument, warnings: string[]): ProductMeta {
  const { value: name, warnings: nameWarns } = sanitizeSpecField(
    api.info.title || "Untitled API",
    "info.title",
  );
  warnings.push(...nameWarns);

  const { value: description, warnings: descWarns } = sanitizeDescription(
    api.info.description || "",
    "info.description",
    1000,
  );
  warnings.push(...descWarns);

  const baseUrl = extractBaseUrl(api);

  const { value: version, warnings: verWarns } = sanitizeSpecField(
    api.info.version || "0.0.0",
    "info.version",
  );
  warnings.push(...verWarns);

  const { value: docsUrl, warnings: docsWarns } = sanitizeSpecField(
    (api.externalDocs as OpenAPIV3.ExternalDocumentationObject | undefined)?.url ?? "",
    "externalDocs.url",
  );
  warnings.push(...docsWarns);

  const { value: contactEmail, warnings: contactWarns } = sanitizeSpecField(
    api.info.contact?.email ?? "",
    "info.contact.email",
  );
  warnings.push(...contactWarns);

  const { value: license, warnings: licenseWarns } = sanitizeSpecField(
    api.info.license?.name ?? "",
    "info.license.name",
  );
  warnings.push(...licenseWarns);

  return {
    name,
    description,
    version,
    baseUrl,
    docsUrl: docsUrl || undefined,
    contactEmail: contactEmail || undefined,
    license: license || undefined,
  };
}

function extractBaseUrl(api: OASDocument): string {
  let raw: string;

  // OAS 3.x: use servers array
  if (api.servers && api.servers.length > 0) {
    raw = api.servers[0]?.url ?? "http://localhost:3000";
  } else {
    // Swagger 2.0: construct from host + basePath + schemes
    const swagger2 = api as Record<string, unknown>;
    if (typeof swagger2["host"] === "string") {
      const host = swagger2["host"] as string;
      const basePath = (swagger2["basePath"] as string) ?? "";
      const schemes = swagger2["schemes"] as string[] | undefined;
      const scheme = schemes && schemes.length > 0 ? schemes[0] : "https";
      raw = `${scheme}://${host}${basePath}`;
    } else {
      return "http://localhost:3000";
    }
  }

  // Sanitize to prevent code injection via crafted server URLs
  const { value } = sanitizeSpecField(raw, "servers[0].url");
  return value;
}

function extractAuthConfig(api: OASDocument, warnings: string[]): AuthConfig {
  // OAS 3.x: components.securitySchemes
  // Swagger 2.0: securityDefinitions
  const securitySchemes =
    (api.components as OpenAPIV3.ComponentsObject | undefined)?.securitySchemes
    ?? (api as Record<string, unknown>)["securityDefinitions"] as Record<string, unknown> | undefined;

  if (!securitySchemes) {
    return {
      type: "none",
      envVariable: "",
      description: "No authentication required",
    };
  }

  const schemeEntries = Object.entries(securitySchemes);
  if (schemeEntries.length === 0) {
    return {
      type: "none",
      envVariable: "",
      description: "No authentication required",
    };
  }

  const [schemeName, schemeRef] = schemeEntries[0]!;
  const scheme = schemeRef as OpenAPIV3.SecuritySchemeObject;

  const authType = mapAuthType(scheme);
  const { value: desc, warnings: descWarns } = sanitizeDescription(
    scheme.description || `${authType} authentication`,
    `securitySchemes.${schemeName}.description`,
  );
  warnings.push(...descWarns);

  const envVar = buildEnvVariable(api.info.title || "API", authType);

  return {
    type: authType,
    scheme: "scheme" in scheme ? (scheme as OpenAPIV3.HttpSecurityScheme).scheme : undefined,
    headerName: scheme.type === "apiKey" ? (scheme as OpenAPIV3.ApiKeySecurityScheme).name : undefined,
    envVariable: envVar,
    description: desc,
  };
}

function mapAuthType(scheme: OpenAPIV3.SecuritySchemeObject): AuthType {
  switch (scheme.type) {
    case "apiKey": return "apiKey";
    case "http": {
      const httpScheme = (scheme as OpenAPIV3.HttpSecurityScheme).scheme?.toLowerCase();
      return httpScheme === "bearer" ? "bearer" : "basic";
    }
    case "oauth2": return "oauth2";
    default: return "custom";
  }
}

function buildEnvVariable(apiName: string, authType: AuthType): string {
  const prefix = apiName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();

  switch (authType) {
    case "apiKey": return `${prefix}_API_KEY`;
    case "bearer": return `${prefix}_TOKEN`;
    case "oauth2": return `${prefix}_CLIENT_ID`;
    case "basic": return `${prefix}_USERNAME`;
    default: return `${prefix}_AUTH`;
  }
}

function extractCapabilities(api: OASDocument, warnings: string[]): Capability[] {
  const capabilities: Capability[] = [];

  const paths = api.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, unknown>)[method] as OASOperation | undefined;
      if (!operation) continue;

      const capability = buildCapability(
        api,
        path,
        method,
        operation,
        pathItem as OpenAPIV3.PathItemObject,
        warnings,
      );

      if (capability) {
        capabilities.push(capability);
      }
    }
  }

  return deduplicateToolNames(capabilities);
}

/**
 * Disambiguate duplicate tool names that arise when multiple endpoints
 * resolve to the same name (e.g. GET /anything and GET /anything/{anything}
 * both become `get_anything`).
 *
 * Strategy: append `_by_<pathParam>` for endpoints that have path params.
 * Fallback: numeric suffix for any remaining collisions.
 */
function deduplicateToolNames(capabilities: Capability[]): Capability[] {
  const nameCount = new Map<string, number>();
  for (const cap of capabilities) {
    nameCount.set(cap.name, (nameCount.get(cap.name) ?? 0) + 1);
  }

  const hasDuplicates = Array.from(nameCount.values()).some(c => c > 1);
  if (!hasDuplicates) return capabilities;

  // First pass: disambiguate by appending path parameter names
  const firstPass = capabilities.map(cap => {
    if ((nameCount.get(cap.name) ?? 0) <= 1) return cap;

    const pathParams = cap.http.path.match(/\{(\w+)\}/g)?.map(m => m.slice(1, -1)) ?? [];
    if (pathParams.length > 0) {
      return { ...cap, name: `${cap.name}_by_${pathParams.join("_and_")}` };
    }
    return cap;
  });

  // Second pass: if duplicates remain, add numeric suffixes
  const finalCount = new Map<string, number>();
  return firstPass.map(cap => {
    const count = (finalCount.get(cap.name) ?? 0) + 1;
    finalCount.set(cap.name, count);
    if (count > 1) {
      return { ...cap, name: `${cap.name}_${count}` };
    }
    return cap;
  });
}

function buildCapability(
  api: OASDocument,
  path: string,
  method: HttpMethod,
  operation: OASOperation,
  _pathItem: OpenAPIV3.PathItemObject,
  warnings: string[],
): Capability | null {
  const operationId = operation.operationId ?? generateOperationId(method, path);

  const { value: rawDesc, warnings: descWarns } = sanitizeDescription(
    operation.description || operation.summary || `${method.toUpperCase()} ${path}`,
    `paths.${path}.${method}.description`,
  );
  warnings.push(...descWarns);

  const { value: agentDesc, warnings: agentDescWarns } = sanitizeDescription(
    operation.summary || rawDesc,
    `paths.${path}.${method}.summary`,
    200,
  );
  warnings.push(...agentDescWarns);

  const tags = (operation.tags ?? ["default"]).map(t => t.toLowerCase());
  const domain = tags[0] ?? "default";
  const operationType = inferOperationType(method, path, operationId);

  const input = extractInputSchema(operation, warnings, path, method);
  const output = extractOutputSchema(operation, warnings, path, method);

  const auth = extractOperationAuth(api, operation);

  const sideEffects = method !== "get" && method !== "head" && method !== "options";
  const idempotent = method === "get" || method === "put" || method === "delete" || method === "head";

  const examples = extractExamples(operation);

  return {
    id: sanitizeId(operationId),
    domain,
    name: buildToolName(operationId, method, path),
    description: rawDesc,
    agentDescription: agentDesc,
    operation: operationType,
    input,
    output,
    auth,
    http: {
      method,
      path,
      baseUrl: extractBaseUrl(api),
      contentType: extractContentType(operation),
      responseType: extractResponseType(operation),
    },
    sideEffects,
    idempotent,
    examples,
    tags,
    deprecated: operation.deprecated === true,
  };
}

function generateOperationId(method: HttpMethod, path: string): string {
  const segments = path
    .split("/")
    .filter(s => s && !s.startsWith("{"))
    .map(s => s.replace(/[^a-zA-Z0-9]/g, ""));

  return `${method}_${segments.join("_")}`;
}

function sanitizeId(id: string): string {
  return id
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function buildToolName(operationId: string, method: HttpMethod, path: string): string {
  if (operationId && !operationId.startsWith(`${method}_`)) {
    return toSnakeCase(operationId);
  }

  const segments = path
    .split("/")
    .filter(s => s && !s.startsWith("{"));

  const resource = segments[segments.length - 1] ?? "resource";
  return `${method}_${toSnakeCase(resource)}`;
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function inferOperationType(method: HttpMethod, path: string, operationId: string): OperationType {
  const lowerOp = operationId.toLowerCase();

  // Name-based inference takes priority over method-based
  if (lowerOp.includes("login") || lowerOp.includes("logout")) return "execute";
  if (lowerOp.includes("search") || lowerOp.includes("find") || lowerOp.includes("query")) return "search";
  if (lowerOp.includes("update")) return "update";
  if (lowerOp.includes("create") || lowerOp.includes("add")) return "create";
  if (lowerOp.includes("delete") || lowerOp.includes("remove")) return "delete";
  if (lowerOp.includes("list") || lowerOp.includes("getall") || lowerOp.includes("get_all")) return "list";

  switch (method) {
    case "get": return path.includes("{") ? "read" : "list";
    case "post": return "create";
    case "put": return "update";
    case "patch": return "update";
    case "delete": return "delete";
    default: return "custom";
  }
}

function extractInputSchema(
  operation: OASOperation,
  warnings: string[],
  path: string,
  method: string,
): SchemaDefinition {
  const properties: SchemaProperty[] = [];
  const required: string[] = [];

  const parameters = (operation.parameters ?? []) as OASParameter[];
  for (const param of parameters) {
    if (!param.name) continue;

    // Swagger 2.0: body parameters carry a full schema with properties.
    // Expand them the same way OAS 3.x requestBody is handled.
    if (param.in === "body") {
      const bodySchema = (param as unknown as { schema?: OASSchema }).schema;
      if (bodySchema) {
        const bodyResult = extractSwagger2BodyProperties(
          bodySchema,
          param.required === true,
          param.description || "",
          warnings,
          path,
          method,
        );
        properties.push(...bodyResult.properties);
        required.push(...bodyResult.required);
      }
      continue;
    }

    const { value: desc, warnings: w } = sanitizeDescription(
      param.description || "",
      `paths.${path}.${method}.parameters.${param.name}`,
      200,
    );
    warnings.push(...w);

    const schema = param.schema as OASSchema | undefined;

    properties.push({
      name: param.name,
      type: schema?.type?.toString() ?? "string",
      description: desc,
      required: param.required === true,
      in: param.in as "path" | "query" | "header" | "cookie",
      format: schema?.format,
      enum: schema?.enum as string[] | undefined,
      default: schema?.default,
      example: schema?.example ?? param.example,
    });

    if (param.required) {
      required.push(param.name);
    }
  }

  const requestBody = operation.requestBody as OASRequestBody | undefined;
  if (requestBody) {
    const bodyProps = extractRequestBodyProperties(requestBody, warnings, path, method);
    properties.push(...bodyProps.properties);
    required.push(...bodyProps.required);
  }

  return {
    type: "object",
    properties,
    description: `Input parameters for ${method.toUpperCase()} ${path}`,
    required,
    jsonSchema: buildJsonSchema(properties, required),
  };
}

function extractRequestBodyProperties(
  body: OASRequestBody,
  warnings: string[],
  path: string,
  method: string,
): { properties: SchemaProperty[]; required: string[] } {
  const properties: SchemaProperty[] = [];
  const required: string[] = [];

  const content = body.content;
  const mediaType = content?.["application/json"] ?? content?.[Object.keys(content)[0] ?? ""];

  if (!mediaType?.schema) return { properties, required };

  const schema = mediaType.schema as OASSchema;

  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as OASSchema;
      const { value: desc, warnings: w } = sanitizeDescription(
        prop.description || "",
        `paths.${path}.${method}.requestBody.${propName}`,
        200,
      );
      warnings.push(...w);

      const isRequired = (schema.required ?? []).includes(propName);

      properties.push({
        name: propName,
        type: prop.type?.toString() ?? "string",
        description: desc,
        required: isRequired,
        in: "body",
        format: prop.format,
        enum: prop.enum as string[] | undefined,
        default: prop.default,
        example: prop.example,
      });

      if (isRequired) {
        required.push(propName);
      }
    }
  } else {
    // Schema has no explicit properties — create a single "body" parameter
    // so the agent knows to pass request body data.
    // This covers: array types, objects without properties (e.g. additionalProperties),
    // dereferenced $refs that resolve to non-object schemas, primitives, etc.
    const schemaType = schema.type?.toString() ?? "object";
    const { value: desc, warnings: w } = sanitizeDescription(
      schema.description || body.description || `Request body (${schemaType})`,
      `paths.${path}.${method}.requestBody.body`,
      200,
    );
    warnings.push(...w);

    const isBodyRequired = body.required === true;

    properties.push({
      name: "body",
      type: schemaType,
      description: desc,
      required: isBodyRequired,
      in: "body",
      format: schema.format,
      example: schema.example,
    });

    if (isBodyRequired) {
      required.push("body");
    }
  }

  return { properties, required };
}

function extractSwagger2BodyProperties(
  schema: OASSchema,
  paramRequired: boolean,
  paramDescription: string,
  warnings: string[],
  path: string,
  method: string,
): { properties: SchemaProperty[]; required: string[] } {
  const properties: SchemaProperty[] = [];
  const required: string[] = [];

  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as OASSchema;
      const { value: desc, warnings: w } = sanitizeDescription(
        prop.description || "",
        `paths.${path}.${method}.body.${propName}`,
        200,
      );
      warnings.push(...w);

      const isRequired = (schema.required ?? []).includes(propName);

      properties.push({
        name: propName,
        type: prop.type?.toString() ?? "string",
        description: desc,
        required: isRequired,
        in: "body",
        format: prop.format,
        enum: prop.enum as string[] | undefined,
        default: prop.default,
        example: prop.example,
      });

      if (isRequired) {
        required.push(propName);
      }
    }
  } else {
    // No explicit properties — create a single "body" parameter
    const schemaType = schema.type?.toString() ?? "object";
    const { value: desc, warnings: w } = sanitizeDescription(
      schema.description || paramDescription || `Request body (${schemaType})`,
      `paths.${path}.${method}.body`,
      200,
    );
    warnings.push(...w);

    properties.push({
      name: "body",
      type: schemaType,
      description: desc,
      required: paramRequired,
      in: "body",
      format: schema.format,
      example: schema.example,
    });

    if (paramRequired) {
      required.push("body");
    }
  }

  return { properties, required };
}

function extractOutputSchema(
  operation: OASOperation,
  warnings: string[],
  path: string,
  method: string,
): SchemaDefinition {
  const responses = operation.responses ?? {};
  const successResponse = (responses["200"] ?? responses["201"] ?? responses["204"]) as OASResponse | undefined;

  if (!successResponse) {
    return {
      type: "object",
      properties: [],
      description: "Response",
      required: [],
    };
  }

  const content = successResponse.content;
  const mediaType = content?.["application/json"] ?? content?.[Object.keys(content ?? {})[0] ?? ""];

  if (!mediaType?.schema) {
    const { value: desc, warnings: w } = sanitizeDescription(
      successResponse.description || "Success",
      `paths.${path}.${method}.responses.200`,
      200,
    );
    warnings.push(...w);

    return {
      type: "object",
      properties: [],
      description: desc,
      required: [],
    };
  }

  const schema = mediaType.schema as OASSchema;
  const properties: SchemaProperty[] = [];

  if (schema.type === "object" && schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as OASSchema;
      properties.push({
        name: propName,
        type: prop.type?.toString() ?? "unknown",
        description: prop.description || "",
        required: (schema.required ?? []).includes(propName),
      });
    }
  }

  return {
    type: schema.type?.toString() ?? "object",
    properties,
    description: successResponse.description || "Success response",
    required: schema.required ?? [],
  };
}

function extractOperationAuth(api: OASDocument, operation: OASOperation): AuthRequirement {
  const opSecurity = operation.security;
  const globalSecurity = api.security;

  const security = opSecurity ?? globalSecurity;

  if (!security || security.length === 0) {
    return { required: false, type: "none" };
  }

  const firstSchemeEntry = security[0];
  if (!firstSchemeEntry || Object.keys(firstSchemeEntry).length === 0) {
    return { required: false, type: "none" };
  }

  const schemeName = Object.keys(firstSchemeEntry)[0]!;
  const scopes = firstSchemeEntry[schemeName];

  const securitySchemes = (api.components as OpenAPIV3.ComponentsObject | undefined)?.securitySchemes ?? {};
  const scheme = securitySchemes[schemeName] as OpenAPIV3.SecuritySchemeObject | undefined;

  return {
    required: true,
    type: scheme ? mapAuthType(scheme) : "custom",
    scopes: scopes && scopes.length > 0 ? scopes : undefined,
  };
}

function extractContentType(operation: OASOperation): string | undefined {
  const body = operation.requestBody as OASRequestBody | undefined;
  if (!body?.content) return undefined;
  return Object.keys(body.content)[0];
}

function extractResponseType(operation: OASOperation): string | undefined {
  const responses = operation.responses ?? {};
  const successResponse = (responses["200"] ?? responses["201"]) as OASResponse | undefined;
  if (!successResponse?.content) return undefined;
  return Object.keys(successResponse.content)[0];
}

function extractExamples(operation: OASOperation): CapabilityExample[] {
  const examples: CapabilityExample[] = [];

  const body = operation.requestBody as OASRequestBody | undefined;
  if (body?.content?.["application/json"]?.example) {
    examples.push({
      name: "Request example",
      description: "Example request body",
      input: body.content["application/json"].example as Record<string, unknown>,
    });
  }

  return examples;
}

function groupIntoDomains(capabilities: readonly Capability[]): Domain[] {
  const domainMap = new Map<string, string[]>();

  for (const cap of capabilities) {
    const existing = domainMap.get(cap.domain);
    if (existing) {
      existing.push(cap.id);
    } else {
      domainMap.set(cap.domain, [cap.id]);
    }
  }

  return Array.from(domainMap.entries()).map(([name, capIds]) => ({
    name,
    description: `Operations related to ${name}`,
    capabilityIds: capIds,
  }));
}

function determineStrategy(endpointCount: number): GenerationStrategy {
  if (endpointCount <= 30) {
    return {
      scale: "small" as ApiScale,
      endpointCount,
      reason: `${endpointCount} endpoints — direct tool mapping (one tool per endpoint)`,
    };
  }

  if (endpointCount <= 100) {
    return {
      scale: "medium" as ApiScale,
      endpointCount,
      reason: `${endpointCount} endpoints — Tool Search + Lazy Loading recommended`,
    };
  }

  return {
    scale: "large" as ApiScale,
    endpointCount,
    reason: `${endpointCount} endpoints — Code Execution + Docs Search recommended`,
  };
}

function buildJsonSchema(
  properties: readonly SchemaProperty[],
  required: readonly string[],
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: "object",
    properties: {} as Record<string, unknown>,
  };

  const propsObj = schema["properties"] as Record<string, unknown>;

  for (const prop of properties) {
    const propSchema: Record<string, unknown> = {
      type: prop.type,
      description: prop.description,
    };

    if (prop.enum) {
      propSchema["enum"] = prop.enum;
    }
    if (prop.format) {
      propSchema["format"] = prop.format;
    }
    if (prop.default !== undefined) {
      propSchema["default"] = prop.default;
    }

    propsObj[prop.name] = propSchema;
  }

  if (required.length > 0) {
    schema["required"] = required;
  }

  return schema;
}
