// Local stand-in for CloudFront + a Lambda Function URL (response streaming),
// used to exercise the real OpenNext server function without AWS (ADR 0014).
//
//   node harness.mjs <function dir> <assets dir> [port]
//
// - Static paths that CloudFront sends to S3 (_next/*, brand/*, usba-logo.png,
//   BUILD_ID) are served from <assets dir>.
// - Everything else becomes an API Gateway v2 / Function URL event for the
//   handler, invoked the way the Lambda runtime does for streaming functions.
// - Like the deployed CloudFront Function, it forwards the viewer Host as
//   x-forwarded-host (Server Actions compare it with Origin) and adds
//   cloudfront-viewer-address.
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";

const [fnDir, assetsDir, portArg] = process.argv.slice(2);
if (!fnDir || !assetsDir) {
  console.error("usage: node harness.mjs <function dir> <assets dir> [port]");
  process.exit(2);
}
const port = Number(portArg ?? 3000);

// Lambda runtime globals used by the aws-lambda-streaming wrapper.
globalThis.awslambda = {
  streamifyResponse: (fn) => fn,
  HttpResponseStream: { from: (stream) => stream },
};
process.chdir(fnDir);
const { handler } = await import(pathToFileURL(path.join(fnDir, "index.mjs")).href);

const S3_PATTERNS = [/^\/_next\//, /^\/brand\//, /^\/usba-logo\.png$/, /^\/BUILD_ID$/];
const TYPES = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".txt": "text/plain",
};

function serveAsset(pathname, res) {
  const file = path.join(assetsDir, decodeURIComponent(pathname));
  if (!file.startsWith(path.resolve(assetsDir)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
    "cache-control": pathname.startsWith("/_next/static/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  });
  fs.createReadStream(file).pipe(res);
}

function toEvent(req, url, body) {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k] = Array.isArray(v) ? v.join(",") : String(v);
  headers["x-forwarded-host"] = headers.host ?? "";
  // The Function URL's own host: OpenNext regenerates stale pages and Next
  // fetches redirect targets by requesting it, so it must reach this harness.
  headers.host = `localhost:${port}`;
  headers["cloudfront-viewer-address"] =
    `${req.socket.remoteAddress ?? "127.0.0.1"}:${req.socket.remotePort ?? 0}`;
  // CloudFront's origin custom header. `x-harness-direct: 1` leaves it out, to
  // check what a request straight to the Function URL gets.
  if (process.env.ORIGIN_VERIFY_SECRET && headers["x-harness-direct"] !== "1") {
    headers["x-origin-verify"] = process.env.ORIGIN_VERIFY_SECRET;
  }
  const cookies = (headers.cookie ?? "")
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);
  delete headers.cookie;
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    cookies,
    headers,
    requestContext: {
      domainName: headers.host,
      requestId: randomUUID(),
      http: {
        method: req.method,
        path: url.pathname,
        protocol: "HTTP/1.1",
        sourceIp: req.socket.remoteAddress ?? "127.0.0.1",
        userAgent: headers["user-agent"] ?? "",
      },
    },
    body: body.length ? body.toString("base64") : undefined,
    isBase64Encoded: true,
  };
}

/** The streaming wrapper writes a JSON prelude, 8 zero bytes, then the body. */
function responseStreamFor(res) {
  let stage = 0;
  const stream = new Writable({
    write(chunk, _enc, done) {
      if (stage === 0) {
        const prelude = JSON.parse(Buffer.from(chunk).toString("utf8"));
        const headers = { ...prelude.headers };
        if (prelude.cookies?.length) headers["set-cookie"] = prelude.cookies;
        res.writeHead(prelude.statusCode ?? 200, headers);
        stage = 1;
      } else if (stage === 1 && chunk.length === 8 && chunk.every((b) => b === 0)) {
        stage = 2;
      } else {
        res.write(chunk);
      }
      done();
    },
    final(done) {
      if (stage === 0) res.writeHead(200);
      res.end();
      done();
    },
  });
  stream.setContentType = () => {};
  return stream;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (S3_PATTERNS.some((p) => p.test(url.pathname)) && req.method === "GET")
    return serveAsset(url.pathname, res);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const context = {
    awsRequestId: randomUUID(),
    callbackWaitsForEmptyEventLoop: true,
    getRemainingTimeInMillis: () => 30_000,
  };
  try {
    await handler(toEvent(req, url, Buffer.concat(chunks)), responseStreamFor(res), context);
  } catch (err) {
    console.error("handler failed", err);
    if (!res.headersSent) res.writeHead(502);
    res.end("Lambda handler error");
  }
});
server.listen(port, () => console.log(`Lambda harness on http://localhost:${port}`));
