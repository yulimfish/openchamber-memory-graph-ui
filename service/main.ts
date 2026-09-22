import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";

export type ServiceOptions = {
  port: number;
  token: string;
};

export type LocalService = {
  readonly url: string;
  start(): Promise<void>;
  stop(): Promise<void>;
};

function hasValidBearerToken(header: string | undefined, token: string): boolean {
  return header === `Bearer ${token}`;
}

export function createService(options: ServiceOptions): LocalService {
  let server: Server | undefined;
  let port = options.port;

  return {
    get url() {
      return `http://127.0.0.1:${port}`;
    },
    async start() {
      if (server) {
        return;
      }

      server = createServer((request, response) => {
        if (!hasValidBearerToken(request.headers.authorization, options.token)) {
          response.writeHead(401, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ code: "UNAUTHORIZED", message: "Unauthorized" }));
          return;
        }

        if (request.method === "GET" && request.url === "/health") {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ status: "ok" }));
          return;
        }

        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ code: "NOT_FOUND", message: "Not found" }));
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
