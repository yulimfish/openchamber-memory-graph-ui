import { expect, test } from "bun:test";
import { request as httpRequest } from "node:http";
import { createService } from "../../service/main";

test("health endpoint requires the OpenChamber bearer token", async () => {
  const service = createService({ port: 0, token: "test-service-token" });
  await service.start();

  try {
    const unauthenticated = await fetch(`${service.url}/health`);
    expect(unauthenticated.status).toBe(401);

    const response = await fetch(`${service.url}/health`, {
      headers: { Authorization: "Bearer test-service-token" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  } finally {
    await service.stop();
  }
});

test("forwards only authenticated memory API requests to the proxy", async () => {
  const requests: Array<{ method: string; pathname: string; body?: string }> = [];
  const service = createService({
    port: 0,
    token: "test-service-token",
    proxy: {
      async request(request) {
        requests.push({
          method: request.method,
          pathname: request.pathname,
          body: request.body,
        });
        return {
          status: 200,
          body: '{"success":true}',
          contentType: "application/json",
        };
      },
    },
  });
  await service.start();

  try {
    const response = await fetch(`${service.url}/memory-api/api/memories`, {
      method: "POST",
      headers: {
        Authorization: "Bearer test-service-token",
        "Content-Type": "application/json",
      },
      body: '{"content":"example"}',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(requests).toEqual([
      {
        method: "POST",
        pathname: "/api/memories",
        body: '{"content":"example"}',
      },
    ]);
  } finally {
    await service.stop();
  }
});

test("rejects memory API bodies larger than 2 MiB", async () => {
  const service = createService({
    port: 0,
    token: "test-service-token",
    proxy: {
      async request() {
        throw new Error("The proxy must not receive an oversized request");
      },
    },
  });
  await service.start();

  try {
    const response = await fetch(`${service.url}/memory-api/api/memories`, {
      method: "POST",
      headers: {
        Authorization: "Bearer test-service-token",
        "Content-Type": "application/json",
      },
      body: "x".repeat(2 * 1024 * 1024 + 1),
    });

    const body = await response.json();
    expect(response.status).toBe(413);
    expect(body).toEqual({
      code: "PAYLOAD_TOO_LARGE",
      message: "Request body exceeds 2 MiB",
    });
  } finally {
    await service.stop();
  }
});

test("allows zero-byte mutation requests", async () => {
  const requests: Array<{ body?: string }> = [];
  const service = createService({
    port: 0,
    token: "test-service-token",
    proxy: {
      async request(request) {
        requests.push({ body: request.body });
        return { status: 200, body: '{"success":true}', contentType: "application/json" };
      },
    },
  });
  await service.start();

  try {
    const response = await fetch(`${service.url}/memory-api/api/cleanup`, {
      method: "POST",
      headers: { Authorization: "Bearer test-service-token" },
    });

    expect(response.status).toBe(200);
    expect(requests).toEqual([{ body: undefined }]);
  } finally {
    await service.stop();
  }
});

test("rejects chunked GET bodies before the proxy", async () => {
  let calls = 0;
  const service = createService({
    port: 0,
    token: "test-service-token",
    proxy: {
      async request() {
        calls += 1;
        return { status: 200, body: '{"success":true}', contentType: "application/json" };
      },
    },
  });
  await service.start();

  try {
    const url = new URL(`${service.url}/memory-api/api/stats`);
    const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const request = httpRequest(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: "GET",
          headers: {
            Authorization: "Bearer test-service-token",
            "Transfer-Encoding": "chunked",
          },
        },
        (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          incoming.on("end", () => {
            resolve({ status: incoming.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
          });
        },
      );
      request.on("error", reject);
      request.end("x".repeat(2 * 1024 * 1024 + 1));
    });

    expect(response.status).toBe(400);
    expect(calls).toBe(0);
  } finally {
    await service.stop();
  }
});
