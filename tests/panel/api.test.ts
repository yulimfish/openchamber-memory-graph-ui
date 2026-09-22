import { describe, expect, test } from "bun:test";
import type { GuestRequest } from "@openchamber/sdk";
import { createMemoryApi, MemoryApiError } from "../../panel/api";
import memoriesFixture from "../fixtures/api/2026-09-22-memories.json";

function createHost(result: { status: number; body: string }) {
  const requests: GuestRequest[] = [];
  return {
    requests,
    host: {
      async serviceRequest(request: GuestRequest) {
        requests.push(request);
        return result;
      },
    },
  };
}

test("decodes a successful memory list response", async () => {
  const { host, requests } = createHost({
    status: 200,
    body: JSON.stringify(memoriesFixture),
  });
  const api = createMemoryApi(host);

  await expect(api.getMemories({ page: 1, pageSize: 2, includePrompts: true })).resolves.toEqual(
    memoriesFixture.data,
  );
  expect(requests).toEqual([
    {
      method: "GET",
      path: "/memory-api/api/memories",
      query: { page: "1", pageSize: "2", includePrompts: "true" },
    },
  ]);
});

test("maps service, upstream, and invalid-response failures", async () => {
  const noService = createMemoryApi({
    async serviceRequest() {
      throw { code: "NO_SERVICE", message: "Not approved" };
    },
  });
  const unauthorized = createMemoryApi({
    async serviceRequest() {
      return { status: 401, body: '{"success":false,"error":"Unauthorized"}' };
    },
  });
  const failedEnvelope = createMemoryApi({
    async serviceRequest() {
      return { status: 200, body: '{"success":false,"error":"Rejected"}' };
    },
  });
  const invalidJson = createMemoryApi({
    async serviceRequest() {
      return { status: 200, body: "not-json" };
    },
  });
  const serviceFailed = createMemoryApi({
    async serviceRequest() {
      throw { code: "SERVICE_FAILED", message: "Service exited" };
    },
  });
  const htmlFailure = createMemoryApi({
    async serviceRequest() {
      return { status: 500, body: "<html>upstream failed</html>" };
    },
  });
  const htmlUnauthorized = createMemoryApi({
    async serviceRequest() {
      return { status: 401, body: "<html>Unauthorized</html>" };
    },
  });
  const unavailable = createMemoryApi({
    async serviceRequest() {
      return {
        status: 502,
        body: '{"code":"UPSTREAM_UNAVAILABLE","message":"opencode-mem is not reachable on 127.0.0.1:4747"}',
      };
    },
  });

  await expect(noService.getStats()).rejects.toEqual(
    new MemoryApiError("NO_SERVICE", "Not approved"),
  );
  await expect(unauthorized.getStats()).rejects.toEqual(
    new MemoryApiError("UPSTREAM_UNAUTHORIZED", "Unauthorized"),
  );
  await expect(failedEnvelope.getStats()).rejects.toEqual(
    new MemoryApiError("UPSTREAM_ERROR", "Rejected"),
  );
  await expect(invalidJson.getStats()).rejects.toEqual(
    new MemoryApiError("INVALID_RESPONSE", "The service returned invalid JSON"),
  );
  await expect(serviceFailed.getStats()).rejects.toEqual(
    new MemoryApiError("SERVICE_FAILED", "Service exited"),
  );
  await expect(htmlFailure.getStats()).rejects.toEqual(
    new MemoryApiError("UPSTREAM_ERROR", "The upstream request failed with status 500"),
  );
  await expect(htmlUnauthorized.getStats()).rejects.toEqual(
    new MemoryApiError("UPSTREAM_UNAUTHORIZED", "The upstream request failed with status 401"),
  );
  await expect(unavailable.getStats()).rejects.toEqual(
    new MemoryApiError("UPSTREAM_UNAVAILABLE", "opencode-mem is not reachable on 127.0.0.1:4747"),
  );
});

test("sends explicit tags and stats requests", async () => {
  const { host, requests } = createHost({ status: 200, body: '{"success":true,"data":{}}' });
  const api = createMemoryApi(host);

  await api.getTags();
  await api.getStats();

  expect(requests).toEqual([
    { method: "GET", path: "/memory-api/api/tags" },
    { method: "GET", path: "/memory-api/api/stats" },
  ]);
});

test("filters list requests by tag parameter", async () => {
  const { host, requests } = createHost({
    status: 200,
    body: '{"success":true,"data":{"items":[],"total":0,"page":1,"pageSize":20,"totalPages":0}}',
  });
  const api = createMemoryApi(host);

  await api.getMemories({ page: 1, pageSize: 20, includePrompts: true, tag: "opencode_project_example" });

  expect(requests).toEqual([
    {
      method: "GET",
      path: "/memory-api/api/memories",
      query: { page: "1", pageSize: "20", includePrompts: "true", tag: "opencode_project_example" },
    },
  ]);
});

test("sends explicit mutation requests only", async () => {
  const { host, requests } = createHost({ status: 200, body: '{"success":true,"data":{}}' });
  const api = createMemoryApi(host);

  await api.createMemory({ containerTag: "project-example", content: "Example" });
  await api.searchMemories({ query: "example", page: 2, pageSize: 5, tag: "project-example" });
  await api.updateMemory("memory-1", { content: "Updated" });
  await api.bulkDelete(["memory-1", "memory-2"]);
  await api.pinMemory("memory-1");
  await api.unpinMemory("memory-1");
  await api.deleteMemory("memory-1");
  await api.cleanup();
  await api.deduplicate();
  await api.getUserProfile();
  await api.refreshUserProfile();

  expect(requests).toEqual([
    {
      method: "POST",
      path: "/memory-api/api/memories",
      body: '{"containerTag":"project-example","content":"Example"}',
    },
    {
      method: "GET",
      path: "/memory-api/api/search",
      query: { q: "example", page: "2", pageSize: "5", tag: "project-example" },
    },
    { method: "PUT", path: "/memory-api/api/memories/memory-1", body: '{"content":"Updated"}' },
    { method: "POST", path: "/memory-api/api/memories/bulk-delete", body: '{"ids":["memory-1","memory-2"]}' },
    { method: "POST", path: "/memory-api/api/memories/memory-1/pin" },
    { method: "POST", path: "/memory-api/api/memories/memory-1/unpin" },
    { method: "DELETE", path: "/memory-api/api/memories/memory-1" },
    { method: "POST", path: "/memory-api/api/cleanup" },
    { method: "POST", path: "/memory-api/api/deduplicate" },
    { method: "GET", path: "/memory-api/api/user-profile" },
    { method: "POST", path: "/memory-api/api/user-profile/refresh" },
  ]);
});
