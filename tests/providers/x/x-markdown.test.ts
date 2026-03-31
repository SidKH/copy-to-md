import { describe, expect, it } from "vitest";

import { formatXThreadAsMarkdown } from "@/providers/x/markdown";

import { readExpected } from "./fixtures";

describe("formatXThreadAsMarkdown", () => {
  it("renders the root-only v1 markdown structure", () => {
    expect(
      formatXThreadAsMarkdown(
        {
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
        },
        "https://x.com/example/status/1234567890",
      ),
    ).toBe(readExpected("root-post.expected.md"));
  });

  it("renders direct replies in tree order", () => {
    expect(
      formatXThreadAsMarkdown(
        {
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
        },
        "https://x.com/example/status/1234567890",
      ),
    ).toBe(readExpected("root-with-direct-replies.expected.md"));
  });
});
