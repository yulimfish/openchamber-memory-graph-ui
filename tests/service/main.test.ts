import { expect, test } from "bun:test";
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
