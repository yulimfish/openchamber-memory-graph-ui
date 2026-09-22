import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const UPSTREAM_ORIGIN = "http://127.0.0.1:4747";
const UPSTREAM_TIMEOUT_MS = 20_000;
const AUTH_TOKEN_PATH = join(homedir(), ".opencode-mem", ".auth-token");
const ENCODED_PATH_ESCAPE = /%(?:2e|2f|5c)/i;

export type ProxyRequest = {
  method: string;
  pathname: string;
  query?: URLSearchParams;
  body?: string;
};

export type ProxyResponse = {
  status: number;
  body: string;
  contentType?: "application/json";
};

export type MemoryRequestProxy = {
  request(input: ProxyRequest): Promise<ProxyResponse>;
};

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type MemoryProxyOptions = {
  fetch?: FetchImplementation;
  readToken?: () => string;
};

export class ProxyRequestError extends Error {
  constructor(
    readonly code: "INVALID_REQUEST" | "UPSTREAM_TIMEOUT" | "UPSTREAM_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "ProxyRequestError";
  }
}

const ALLOWED_ROUTES: ReadonlyArray<readonly [string, RegExp]> = [
  ["GET", /^\/api\/(?:stats|tags|memories|search|user-profile)$/],
  ["POST", /^\/api\/(?:memories|memories\/bulk-delete|memories\/merge|cleanup|deduplicate|user-profile\/refresh)$/],
  ["POST", /^\/api\/memories\/[^/%?#]+\/(?:pin|unpin)$/],
  ["PUT", /^\/api\/memories\/[^/%?#]+$/],
  ["DELETE", /^\/api\/memories\/[^/%?#]+$/],
  ["PATCH", /^\/api\/user-profile\/item$/],
];

function hasUnsafePathSyntax(pathname: string): boolean {
  return (
    !pathname.startsWith("/api/") ||
    pathname.includes("?") ||
    pathname.includes("#") ||
    pathname.includes("\\") ||
    pathname.includes("//") ||
    pathname.split("/").some((segment) => segment === "." || segment === "..") ||
    ENCODED_PATH_ESCAPE.test(pathname)
  );
}

export function isAllowedUpstreamRequest(method: string, pathname: string): boolean {
  if (hasUnsafePathSyntax(pathname)) {
    return false;
  }

  return ALLOWED_ROUTES.some(
    ([allowedMethod, allowedPath]) => method === allowedMethod && allowedPath.test(pathname),
  );
}

function readDedicatedToken(): string {
  try {
    const token = readFileSync(AUTH_TOKEN_PATH, "utf8").trim();
    if (token) {
      return token;
    }
  } catch {
    // The stable service error below intentionally omits filesystem details.
  }

  throw new ProxyRequestError(
    "UPSTREAM_UNAVAILABLE",
    "opencode-mem authentication token is unavailable",
  );
}

function validateRequestBody(body: string | undefined): void {
  if (body === undefined) {
    return;
  }

  try {
    JSON.parse(body);
  } catch {
    throw new ProxyRequestError("INVALID_REQUEST", "Request body must be valid JSON");
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

function isJsonContentType(contentType: string | null): boolean {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

export class MemoryProxy implements MemoryRequestProxy {
  private readonly fetchImplementation: FetchImplementation;
  private readonly readToken: () => string;

  constructor(options: MemoryProxyOptions = {}) {
    this.fetchImplementation = options.fetch ?? fetch;
    this.readToken = options.readToken ?? readDedicatedToken;
  }

  async request(input: ProxyRequest): Promise<ProxyResponse> {
    if (!isAllowedUpstreamRequest(input.method, input.pathname)) {
      throw new ProxyRequestError("INVALID_REQUEST", "Unsupported upstream request");
    }
    validateRequestBody(input.body);

    const upstreamUrl = new URL(input.pathname, UPSTREAM_ORIGIN);
    if (input.query) {
      upstreamUrl.search = input.query.toString();
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(upstreamUrl, {
        method: input.method,
        headers: {
          "x-opencode-mem-token": this.readToken(),
          ...(input.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: input.body,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof ProxyRequestError) {
        throw error;
      }
      if (isTimeout(error)) {
        throw new ProxyRequestError(
          "UPSTREAM_TIMEOUT",
          "opencode-mem did not respond in time",
        );
      }
      throw new ProxyRequestError(
        "UPSTREAM_UNAVAILABLE",
        "opencode-mem is not reachable on 127.0.0.1:4747",
      );
    }

    return {
      status: response.status,
      body: await response.text(),
      contentType: isJsonContentType(response.headers.get("content-type"))
        ? "application/json"
        : undefined,
    };
  }
}
