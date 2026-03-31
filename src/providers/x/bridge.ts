import { createDevLogger } from "@/lib/debug";

export const X_CONVERSATION_BRIDGE_KEY = "__COPY_TO_MD_X_CONVERSATION_BRIDGE__";

type ResponseLike = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type RequestInitLike = {
  body?: string | null;
  headers?: unknown;
  method?: string;
};

type RequestLike = {
  body?: string | null;
  headers?: unknown;
  method?: string;
  url: string;
};

type FetchLike = (
  input: string | URL | RequestLike,
  init?: RequestInitLike,
) => Promise<ResponseLike>;

type XMLHttpRequestLike = {
  open(method: string, url: string, ...args: unknown[]): unknown;
  send(body?: unknown): unknown;
  setRequestHeader(name: string, value: string): unknown;
};

type XMLHttpRequestConstructor = {
  new (): XMLHttpRequestLike;
  prototype: XMLHttpRequestLike;
};

type XBridgeWindow = {
  location?: {
    href: string;
  };
  fetch?: FetchLike;
  XMLHttpRequest?: XMLHttpRequestConstructor;
  [X_CONVERSATION_BRIDGE_KEY]?: XConversationBridge;
};

type XConversationBridge = {
  replayLatest(): Promise<unknown>;
};

type XConversationRequestTemplate = {
  body: string | null;
  headers: Record<string, string>;
  method: string;
  statusId: string;
  url: string;
};

type ObservedRequest = {
  body: string | null;
  headers: Record<string, string>;
  method: string;
  url: string;
};

const SUPPORTED_API_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);

const TWEET_DETAIL_OPERATION_NAMES = new Set(["TweetDetail"]);
const logger = createDevLogger("x:bridge");

export function installXConversationBridge(
  target: XBridgeWindow = globalThis as XBridgeWindow,
): void {
  if (target[X_CONVERSATION_BRIDGE_KEY]) {
    return;
  }

  const originalFetch = target.fetch;

  if (!originalFetch) {
    return;
  }

  let latestTemplate: XConversationRequestTemplate | null = null;
  let latestStatusId = getCurrentStatusId(target);

  const syncStatusId = (): string | null => {
    const currentStatusId = getCurrentStatusId(target);

    if (currentStatusId !== latestStatusId) {
      if (latestTemplate) {
        logger.debug("clearing stale x conversation template after navigation", {
          fromStatusId: latestTemplate.statusId,
          toStatusId: currentStatusId,
        });
      }

      latestTemplate = null;
      latestStatusId = currentStatusId;
    }

    return currentStatusId;
  };

  const captureRequest = (request: ObservedRequest): void => {
    const currentStatusId = syncStatusId();

    if (!currentStatusId) {
      return;
    }

    const template = extractConversationRequestTemplate(request, currentStatusId);

    if (template) {
      latestTemplate = template;
      logger.debug("captured x conversation template", {
        method: template.method,
        statusId: template.statusId,
        url: template.url,
      });
    }
  };

  target.fetch = async (input, init) => {
    captureRequest(observeFetchRequest(input, init));
    return originalFetch.call(target, input, init);
  };

  const XMLHttpRequestCtor = target.XMLHttpRequest;

  if (XMLHttpRequestCtor) {
    const originalOpen = XMLHttpRequestCtor.prototype.open;
    const originalSetRequestHeader = XMLHttpRequestCtor.prototype.setRequestHeader;
    const originalSend = XMLHttpRequestCtor.prototype.send;

    XMLHttpRequestCtor.prototype.open = function open(method, url, ...args) {
      Reflect.set(this, "__copyToMdXMethod", normalizeMethod(method));
      Reflect.set(this, "__copyToMdXUrl", url);
      Reflect.set(this, "__copyToMdXHeaders", {});
      return originalOpen.call(this, method, url, ...args);
    };

    XMLHttpRequestCtor.prototype.setRequestHeader = function setRequestHeader(
      name,
      value,
    ) {
      const headers =
        (Reflect.get(this, "__copyToMdXHeaders") as Record<string, string> | undefined) ??
        {};

      headers[name.toLowerCase()] = value;
      Reflect.set(this, "__copyToMdXHeaders", headers);
      return originalSetRequestHeader.call(this, name, value);
    };

    XMLHttpRequestCtor.prototype.send = function send(body) {
      captureRequest({
        body: typeof body === "string" ? body : null,
        headers:
          (Reflect.get(this, "__copyToMdXHeaders") as Record<string, string> | undefined) ??
          {},
        method:
          (Reflect.get(this, "__copyToMdXMethod") as string | undefined) ?? "GET",
        url: (Reflect.get(this, "__copyToMdXUrl") as string | undefined) ?? "",
      });
      return originalSend.call(this, body);
    };
  }

  target[X_CONVERSATION_BRIDGE_KEY] = {
    async replayLatest() {
      const currentStatusId = syncStatusId();

      if (
        !currentStatusId ||
        !latestTemplate ||
        latestTemplate.statusId !== currentStatusId
      ) {
        logger.warn("no x conversation template captured", {
          statusId: currentStatusId,
        });
        throw new Error("No captured X conversation request is available for this page.");
      }

      logger.debug("replaying x conversation template", {
        method: latestTemplate.method,
        statusId: currentStatusId,
        url: latestTemplate.url,
      });

      const response = await originalFetch.call(target, latestTemplate.url, {
        body: latestTemplate.body,
        headers: latestTemplate.headers,
        method: latestTemplate.method,
      });

      if (!response.ok) {
        logger.warn("x conversation replay failed", {
          method: latestTemplate.method,
          status: response.status,
          statusId: currentStatusId,
          url: latestTemplate.url,
        });
        throw new Error(
          `X conversation replay failed with status ${response.status}.`,
        );
      }

      logger.debug("x conversation replay response ok", {
        status: response.status,
        statusId: currentStatusId,
      });

      return response.json();
    },
  };
}

function getCurrentStatusId(target: XBridgeWindow): string | null {
  return getStatusIdFromUrl(target.location?.href ?? "");
}

function observeFetchRequest(
  input: string | URL | RequestLike,
  init?: RequestInitLike,
): ObservedRequest {
  if (typeof input === "string" || input instanceof URL) {
    return {
      body: typeof init?.body === "string" ? init.body : null,
      headers: normalizeHeaders(init?.headers),
      method: normalizeMethod(init?.method),
      url: String(input),
    };
  }

  return {
    body: typeof init?.body === "string" ? init.body : normalizeBody(input.body),
    headers: normalizeHeaders(init?.headers ?? input.headers),
    method: normalizeMethod(init?.method ?? input.method),
    url: input.url,
  };
}

function extractConversationRequestTemplate(
  request: ObservedRequest,
  currentStatusId: string,
): XConversationRequestTemplate | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(request.url);
  } catch {
    return null;
  }

  if (!SUPPORTED_API_HOSTS.has(parsedUrl.hostname)) {
    return null;
  }

  const operationName = getOperationNameFromPath(parsedUrl.pathname);

  if (!operationName || !TWEET_DETAIL_OPERATION_NAMES.has(operationName)) {
    return null;
  }

  const focalTweetId = getFocalTweetId(parsedUrl, request.body);

  if (focalTweetId !== currentStatusId) {
    return null;
  }

  return {
    body: request.body,
    headers: request.headers,
    method: request.method,
    statusId: currentStatusId,
    url: parsedUrl.toString(),
  };
}

function getOperationNameFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length < 5 || parts[0] !== "i" || parts[1] !== "api" || parts[2] !== "graphql") {
    return null;
  }

  return parts[4] ?? null;
}

function getFocalTweetId(url: URL, body: string | null): string | null {
  const fromQuery = parseVariables(url.searchParams.get("variables"));

  if (fromQuery) {
    return fromQuery;
  }

  if (!body) {
    return null;
  }

  try {
    const parsedBody = JSON.parse(body) as Record<string, unknown>;
    const variables =
      typeof parsedBody.variables === "string"
        ? JSON.parse(parsedBody.variables)
        : parsedBody.variables;

    return getString(
      isRecord(variables)
        ? (variables.focalTweetId ?? variables.tweetId)
        : null,
    );
  } catch {
    return null;
  }
}

function parseVariables(rawVariables: string | null): string | null {
  if (!rawVariables) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawVariables) as Record<string, unknown>;
    return getString(parsed.focalTweetId ?? parsed.tweetId);
  } catch {
    return null;
  }
}

function normalizeHeaders(value: unknown): Record<string, string> {
  if (!value) {
    return {};
  }

  if (Array.isArray(value)) {
    return Object.fromEntries(
      value.flatMap((entry) => {
        if (!Array.isArray(entry) || entry.length < 2) {
          return [];
        }

        return [[String(entry[0]).toLowerCase(), String(entry[1])]];
      }),
    );
  }

  if (typeof Headers !== "undefined" && value instanceof Headers) {
    const headers: Record<string, string> = {};

    value.forEach((headerValue, headerName) => {
      headers[headerName.toLowerCase()] = headerValue;
    });

    return headers;
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([headerName, headerValue]) => [
        headerName.toLowerCase(),
        String(headerValue),
      ]),
    );
  }

  return {};
}

function normalizeMethod(value: string | null | undefined): string {
  return value?.toUpperCase() ?? "GET";
}

function normalizeBody(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getStatusIdFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const parts = parsedUrl.pathname.split("/").filter(Boolean);

    if (parts.length < 3 || parts[1] !== "status" || !parts[2]) {
      return null;
    }

    return parts[2];
  } catch {
    return null;
  }
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
