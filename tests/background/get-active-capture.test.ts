import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveCapture } from "@/background/index";
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
  tryCapture: ReturnType<typeof vi.fn>;
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
    tryCapture: vi.fn(),
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
});
