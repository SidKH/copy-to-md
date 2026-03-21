import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { formatRedditThreadAsMarkdown } from "@/lib/reddit";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readFixturePayload(fileName: string): unknown {
  const raw = readFileSync(join(__dirname, "fixtures", fileName), "utf-8");
  return JSON.parse(raw);
}

function readExpected(name: string): string {
  const raw = readFileSync(join(__dirname, "fixtures", name), "utf-8");
  return raw.replace(/\r\n/g, "\n").trimEnd();
}

describe("Reddit markdown formatter", () => {
  it("matches output for minimal thread with no comments", () => {
    const payload = readFixturePayload("minimal-thread-no-comments.json");
    const threadUrl =
      "https://www.reddit.com/r/example/comments/abc123/hello/";
    const markdown = formatRedditThreadAsMarkdown(payload, threadUrl);
    const expected = readExpected("minimal-thread-no-comments.expected.md");

    expect(markdown).toBe(expected);
  });

  it("matches output for thread with nested comments", () => {
    const payload = readFixturePayload("thread-with-comments.json");
    const threadUrl =
      "https://www.reddit.com/r/example/comments/xyz789/comments-thread/";
    const markdown = formatRedditThreadAsMarkdown(payload, threadUrl);
    const expected = readExpected("thread-with-comments.expected.md");

    expect(markdown).toBe(expected);
  });

  it("does not include author names in markdown", () => {
    const payload = readFixturePayload("thread-with-comments.json");
    const threadUrl =
      "https://www.reddit.com/r/example/comments/xyz789/comments-thread/";
    const markdown = formatRedditThreadAsMarkdown(payload, threadUrl);

    expect(markdown).not.toContain("u/postauthor");
    expect(markdown).not.toContain("u/alice");
    expect(markdown).not.toContain("u/bob");
  });

  it("shows placeholder for deleted comments with replies, omits leaf deleted comments", () => {
    const payload = readFixturePayload("deleted-comments-thread.json");
    const threadUrl =
      "https://www.reddit.com/r/example/comments/del123/deleted-case/";
    const markdown = formatRedditThreadAsMarkdown(payload, threadUrl);
    const expected = readExpected("deleted-comments-thread.expected.md");

    expect(markdown).toBe(expected);
  });

  it("renders link image posts with image markdown above selftext caption", () => {
    const payload = readFixturePayload("image-submission-thread.json");
    const threadUrl =
      "https://www.reddit.com/r/codex/comments/1rwqy9x/this_is_insane/";
    const markdown = formatRedditThreadAsMarkdown(payload, threadUrl);
    const expected = readExpected("image-submission-thread.expected.md");

    expect(markdown).toBe(expected);
  });
});
