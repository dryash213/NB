import { Langfuse } from "langfuse";

export type LangfuseObservationLevel = "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";

export interface SafeSpan {
  id?: string;
  update(options: {
    output?: any;
    metadata?: Record<string, any>;
    level?: LangfuseObservationLevel | string;
    statusMessage?: string;
    endTime?: Date | number;
  }): void;
  end(options?: {
    output?: any;
    metadata?: Record<string, any>;
    level?: LangfuseObservationLevel | string;
    statusMessage?: string;
    endTime?: Date | number;
  }): void;
}

export interface SafeGeneration {
  id?: string;
  update(options: {
    output?: any;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      [key: string]: any;
    };
    metadata?: Record<string, any>;
    level?: LangfuseObservationLevel | string;
    statusMessage?: string;
    endTime?: Date | number;
  }): void;
  end(options?: {
    output?: any;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      [key: string]: any;
    };
    metadata?: Record<string, any>;
    level?: LangfuseObservationLevel | string;
    statusMessage?: string;
    endTime?: Date | number;
  }): void;
}

export interface SafeTrace {
  id?: string;
  span(options: {
    name: string;
    input?: any;
    metadata?: Record<string, any>;
    startTime?: Date | number;
  }): SafeSpan;
  generation(options: {
    name: string;
    model?: string;
    input?: any;
    output?: any;
    usage?: any;
    metadata?: Record<string, any>;
    startTime?: Date | number;
    endTime?: Date | number;
    level?: LangfuseObservationLevel | string;
    statusMessage?: string;
  }): SafeGeneration;
  update(options: {
    output?: any;
    metadata?: Record<string, any>;
    tags?: string[];
  }): void;
}

export interface SafeGenerationOptions {
  name: string;
  model?: string;
  input?: any;
  output?: any;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    [key: string]: any;
  };
  startTime?: number | Date;
  endTime?: number | Date;
  metadata?: Record<string, any>;
  level?: LangfuseObservationLevel | string;
  statusMessage?: string;
}

export interface SafeLangfuseTracer {
  isConfigured: boolean;
  createTrace(options: {
    id?: string;
    name: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    input?: any;
    tags?: string[];
  }): SafeTrace;
  createGeneration(options: SafeGenerationOptions): SafeGeneration;
  flushAsync(): Promise<void>;
  shutdownAsync(): Promise<void>;
}

function toDate(val?: number | Date): Date | undefined {
  if (val === undefined || val === null) return undefined;
  return typeof val === "number" ? new Date(val) : val;
}

function toLevel(level?: string): LangfuseObservationLevel | undefined {
  if (!level) return undefined;
  const upper = level.toUpperCase();
  if (upper === "DEBUG" || upper === "DEFAULT" || upper === "WARNING" || upper === "ERROR") {
    return upper as LangfuseObservationLevel;
  }
  return undefined;
}

export class NoopSpan implements SafeSpan {
  update(_options: any): void {}
  end(_options?: any): void {}
}

export class NoopGeneration implements SafeGeneration {
  update(_options: any): void {}
  end(_options?: any): void {}
}

export class NoopTrace implements SafeTrace {
  span(_options: any): SafeSpan {
    return new NoopSpan();
  }
  generation(_options: any): SafeGeneration {
    return new NoopGeneration();
  }
  update(_options: any): void {}
}

export class NoopTracer implements SafeLangfuseTracer {
  readonly isConfigured = false;
  createTrace(_options: any): SafeTrace {
    return new NoopTrace();
  }
  createGeneration(_options: any): SafeGeneration {
    return new NoopGeneration();
  }
  async flushAsync(): Promise<void> {
    return Promise.resolve();
  }
  async shutdownAsync(): Promise<void> {
    return Promise.resolve();
  }
}

export class RealSpan implements SafeSpan {
  constructor(private rawSpan: any) {}

  get id(): string | undefined {
    return this.rawSpan?.id;
  }

  update(options: {
    output?: any;
    metadata?: Record<string, any>;
    level?: string;
    statusMessage?: string;
    endTime?: Date | number;
  }): void {
    try {
      this.rawSpan?.update?.({
        output: options.output,
        metadata: options.metadata,
        level: toLevel(options.level),
        statusMessage: options.statusMessage,
        endTime: toDate(options.endTime),
      });
    } catch {
      // Telemetry errors must never crash application
    }
  }

  end(options?: {
    output?: any;
    metadata?: Record<string, any>;
    level?: string;
    statusMessage?: string;
    endTime?: Date | number;
  }): void {
    try {
      this.rawSpan?.end?.({
        output: options?.output,
        metadata: options?.metadata,
        level: toLevel(options?.level),
        statusMessage: options?.statusMessage,
      });
    } catch {
      // Telemetry errors must never crash application
    }
  }
}

export class RealGeneration implements SafeGeneration {
  constructor(private rawGen: any) {}

  get id(): string | undefined {
    return this.rawGen?.id;
  }

  update(options: {
    output?: any;
    usage?: any;
    metadata?: Record<string, any>;
    level?: string;
    statusMessage?: string;
    endTime?: Date | number;
  }): void {
    try {
      this.rawGen?.update?.({
        output: options.output,
        usage: options.usage,
        metadata: options.metadata,
        level: toLevel(options.level),
        statusMessage: options.statusMessage,
        endTime: toDate(options.endTime),
      });
    } catch {
      // Telemetry errors must never crash application
    }
  }

  end(options?: {
    output?: any;
    usage?: any;
    metadata?: Record<string, any>;
    level?: string;
    statusMessage?: string;
    endTime?: Date | number;
  }): void {
    try {
      this.rawGen?.end?.({
        output: options?.output,
        usage: options?.usage,
        metadata: options?.metadata,
        level: toLevel(options?.level),
        statusMessage: options?.statusMessage,
      });
    } catch {
      // Telemetry errors must never crash application
    }
  }
}

export class RealTrace implements SafeTrace {
  constructor(private rawTrace: any) {}

  get id(): string | undefined {
    return this.rawTrace?.id;
  }

  span(options: {
    name: string;
    input?: any;
    metadata?: Record<string, any>;
    startTime?: Date | number;
  }): SafeSpan {
    try {
      const s = this.rawTrace?.span?.({
        name: options.name,
        input: options.input,
        metadata: options.metadata,
        startTime: toDate(options.startTime),
      });
      return new RealSpan(s);
    } catch {
      return new NoopSpan();
    }
  }

  generation(options: {
    name: string;
    model?: string;
    input?: any;
    output?: any;
    usage?: any;
    metadata?: Record<string, any>;
    startTime?: Date | number;
    endTime?: Date | number;
    level?: string;
    statusMessage?: string;
  }): SafeGeneration {
    try {
      const g = this.rawTrace?.generation?.({
        name: options.name,
        model: options.model,
        input: options.input,
        output: options.output,
        usage: options.usage,
        metadata: options.metadata,
        startTime: toDate(options.startTime),
        endTime: toDate(options.endTime),
        level: toLevel(options.level),
        statusMessage: options.statusMessage,
      });
      return new RealGeneration(g);
    } catch {
      return new NoopGeneration();
    }
  }

  update(options: {
    output?: any;
    metadata?: Record<string, any>;
    tags?: string[];
  }): void {
    try {
      this.rawTrace?.update?.({
        output: options.output,
        metadata: options.metadata,
        tags: options.tags,
      });
    } catch {
      // Telemetry errors must never crash application
    }
  }
}

export class RealTracer implements SafeLangfuseTracer {
  readonly isConfigured = true;

  constructor(private client: Langfuse) {}

  createTrace(options: {
    id?: string;
    name: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    input?: any;
    tags?: string[];
  }): SafeTrace {
    try {
      const t = this.client.trace({
        id: options.id,
        name: options.name,
        sessionId: options.sessionId,
        metadata: options.metadata,
        input: options.input,
        tags: options.tags,
      });
      return new RealTrace(t);
    } catch {
      return new NoopTrace();
    }
  }

  createGeneration(options: SafeGenerationOptions): SafeGeneration {
    try {
      const g = this.client.generation({
        name: options.name,
        model: options.model,
        input: options.input,
        output: options.output,
        usage: options.usage,
        metadata: options.metadata,
        startTime: toDate(options.startTime),
        endTime: toDate(options.endTime),
        level: toLevel(options.level),
        statusMessage: options.statusMessage,
      });
      if (
        options.endTime !== undefined ||
        options.output !== undefined ||
        options.level === "ERROR"
      ) {
        g.end({
          output: options.output,
          usage: options.usage,
          metadata: options.metadata,
          level: toLevel(options.level),
          statusMessage: options.statusMessage,
        });
      }
      return new RealGeneration(g);
    } catch {
      return new NoopGeneration();
    }
  }

  async flushAsync(): Promise<void> {
    try {
      await this.client.flushAsync();
    } catch {
      // Swallowed safely
    }
  }

  async shutdownAsync(): Promise<void> {
    try {
      await this.client.shutdownAsync();
    } catch {
      // Swallowed safely
    }
  }
}

let cachedTracer: SafeLangfuseTracer | null = null;
let cachedConfigKey = "";

/**
 * Returns a SafeLangfuseTracer singleton instance.
 * Automatically checks LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in process.env.
 * If unset or missing, returns a NoopTracer that guarantees zero runtime errors.
 */
export function getLangfuseTracer(options?: { forceReinit?: boolean }): SafeLangfuseTracer {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
  const baseUrl = process.env.LANGFUSE_BASE_URL?.trim() || "https://cloud.langfuse.com";

  const configKey = `${publicKey || ""}:${secretKey || ""}:${baseUrl}`;

  if (!options?.forceReinit && cachedTracer && cachedConfigKey === configKey) {
    return cachedTracer;
  }

  cachedConfigKey = configKey;

  if (!publicKey || !secretKey) {
    cachedTracer = new NoopTracer();
    return cachedTracer;
  }

  try {
    const isExplicitlyDisabled = process.env.LANGFUSE_ENABLED === "false";
    const client = new Langfuse({
      publicKey,
      secretKey,
      baseUrl,
      requestTimeout: 3000,
      enabled: !isExplicitlyDisabled,
    });
    cachedTracer = new RealTracer(client);
    return cachedTracer;
  } catch {
    cachedTracer = new NoopTracer();
    return cachedTracer;
  }
}

/**
 * Flush pending telemetry safely without unhandled rejections.
 */
export async function safeFlush(): Promise<void> {
  const tracer = getLangfuseTracer();
  await tracer.flushAsync();
}
