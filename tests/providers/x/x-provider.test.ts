import { beforeEach, describe, expect, it, vi } from "vitest";

import { createXCapture } from "@/providers/x";

describe("x capture", () => {
  const boundary = {
    captureThread: vi.fn(),
  };

  const capture = createXCapture(boundary);

  beforeEach(() => {
    boundary.captureThread.mockReset();
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

    expect(boundary.captureThread).not.toHaveBeenCalled();
  });

  it("routes supported status pages through the provider boundary", async () => {
    boundary.captureThread.mockResolvedValue({
      markdown: "# Thread",
      sourceUrl: "https://x.com/example/status/1234567890",
    });

    await expect(
      capture.tryCapture({
        tabId: 7,
        url: "https://x.com/example/status/1234567890",
      }),
    ).resolves.toEqual({
      markdown: "# Thread",
      sourceUrl: "https://x.com/example/status/1234567890",
    });

    expect(boundary.captureThread).toHaveBeenCalledWith({
      tabId: 7,
      url: "https://x.com/example/status/1234567890",
    });
  });
});
