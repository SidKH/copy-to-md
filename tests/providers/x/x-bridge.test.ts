import { describe, expect, it, vi } from "vitest";

import {
  X_CONVERSATION_BRIDGE_KEY,
  installXConversationBridge,
} from "@/providers/x/bridge";

type MockResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type MockFetch = (
  input:
    | string
    | URL
    | {
        body?: string | null;
        headers?: unknown;
        method?: string;
        url: string;
      },
  init?: {
    body?: string | null;
    headers?: unknown;
    method?: string;
  },
) => Promise<MockResponse>;

type MockXhrInstance = {
  headers: Record<string, string>;
  method: string | null;
  url: string | null;
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  send(body?: string): void;
};

type MockWindow = {
  location: {
    href: string;
  };
  fetch: MockFetch;
  XMLHttpRequest: new () => MockXhrInstance;
  [X_CONVERSATION_BRIDGE_KEY]?: {
    replayLatest(): Promise<unknown>;
  };
};

function createResponse(payload: unknown, overrides?: Partial<MockResponse>): MockResponse {
  return {
    ok: overrides?.ok ?? true,
    status: overrides?.status ?? 200,
    json: async () => payload,
  };
}

function createMockWindow(fetchImpl?: MockFetch): MockWindow {
  class MockXMLHttpRequest {
    headers: Record<string, string> = {};
    method: string | null = null;
    url: string | null = null;

    open(method: string, url: string): void {
      this.method = method;
      this.url = url;
    }

    setRequestHeader(name: string, value: string): void {
      this.headers[name] = value;
    }

    send(_body?: string): void {}
  }

  return {
    location: {
      href: "https://x.com/example/status/1234567890",
    },
    fetch:
      fetchImpl ??
      vi.fn<MockFetch>().mockResolvedValue(createResponse({ data: { ok: true } })),
    XMLHttpRequest: MockXMLHttpRequest,
  };
}

function getFetchInputUrl(
  input:
    | string
    | URL
    | {
        body?: string | null;
        headers?: unknown;
        method?: string;
        url: string;
      },
): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

describe("installXConversationBridge", () => {
  it("captures the latest matching fetch template for the current status id", async () => {
    const networkFetch = vi.fn<MockFetch>((_input, init) =>
      Promise.resolve(
        createResponse(
          (init?.headers as Record<string, string> | undefined)?.authorization ===
            "Bearer latest"
            ? { data: { replayed: true } }
            : { observed: true },
        ),
      ),
    );
    const windowLike = createMockWindow(networkFetch);

    installXConversationBridge(windowLike);

    await windowLike.fetch(
      "https://x.com/i/api/graphql/abc123/TweetDetail?variables=%7B%22focalTweetId%22%3A%221234567890%22%7D",
      {
        headers: {
          authorization: "Bearer first",
        },
      },
    );
    await windowLike.fetch(
      "https://x.com/i/api/graphql/def456/TweetDetail?variables=%7B%22focalTweetId%22%3A%229999999999%22%7D",
      {
        headers: {
          authorization: "Bearer ignored",
        },
      },
    );
    await windowLike.fetch(
      "https://x.com/i/api/graphql/ghi789/TweetDetail?variables=%7B%22focalTweetId%22%3A%221234567890%22%7D",
      {
        headers: {
          authorization: "Bearer latest",
        },
      },
    );

    await expect(
      windowLike[X_CONVERSATION_BRIDGE_KEY]?.replayLatest(),
    ).resolves.toEqual({
      data: {
        replayed: true,
      },
    });

    expect(networkFetch).toHaveBeenLastCalledWith(
      "https://x.com/i/api/graphql/ghi789/TweetDetail?variables=%7B%22focalTweetId%22%3A%221234567890%22%7D",
      expect.objectContaining({
        headers: {
          authorization: "Bearer latest",
        },
        method: "GET",
      }),
    );
  });

  it("captures matching xhr requests for replay", async () => {
    const networkFetch = vi
      .fn()
      .mockResolvedValue(createResponse({ data: { replayed: "xhr" } }));
    const windowLike = createMockWindow(networkFetch);

    installXConversationBridge(windowLike);

    const request = new windowLike.XMLHttpRequest();
    request.open(
      "POST",
      "https://twitter.com/i/api/graphql/abc123/TweetDetail",
    );
    request.setRequestHeader("content-type", "application/json");
    request.send('{"variables":{"focalTweetId":"1234567890"}}');

    await expect(
      windowLike[X_CONVERSATION_BRIDGE_KEY]?.replayLatest(),
    ).resolves.toEqual({
      data: {
        replayed: "xhr",
      },
    });

    expect(networkFetch).toHaveBeenCalledWith(
      "https://twitter.com/i/api/graphql/abc123/TweetDetail",
      expect.objectContaining({
        body: '{"variables":{"focalTweetId":"1234567890"}}',
        method: "POST",
      }),
    );
  });

  it("fails clearly when no matching request has been captured", async () => {
    const windowLike = createMockWindow();

    installXConversationBridge(windowLike);

    await expect(
      windowLike[X_CONVERSATION_BRIDGE_KEY]?.replayLatest(),
    ).rejects.toThrow(
      "No captured X conversation request is available for this page.",
    );
  });

  it("invalidates a captured template after client-side navigation to a different status", async () => {
    const networkFetch = vi
      .fn<MockFetch>()
      .mockResolvedValue(createResponse({ observed: true }));
    const windowLike = createMockWindow(networkFetch);

    installXConversationBridge(windowLike);

    await windowLike.fetch(
      "https://x.com/i/api/graphql/abc123/TweetDetail?variables=%7B%22focalTweetId%22%3A%221234567890%22%7D",
      {
        headers: {
          authorization: "Bearer first",
        },
      },
    );

    windowLike.location.href = "https://x.com/example/status/9999999999";

    await expect(
      windowLike[X_CONVERSATION_BRIDGE_KEY]?.replayLatest(),
    ).rejects.toThrow(
      "No captured X conversation request is available for this page.",
    );
  });

  it("captures a fresh template after client-side navigation to a different status", async () => {
    const networkFetch = vi.fn<MockFetch>((input) =>
      Promise.resolve(
        createResponse({
          replayedFrom: getFetchInputUrl(input),
        }),
      ),
    );
    const windowLike = createMockWindow(networkFetch);

    installXConversationBridge(windowLike);

    await windowLike.fetch(
      "https://x.com/i/api/graphql/abc123/TweetDetail?variables=%7B%22focalTweetId%22%3A%221234567890%22%7D",
    );

    windowLike.location.href = "https://x.com/example/status/9999999999";

    await windowLike.fetch(
      "https://x.com/i/api/graphql/xyz987/TweetDetail?variables=%7B%22focalTweetId%22%3A%229999999999%22%7D",
      {
        headers: {
          authorization: "Bearer second",
        },
      },
    );

    await expect(
      windowLike[X_CONVERSATION_BRIDGE_KEY]?.replayLatest(),
    ).resolves.toEqual({
      replayedFrom:
        "https://x.com/i/api/graphql/xyz987/TweetDetail?variables=%7B%22focalTweetId%22%3A%229999999999%22%7D",
    });

    expect(networkFetch).toHaveBeenLastCalledWith(
      "https://x.com/i/api/graphql/xyz987/TweetDetail?variables=%7B%22focalTweetId%22%3A%229999999999%22%7D",
      expect.objectContaining({
        headers: {
          authorization: "Bearer second",
        },
        method: "GET",
      }),
    );
  });
});
