import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveCapture } from "@/background/index";
import { createCaptureRegistry } from "@/core/registry";
import { createXCapture, createXCaptureBoundary } from "@/providers/x";
import type { CaptureRegistry } from "@/core/registry";

type ChromeMock = {
  runtime: {
    onMessage: {
      addListener: ReturnType<typeof vi.fn>;
    };
  };
  tabs: {
    query: ReturnType<typeof vi.fn>;
  };
};

type CaptureRegistryMock = CaptureRegistry & {
  tryCapture: ReturnType<typeof vi.fn<CaptureRegistry["tryCapture"]>>;
};

function createChromeMock(): ChromeMock {
  return {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(),
    },
  };
}

function createCaptureRegistryMock(): CaptureRegistryMock {
  return {
    tryCapture: vi.fn<CaptureRegistry["tryCapture"]>(),
  };
}

describe("getActiveCapture", () => {
  let chromeMock: ChromeMock;
  let registryMock: CaptureRegistryMock;

  beforeEach(() => {
    chromeMock = createChromeMock();
    registryMock = createCaptureRegistryMock();
    vi.stubGlobal("chrome", chromeMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unsupported for non-provider pages", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: "https://example.com/article" },
    ]);
    registryMock.tryCapture.mockResolvedValue(null);

    await expect(getActiveCapture(registryMock)).resolves.toEqual({
      state: "unsupported",
      activeUrl: "https://example.com/article",
    });

    expect(registryMock.tryCapture).toHaveBeenCalledWith({
      tabId: 1,
      url: "https://example.com/article",
    });
  });

  it("returns markdown when a capture succeeds", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    ]);
    registryMock.tryCapture.mockResolvedValue({
      markdown: "# Thread",
      sourceUrl:
        "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
    });

    await expect(getActiveCapture(registryMock)).resolves.toEqual({
      state: "success",
      result: {
        markdown: "# Thread",
        sourceUrl:
          "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    });

    expect(registryMock.tryCapture).toHaveBeenCalledWith(
      {
        tabId: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    );
  });

  it("returns an error when capture fails", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    ]);
    registryMock.tryCapture.mockRejectedValue(
      new Error("Reddit returned 403 Forbidden"),
    );

    await expect(getActiveCapture(registryMock)).resolves.toEqual({
      state: "error",
      error: "Reddit returned 403 Forbidden",
    });
  });

  it("routes supported x status pages through the provider boundary", async () => {
    const source = {
      fetchConversationPayload: vi.fn().mockResolvedValue({
        data: {
          threaded_conversation_with_injections_v2: {
            instructions: [
              {
                type: "TimelineAddEntries",
                entries: [
                  {
                    entryId: "tweet-1234567890",
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            __typename: "Tweet",
                            rest_id: "1234567890",
                            core: {
                              user_results: {
                                result: {
                                  legacy: {
                                    screen_name: "example",
                                  },
                                },
                              },
                            },
                            legacy: {
                              created_at: "Wed Jan 01 23:30:00 +0000 2025",
                              full_text: "Hello from X",
                              retweet_count: 12,
                              favorite_count: 34,
                              entities: {},
                            },
                          },
                        },
                      },
                    },
                  },
                  {
                    entryId: "tweet-2233445566",
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            __typename: "Tweet",
                            rest_id: "2233445566",
                            core: {
                              user_results: {
                                result: {
                                  legacy: {
                                    screen_name: "reply_one",
                                  },
                                },
                              },
                            },
                            legacy: {
                              created_at: "Thu Jan 02 00:00:00 +0000 2025",
                              full_text: "First reply",
                              in_reply_to_status_id_str: "1234567890",
                              retweet_count: 1,
                              favorite_count: 2,
                              entities: {},
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      }),
    };

    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 11,
        url: "https://x.com/example/status/1234567890",
      },
    ]);

    await expect(
      getActiveCapture(
        createCaptureRegistry([createXCapture(createXCaptureBoundary(source))]),
      ),
    ).resolves.toEqual({
      state: "success",
      result: {
        markdown: `# Thread

https://x.com/example/status/1234567890

January 1, 2025 at 11:30 PM

- @example | January 1, 2025 at 11:30 PM | Hello from X | Reposts 12 | Likes 34
  - @reply_one | January 2, 2025 at 12:00 AM | First reply | Reposts 1 | Likes 2`,
        sourceUrl: "https://x.com/example/status/1234567890",
      },
    });

    expect(source.fetchConversationPayload).toHaveBeenCalledWith({
      tabId: 11,
      url: "https://x.com/example/status/1234567890",
    });
  });

  it("returns an error for supported x status pages before capture is implemented", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 12,
        url: "https://twitter.com/example/status/1234567890",
      },
    ]);

    await expect(getActiveCapture()).resolves.toEqual({
      state: "error",
      error: "X conversation replay requires the Chrome scripting API.",
    });
  });
});
