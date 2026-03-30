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
});
