import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRedditCapture } from "@/providers/reddit";

import { readExpected, readFixturePayload } from "./fixtures";

describe("reddit capture", () => {
  const transport = {
    fetchThreadPayload: vi.fn(),
  };

  const capture = createRedditCapture(transport);

  beforeEach(() => {
    transport.fetchThreadPayload.mockReset();
  });

  it("returns null for unsupported URLs", async () => {
    await expect(
      capture.tryCapture({
        tabId: 1,
        url: "https://x.com/example/status/123",
      }),
    ).resolves.toBeNull();

    expect(transport.fetchThreadPayload).not.toHaveBeenCalled();
  });

  it("returns markdown for a supported reddit thread", async () => {
    transport.fetchThreadPayload.mockResolvedValue(
      readFixturePayload("thread-with-comments.json"),
    );

    await expect(
      capture.tryCapture({
        tabId: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      }),
    ).resolves.toEqual({
      markdown: readExpected("thread-with-comments.expected.md"),
      sourceUrl:
        "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
    });

    expect(transport.fetchThreadPayload).toHaveBeenCalledWith(
      "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
    );
  });

  it("preserves deleted branches with replies", async () => {
    transport.fetchThreadPayload.mockResolvedValue(
      readFixturePayload("deleted-comments-thread.json"),
    );

    await expect(
      capture.tryCapture({
        tabId: 7,
        url: "https://www.reddit.com/r/example/comments/del123/deleted-case/",
      }),
    ).resolves.toEqual({
      markdown: readExpected("deleted-comments-thread.expected.md"),
      sourceUrl:
        "https://www.reddit.com/r/example/comments/del123/deleted-case/",
    });
  });

  it("preserves image-post rendering", async () => {
    transport.fetchThreadPayload.mockResolvedValue(
      readFixturePayload("image-submission-thread.json"),
    );

    await expect(
      capture.tryCapture({
        tabId: 7,
        url: "https://www.reddit.com/r/codex/comments/1rwqy9x/this_is_insane/",
      }),
    ).resolves.toEqual({
      markdown: readExpected("image-submission-thread.expected.md"),
      sourceUrl:
        "https://www.reddit.com/r/codex/comments/1rwqy9x/this_is_insane/",
    });
  });

  it("surfaces transport failures as capture errors", async () => {
    transport.fetchThreadPayload.mockRejectedValue(
      new Error("Reddit returned 403 Forbidden"),
    );

    await expect(
      capture.tryCapture({
        tabId: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      }),
    ).rejects.toThrow("Reddit returned 403 Forbidden");
  });
});
