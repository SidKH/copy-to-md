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

  it("normalizes direct replies into a reply tree", () => {
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
    };

    expect(
      normalizeXThread(payload, "https://x.com/example/status/1234567890"),
    ).toEqual({
      rootPost: {
        id: "1234567890",
        authorHandle: "example",
        postedAt: "2025-01-01T23:30:00.000Z",
        text: "Hello from X",
        retweetCount: 12,
        likeCount: 34,
        links: [],
      },
      replies: [
        {
          post: {
            id: "2233445566",
            authorHandle: "reply_one",
            postedAt: "2025-01-02T00:00:00.000Z",
            text: "First reply",
            retweetCount: 1,
            likeCount: 2,
            links: [],
          },
          replies: [],
        },
        {
          post: {
            id: "9988776655",
            authorHandle: "reply_two",
            postedAt: "2025-01-02T01:15:00.000Z",
            text: "Second reply",
            retweetCount: 3,
            likeCount: 5,
            links: ["https://example.com/reply"],
          },
          replies: [],
        },
      ],
    });
  });

  it("uses the tweet author's core screen name when legacy screen name is absent", () => {
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
                                core: {
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
                                core: {
                                  screen_name: "reply_author",
                                },
                              },
                            },
                          },
                          legacy: {
                            created_at: "Thu Jan 02 00:00:00 +0000 2025",
                            full_text: "@example That's perfect.",
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
    };

    expect(
      normalizeXThread(payload, "https://x.com/example/status/1234567890"),
    ).toEqual({
      rootPost: {
        id: "1234567890",
        authorHandle: "example",
        postedAt: "2025-01-01T23:30:00.000Z",
        text: "Hello from X",
        retweetCount: 12,
        likeCount: 34,
        links: [],
      },
      replies: [
        {
          post: {
            id: "2233445566",
            authorHandle: "reply_author",
            postedAt: "2025-01-02T00:00:00.000Z",
            text: "@example That's perfect.",
            retweetCount: 1,
            likeCount: 2,
            links: [],
          },
          replies: [],
        },
      ],
    });
  });
});
