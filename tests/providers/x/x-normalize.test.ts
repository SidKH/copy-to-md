import { describe, expect, it } from "vitest";

import { normalizeXThread } from "@/providers/x/normalize";

describe("normalizeXThread", () => {
  it("normalizes a root post from an x payload", () => {
    const payload = {
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
                            full_text: "Hello from X https://t.co/demo",
                            retweet_count: 12,
                            favorite_count: 34,
                            entities: {
                              urls: [
                                {
                                  expanded_url: "https://example.com/article",
                                },
                              ],
                              media: [
                                {
                                  media_url_https: "https://pbs.twimg.com/media/demo.jpg",
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
    };

    expect(
      normalizeXThread(payload, "https://x.com/example/status/1234567890"),
    ).toEqual({
      rootPost: {
        id: "1234567890",
        authorHandle: "example",
        postedAt: "2025-01-01T23:30:00.000Z",
        text: "Hello from X https://t.co/demo",
        retweetCount: 12,
        likeCount: 34,
        links: [
          "https://example.com/article",
          "https://pbs.twimg.com/media/demo.jpg",
        ],
      },
      replies: [],
    });
  });
});
