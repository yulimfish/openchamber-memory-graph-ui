// service/main.ts
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
function hasValidBearerToken(header, token) {
  return header === `Bearer ${token}`;
}
function createService(options) {
  let server;
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
