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
});
