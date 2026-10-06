/**
 * Aurora DSQL helpers (ADR 0014). Kept free of `server-only` and of the
 * database client so they can be unit-tested and reused by scripts.
 *
 * - DSQL authenticates with short-lived IAM tokens instead of passwords; one is
 *   signed for every new connection (a token is only checked at connect time).
 * - DSQL uses optimistic concurrency: a transaction that conflicts with a
 *   concurrent one fails at commit with SQLSTATE 40001 and must be retried.
 *   PostgreSQL uses the same code for serialization failures, so the retry
 *   helper is harmless locally.
 */

/** `abc123.dsql.ap-south-1.on.aws` → `ap-south-1`. */
export function dsqlRegionFromHost(host: string): string | null {
  const match = /\.dsql\.([a-z0-9-]+)\.on\.aws$/i.exec(host);
  return match?.[1] ?? null;
}

/**
 * Returns a postgres.js `password` function that signs a fresh DSQL token for
 * the user in `databaseUrl`. `admin` gets an admin token (migrations only);
 * any other user is a custom role mapped to the runtime's IAM role.
 */
export function dsqlPassword(databaseUrl: string): () => Promise<string> {
  const url = new URL(databaseUrl);
  const hostname = url.hostname;
  const region = dsqlRegionFromHost(hostname) ?? process.env.AWS_REGION;
  if (!region) throw new Error(`Cannot tell the AWS Region of DSQL endpoint ${hostname}; set AWS_REGION.`);
  const asAdmin = decodeURIComponent(url.username) === "admin";
  return async () => {
    const { DsqlSigner } = await import("@aws-sdk/dsql-signer");
    const signer = new DsqlSigner({ hostname, region, expiresIn: 900 });
    return asAdmin ? signer.getDbConnectAdminAuthToken() : signer.getDbConnectAuthToken();
  };
}

/** DSQL OCC conflicts (OC000/OC001) and PostgreSQL serialization failures. */
export function isRetryableConflict(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; cause?: unknown };
  if (e.code === "40001") return true;
  return e.cause !== undefined && e.cause !== err ? isRetryableConflict(e.cause) : false;
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

/**
 * Runs `work` and retries it on a concurrency conflict with jittered
 * exponential backoff. `work` must be safe to re-run as a whole (a database
 * transaction is: it rolled back).
 */
export async function withConflictRetry<T>(work: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const base = opts.baseDelayMs ?? 25;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = opts.random ?? Math.random;
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (err) {
      if (attempt >= attempts || !isRetryableConflict(err)) throw err;
      await sleep(base * 2 ** (attempt - 1) * (0.5 + random()));
    }
  }
}
