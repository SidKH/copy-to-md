import { beforeEach, describe, expect, it, vi } from "vitest";

import { createXCapture, createXCaptureBoundary } from "@/providers/x";

import { readExpected } from "./fixtures";

describe("x capture", () => {
  const source = {
    fetchRootPostPayload: vi.fn(),
  };

  const capture = createXCapture(createXCaptureBoundary(source));

  beforeEach(() => {
    source.fetchRootPostPayload.mockReset();
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

    expect(source.fetchRootPostPayload).not.toHaveBeenCalled();
  });

  it("returns markdown for a supported x status page", async () => {
    source.fetchRootPostPayload.mockResolvedValue({
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
    });

    await expect(
      capture.tryCapture({
        tabId: 7,
        url: "https://x.com/example/status/1234567890",
      }),
    ).resolves.toEqual({
      markdown: readExpected("root-post.expected.md"),
      sourceUrl: "https://x.com/example/status/1234567890",
    });

    expect(source.fetchRootPostPayload).toHaveBeenCalledWith({
      tabId: 7,
      url: "https://x.com/example/status/1234567890",
    });
  });

  it("surfaces extraction failures as capture errors", async () => {
    source.fetchRootPostPayload.mockRejectedValue(
      new Error("Failed to extract the X root post from the page."),
    );

    await expect(
      capture.tryCapture({
        tabId: 7,
        url: "https://x.com/example/status/1234567890",
      }),
    ).rejects.toThrow("Failed to extract the X root post from the page.");
  });
});
