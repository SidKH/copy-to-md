import { describe, expect, it } from "vitest";

import { formatRedditThreadAsMarkdown } from "@/providers/reddit/markdown";
import { isRedditThreadUrl } from "@/providers/reddit/detect";

import { readExpected, readFixturePayload } from "./fixtures";

describe("reddit provider", () => {
  it("supports reddit thread URLs and rejects non-thread pages", () => {
    expect(
      isRedditThreadUrl(
        "https://www.reddit.com/r/example/comments/abc123/hello/",
      ),
    ).toBe(true);

    expect(isRedditThreadUrl("https://www.reddit.com/r/example/")).toBe(false);
    expect(isRedditThreadUrl("https://x.com/example/status/123")).toBe(false);
  });

  it("formats a minimal thread with no comments", () => {
    const payload = readFixturePayload("minimal-thread-no-comments.json");
    const markdown = formatRedditThreadAsMarkdown(
      payload,
      "https://www.reddit.com/r/example/comments/abc123/hello/",
    );

    expect(markdown).toBe(
      readExpected("minimal-thread-no-comments.expected.md"),
    );
  });

  it("formats a thread with nested comments", () => {
    const payload = readFixturePayload("thread-with-comments.json");
    const markdown = formatRedditThreadAsMarkdown(
      payload,
      "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
    );

    expect(markdown).toBe(readExpected("thread-with-comments.expected.md"));
  });

  it("omits leaf deleted comments and preserves deleted branches with replies", () => {
    const payload = readFixturePayload("deleted-comments-thread.json");
    const markdown = formatRedditThreadAsMarkdown(
      payload,
      "https://www.reddit.com/r/example/comments/del123/deleted-case/",
    );

    expect(markdown).toBe(readExpected("deleted-comments-thread.expected.md"));
  });

  it("formats image posts with preview markdown above the caption", () => {
    const payload = readFixturePayload("image-submission-thread.json");
    const markdown = formatRedditThreadAsMarkdown(
      payload,
      "https://www.reddit.com/r/codex/comments/1rwqy9x/this_is_insane/",
    );

    expect(markdown).toBe(readExpected("image-submission-thread.expected.md"));
  });
});
