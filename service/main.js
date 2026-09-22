// service/main.ts
import {
  createServer
} from "node:http";
import { fileURLToPath } from "node:url";

// service/proxy.ts
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
var UPSTREAM_ORIGIN = "http://127.0.0.1:4747";
var UPSTREAM_TIMEOUT_MS = 20000;
var AUTH_TOKEN_PATH = join(homedir(), ".opencode-mem", ".auth-token");
var ENCODED_PATH_ESCAPE = /%(?:2e|2f|5c)/i;

class ProxyRequestError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "ProxyRequestError";
  }
}
var ALLOWED_ROUTES = [
  ["GET", /^\/api\/(?:stats|tags|memories|search|user-profile)$/],
  ["POST", /^\/api\/(?:memories|memories\/bulk-delete|memories\/merge|cleanup|deduplicate|user-profile\/refresh)$/],
  ["POST", /^\/api\/memories\/[^/%?#]+\/(?:pin|unpin)$/],
  ["PUT", /^\/api\/memories\/[^/%?#]+$/],
  ["DELETE", /^\/api\/memories\/[^/%?#]+$/],
  ["PATCH", /^\/api\/user-profile\/item$/]
];
function hasUnsafePathSyntax(pathname) {
  return !pathname.startsWith("/api/") || pathname.includes("?") || pathname.includes("#") || pathname.includes("\\") || pathname.includes("//") || pathname.split("/").some((segment) => segment === "." || segment === "..") || ENCODED_PATH_ESCAPE.test(pathname);
}
function isAllowedUpstreamRequest(method, pathname) {
  if (hasUnsafePathSyntax(pathname)) {
    return false;
  }
  return ALLOWED_ROUTES.some(([allowedMethod, allowedPath]) => method === allowedMethod && allowedPath.test(pathname));
}
function readDedicatedToken() {
  try {
    const token = readFileSync(AUTH_TOKEN_PATH, "utf8").trim();
    if (token) {
      return token;
    }
  } catch {}
  throw new ProxyRequestError("UPSTREAM_UNAVAILABLE", "opencode-mem authentication token is unavailable");
}
function validateRequestBody(body) {
  if (body === undefined) {
    return;
  }
  try {
    JSON.parse(body);
  } catch {
    throw new ProxyRequestError("INVALID_REQUEST", "Request body must be valid JSON");
  }
}
function isTimeout(error) {
  return error instanceof DOMException && error.name === "TimeoutError";
}
function isJsonContentType(contentType) {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

class MemoryProxy {
  fetchImplementation;
  readToken;
  constructor(options = {}) {
    this.fetchImplementation = options.fetch ?? fetch;
    this.readToken = options.readToken ?? readDedicatedToken;
  }
  async request(input) {
    if (!isAllowedUpstreamRequest(input.method, input.pathname)) {
      throw new ProxyRequestError("INVALID_REQUEST", "Unsupported upstream request");
    }
    validateRequestBody(input.body);
    const upstreamUrl = new URL(input.pathname, UPSTREAM_ORIGIN);
    if (input.query) {
      upstreamUrl.search = input.query.toString();
    }
    let response;
    try {
      response = await this.fetchImplementation(upstreamUrl, {
        method: input.method,
        headers: {
          "x-opencode-mem-token": this.readToken(),
          ...input.body === undefined ? {} : { "Content-Type": "application/json" }
        },
        body: input.body,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      });
    } catch (error) {
      if (error instanceof ProxyRequestError) {
        throw error;
      }
      if (isTimeout(error)) {
        throw new ProxyRequestError("UPSTREAM_TIMEOUT", "opencode-mem did not respond in time");
      }
      throw new ProxyRequestError("UPSTREAM_UNAVAILABLE", "opencode-mem is not reachable on 127.0.0.1:4747");
    }
    return {
      status: response.status,
      body: await response.text(),
      contentType: isJsonContentType(response.headers.get("content-type")) ? "application/json" : undefined
    };
  }
}

// service/main.ts
var MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024;

class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body exceeds 2 MiB");
    this.name = "PayloadTooLargeError";
  }
}
function hasValidBearerToken(header, token) {
  return header === `Bearer ${token}`;
}
function writeJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}
async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_REQUEST_BODY_BYTES) {
      throw new PayloadTooLargeError;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function statusForProxyError(error) {
  if (error.code === "INVALID_REQUEST") {
    return 400;
  }
  if (error.code === "UPSTREAM_TIMEOUT") {
    return 504;
  }
  return 502;
}
function createService(options) {
  let server;
  let port = options.port;
  const proxy = options.proxy ?? new MemoryProxy;
  return {
    get url() {
      return `http://127.0.0.1:${port}`;
    },
    async start() {
      if (server) {
        return;
      }
      server = createServer(async (request, response) => {
        if (!hasValidBearerToken(request.headers.authorization, options.token)) {
          writeJson(response, 401, { code: "UNAUTHORIZED", message: "Unauthorized" });
          return;
        }
        if (request.method === "GET" && request.url === "/health") {
          writeJson(response, 200, { status: "ok" });
          return;
        }
        const rawUrl = request.url ?? "/";
        const [rawPath, rawQuery = ""] = rawUrl.split("?", 2);
        if (!rawPath.startsWith("/memory-api/")) {
          writeJson(response, 404, { code: "NOT_FOUND", message: "Not found" });
          return;
        }
        if (request.headers["transfer-encoding"]) {
          writeJson(response, 400, {
            code: "UNSUPPORTED_TRANSFER_ENCODING",
            message: "Chunked request bodies are not supported"
          });
          return;
        }
        if (Number(request.headers["content-length"]) > MAX_REQUEST_BODY_BYTES) {
          writeJson(response, 413, {
            code: "PAYLOAD_TOO_LARGE",
            message: "Request body exceeds 2 MiB"
          });
          return;
        }
        try {
          const rawBody = request.method === "GET" || request.method === "HEAD" ? undefined : await readRequestBody(request);
          const upstream = await proxy.request({
            method: request.method ?? "GET",
            pathname: rawPath.slice("/memory-api".length),
            query: new URLSearchParams(rawQuery),
            body: rawBody || undefined
          });
          response.writeHead(upstream.status, upstream.contentType ? { "Content-Type": upstream.contentType } : undefined);
          response.end(upstream.body);
        } catch (error) {
          if (error instanceof PayloadTooLargeError) {
            writeJson(response, 413, {
              code: "PAYLOAD_TOO_LARGE",
              message: error.message
            });
            return;
          }
          if (error instanceof ProxyRequestError) {
            writeJson(response, statusForProxyError(error), {
              code: error.code,
              message: error.message
            });
            return;
          }
          writeJson(response, 502, {
            code: "UPSTREAM_UNAVAILABLE",
            message: "opencode-mem is not reachable on 127.0.0.1:4747"
          });
        }
      });
      await new Promise((resolve, reject) => {
        server?.once("error", reject);
        server?.listen(port, "127.0.0.1", () => {
          const address = server?.address();
          if (address && typeof address === "object") {
            port = address.port;
          }
          resolve();
        });
      });
    },
    async stop() {
      if (!server) {
        return;
      }
      const activeServer = server;
      server = undefined;
      await new Promise((resolve, reject) => {
        activeServer.close((error) => error ? reject(error) : resolve());
      });
    }
  };
}
function serviceOptionsFromEnvironment() {
  const rawPort = process.env.OPENCHAMBER_SERVICE_PORT;
  const token = process.env.OPENCHAMBER_SERVICE_TOKEN;
  const port = Number(rawPort);
  if (!rawPort || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("OPENCHAMBER_SERVICE_PORT must be a valid TCP port");
  }
  if (!token) {
    throw new Error("OPENCHAMBER_SERVICE_TOKEN is required");
  }
  return { port, token };
}
var entrypoint = process.argv[1];
if (entrypoint && fileURLToPath(import.meta.url) === entrypoint) {
  const service = createService(serviceOptionsFromEnvironment());
  service.start().catch((error) => {
    console.error(error instanceof Error ? error.message : "Unable to start service");
    process.exitCode = 1;
  });
}
export {
  createService
};
