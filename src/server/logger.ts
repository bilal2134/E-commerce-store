import "server-only";

/**
 * Minimal structured JSON logger. Provider-neutral: every host (Vercel,
 * Render, ECS/CloudWatch, Docker) collects stdout. Swap for pino or an APM
 * SDK later without touching call sites.
 */

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const REDACT_KEYS = /pass(word)?|secret|token|authorization|cookie|session|key/i;

function minLevel(): Level {
  const v = process.env.LOG_LEVEL;
  return v === "debug" || v === "info" || v === "warn" || v === "error" ? v : "info";
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_KEYS.test(k) ? "[redacted]" : sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

function write(level: Level, msg: string, context?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[minLevel()]) return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg,
    ...(context ? (sanitize(context) as Record<string, unknown>) : {}),
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => write("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => write("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => write("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => write("error", msg, ctx),
};
