/**
 * OpenNext's "aws-lambda-streaming" wrapper (@opennextjs/aws 4.1.8), with one
 * fix (ADR 0014): when the body is compressed here, the Content-Length that
 * Next set for the uncompressed body is dropped. OpenNext 4.1.8 forwards it, so
 * cached pages (x-nextjs-cache: HIT) announce e.g. 180 kB but deliver 36 kB of
 * gzip and clients wait for the rest. Found by the local Lambda harness
 * (infrastructure/aws/local). Keep in sync with upstream when upgrading.
 */
import { Readable, type Writable } from "node:stream";
import zlib from "node:zlib";
import { debug, error } from "@opennextjs/aws/adapters/logger.js";
import type { WrapperHandler } from "@opennextjs/aws/types/overrides.js";
import { DetachedPromiseRunner } from "@opennextjs/aws/utils/promise.js";
import { withoutContentLength } from "./headers";

type ResponseStream = Writable & { setContentType(type: string): void };
interface LambdaRuntime {
  streamifyResponse(
    fn: (
      event: unknown,
      stream: ResponseStream,
      context: { callbackWaitsForEmptyEventLoop: boolean },
    ) => Promise<void>,
  ): unknown;
}
declare const awslambda: LambdaRuntime;
declare const serverId: string;

function formatWarmerResponse(event: { delay: number }) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ serverId, type: "warmer" }), event.delay);
  });
}

const handler: WrapperHandler = async (handler, converter) =>
  awslambda.streamifyResponse(async (event, responseStream, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    if (event && typeof event === "object" && "type" in event) {
      const result = await formatWarmerResponse(event as unknown as { delay: number });
      responseStream.end(Buffer.from(JSON.stringify(result)), "utf-8");
      await (
        globalThis as unknown as { __next_route_preloader(s: string): Promise<void> }
      ).__next_route_preloader("warmerEvent");
      return;
    }
    const internalEvent = await converter.convertFrom(event as never);
    const acceptEncoding =
      (internalEvent.headers["Accept-Encoding"] as string | undefined) ??
      (internalEvent.headers["accept-encoding"] as string | undefined) ??
      "";
    let contentEncoding: string;
    let compressedStream: Writable;
    responseStream.on("error", (err) => {
      error(err);
      responseStream.end();
    });
    if (acceptEncoding.includes("br")) {
      contentEncoding = "br";
      compressedStream = zlib.createBrotliCompress({
        flush: zlib.constants.BROTLI_OPERATION_FLUSH,
        finishFlush: zlib.constants.BROTLI_OPERATION_FINISH,
      });
      (compressedStream as zlib.BrotliCompress).pipe(responseStream);
    } else if (acceptEncoding.includes("gzip")) {
      contentEncoding = "gzip";
      compressedStream = zlib.createGzip({ flush: zlib.constants.Z_SYNC_FLUSH });
      (compressedStream as zlib.Gzip).pipe(responseStream);
    } else if (acceptEncoding.includes("deflate")) {
      contentEncoding = "deflate";
      compressedStream = zlib.createDeflate({ flush: zlib.constants.Z_SYNC_FLUSH });
      (compressedStream as zlib.Deflate).pipe(responseStream);
    } else {
      contentEncoding = "identity";
      compressedStream = responseStream;
    }
    const streamCreator = {
      writeHeaders: (_prelude: {
        statusCode: number;
        cookies: string[];
        headers: Record<string, unknown>;
      }) => {
        responseStream.setContentType("application/vnd.awslambda.http-integration-response");
        // The fix: a re-encoded body no longer matches Next's Content-Length.
        if (contentEncoding !== "identity") _prelude.headers = withoutContentLength(_prelude.headers);
        _prelude.headers["content-encoding"] = contentEncoding;
        responseStream.write(JSON.stringify(_prelude));
        responseStream.write(new Uint8Array(8));
        return compressedStream ?? responseStream;
      },
    };
    const promiseRunner = new DetachedPromiseRunner();
    const waitUntil = (promise: Promise<unknown>) => promiseRunner.add(promise);
    const response = await handler(internalEvent, { streamCreator, waitUntil } as never);
    const isUsingEdge = (globalThis as unknown as { isEdgeRuntime?: boolean }).isEdgeRuntime ?? false;
    if (isUsingEdge) {
      debug("Headers has not been set, we must be in the edge runtime");
      const stream = streamCreator.writeHeaders({
        statusCode: response.statusCode,
        headers: response.headers,
        cookies: [],
      });
      Readable.fromWeb(response.body as never).pipe(stream);
    }
    await promiseRunner.await();
  }) as never;

const streamingWrapper = {
  wrapper: handler,
  name: "aws-lambda-streaming",
  supportStreaming: true,
};

export default streamingWrapper;
