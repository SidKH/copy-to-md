import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveCapture } from "@/background/index";
import { createCaptureRegistry } from "@/core/registry";
import { createXCapture } from "@/providers/x";
import type { CaptureRegistry } from "@/core/registry";

type ChromeMock = {
  runtime: {
    onMessage: {
      addListener: ReturnType<typeof vi.fn>;
    };
  };
  tabs: {
    query: ReturnType<typeof vi.fn>;
  };
};

type CaptureRegistryMock = CaptureRegistry & {
  tryCapture: ReturnType<typeof vi.fn<CaptureRegistry["tryCapture"]>>;
};

function createChromeMock(): ChromeMock {
  return {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(),
    },
  };
}

function createCaptureRegistryMock(): CaptureRegistryMock {
  return {
    tryCapture: vi.fn<CaptureRegistry["tryCapture"]>(),
  };
}

describe("getActiveCapture", () => {
  let chromeMock: ChromeMock;
  let registryMock: CaptureRegistryMock;

  beforeEach(() => {
    chromeMock = createChromeMock();
    registryMock = createCaptureRegistryMock();
    vi.stubGlobal("chrome", chromeMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unsupported for non-provider pages", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: "https://example.com/article" },
    ]);
    registryMock.tryCapture.mockResolvedValue(null);

    await expect(getActiveCapture(registryMock)).resolves.toEqual({
      state: "unsupported",
      activeUrl: "https://example.com/article",
    });

    expect(registryMock.tryCapture).toHaveBeenCalledWith({
      tabId: 1,
      url: "https://example.com/article",
    });
  });

  it("returns markdown when a capture succeeds", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    ]);
    registryMock.tryCapture.mockResolvedValue({
      markdown: "# Thread",
      sourceUrl:
        "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
    });

    await expect(getActiveCapture(registryMock)).resolves.toEqual({
      state: "success",
      result: {
        markdown: "# Thread",
        sourceUrl:
          "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    });

    expect(registryMock.tryCapture).toHaveBeenCalledWith(
      {
        tabId: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    );
  });

  it("returns an error when capture fails", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    ]);
    registryMock.tryCapture.mockRejectedValue(
      new Error("Reddit returned 403 Forbidden"),
    );

    await expect(getActiveCapture(registryMock)).resolves.toEqual({
      state: "error",
      error: "Reddit returned 403 Forbidden",
    });
  });

  it("routes supported x status pages through the provider boundary", async () => {
    const boundary = {
      captureThread: vi.fn().mockResolvedValue({
        markdown: "# Thread",
        sourceUrl: "https://x.com/example/status/1234567890",
      }),
    };

    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 11,
        url: "https://x.com/example/status/1234567890",
      },
    ]);

    await expect(
      getActiveCapture(createCaptureRegistry([createXCapture(boundary)])),
    ).resolves.toEqual({
      state: "success",
      result: {
        markdown: "# Thread",
        sourceUrl: "https://x.com/example/status/1234567890",
      },
    });

    expect(boundary.captureThread).toHaveBeenCalledWith({
      tabId: 11,
      url: "https://x.com/example/status/1234567890",
    });
  });

  it("returns an error for supported x status pages before capture is implemented", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 12,
        url: "https://twitter.com/example/status/1234567890",
      },
    ]);

    await expect(getActiveCapture()).resolves.toEqual({
      state: "error",
      error: "X capture is not implemented yet.",
    });
  });
});
