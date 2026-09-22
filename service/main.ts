import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { fileURLToPath } from "node:url";
import {
  MemoryProxy,
  type MemoryRequestProxy,
  ProxyRequestError,
} from "./proxy";

const MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024;

class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body exceeds 2 MiB");
    this.name = "PayloadTooLargeError";
  }
}

export type ServiceOptions = {
  port: number;
  token: string;
  proxy?: MemoryRequestProxy;
};

export type LocalService = {
  readonly url: string;
  start(): Promise<void>;
  stop(): Promise<void>;
};

function hasValidBearerToken(header: string | undefined, token: string): boolean {
  return header === `Bearer ${token}`;
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_REQUEST_BODY_BYTES) {
      throw new PayloadTooLargeError();
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function statusForProxyError(error: ProxyRequestError): number {
  if (error.code === "INVALID_REQUEST") {
    return 400;
  }
  if (error.code === "UPSTREAM_TIMEOUT") {
    return 504;
  }
  return 502;
}

export function createService(options: ServiceOptions): LocalService {
  let server: Server | undefined;
  let port = options.port;
  const proxy = options.proxy ?? new MemoryProxy();

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
            message: "Chunked request bodies are not supported",
          });
          return;
        }
        if (Number(request.headers["content-length"]) > MAX_REQUEST_BODY_BYTES) {
          writeJson(response, 413, {
            code: "PAYLOAD_TOO_LARGE",
            message: "Request body exceeds 2 MiB",
          });
          return;
        }

        try {
          const rawBody = request.method === "GET" || request.method === "HEAD"
            ? undefined
            : await readRequestBody(request);
          const upstream = await proxy.request({
            method: request.method ?? "GET",
            pathname: rawPath.slice("/memory-api".length),
            query: new URLSearchParams(rawQuery),
            body: rawBody || undefined,
          });
          response.writeHead(
            upstream.status,
            upstream.contentType ? { "Content-Type": upstream.contentType } : undefined,
          );
          response.end(upstream.body);
        } catch (error) {
          if (error instanceof PayloadTooLargeError) {
            writeJson(response, 413, {
              code: "PAYLOAD_TOO_LARGE",
              message: error.message,
            });
            return;
          }
          if (error instanceof ProxyRequestError) {
            writeJson(response, statusForProxyError(error), {
              code: error.code,
              message: error.message,
            });
            return;
          }
          writeJson(response, 502, {
            code: "UPSTREAM_UNAVAILABLE",
            message: "opencode-mem is not reachable on 127.0.0.1:4747",
          });
        }
      });

      await new Promise<void>((resolve, reject) => {
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
      await new Promise<void>((resolve, reject) => {
        activeServer.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

function serviceOptionsFromEnvironment(): ServiceOptions {
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

const entrypoint = process.argv[1];
if (entrypoint && fileURLToPath(import.meta.url) === entrypoint) {
  const service = createService(serviceOptionsFromEnvironment());
  service.start().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Unable to start service");
    process.exitCode = 1;
  });
}
