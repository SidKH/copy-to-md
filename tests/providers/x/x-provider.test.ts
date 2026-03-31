import { beforeEach, describe, expect, it, vi } from "vitest";

import { createXCapture, createXCaptureBoundary } from "@/providers/x";

import { readExpected } from "./fixtures";

describe("x capture", () => {
  const source = {
    fetchConversationPayload: vi.fn(),
  };

  const capture = createXCapture(createXCaptureBoundary(source));

  beforeEach(() => {
    source.fetchConversationPayload.mockReset();
  });

  it("returns null for unsupported x surfaces", async () => {
    await expect(
      capture.tryCapture({
        tabId: 1,
        url: "https://x.com/home",
      }),
    ).resolves.toBeNull();

    await expect(
      capture.tryCapture({
        tabId: 1,
        url: "https://twitter.com/example/status/1234567890/retweets",
      }),
    ).resolves.toBeNull();

    expect(source.fetchConversationPayload).not.toHaveBeenCalled();
  });

  it("returns markdown for a supported x status page with direct replies", async () => {
    source.fetchConversationPayload.mockResolvedValue({
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
                {
                  entryId: "tweet-9988776655",
                  content: {
                    itemContent: {
                      tweet_results: {
                        result: {
                          __typename: "Tweet",
                          rest_id: "9988776655",
                          core: {
                            user_results: {
                              result: {
                                legacy: {
                                  screen_name: "reply_two",
                                },
                              },
                            },
                          },
                          legacy: {
                            created_at: "Thu Jan 02 01:15:00 +0000 2025",
                            full_text: "Second reply",
                            in_reply_to_status_id_str: "1234567890",
                            retweet_count: 3,
                            favorite_count: 5,
                            entities: {
                              urls: [
                                {
                                  expanded_url: "https://example.com/reply",
                                },
                              ],
                            },
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
    });

    await expect(
      capture.tryCapture({
        tabId: 7,
        url: "https://x.com/example/status/1234567890",
      }),
    ).resolves.toEqual({
      markdown: readExpected("root-with-direct-replies.expected.md"),
      sourceUrl: "https://x.com/example/status/1234567890",
    });

    expect(source.fetchConversationPayload).toHaveBeenCalledWith({
      tabId: 7,
      url: "https://x.com/example/status/1234567890",
    });
  });

  it("surfaces replay failures as capture errors", async () => {
    source.fetchConversationPayload.mockRejectedValue(
      new Error("No captured X conversation request is available for this page."),
    );

    await expect(
      capture.tryCapture({
        tabId: 7,
        url: "https://x.com/example/status/1234567890",
      }),
    ).rejects.toThrow(
      "No captured X conversation request is available for this page.",
    );
  });
});
