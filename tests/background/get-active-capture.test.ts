import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveCapture } from "@/background/index";

import { readExpected, readFixturePayload } from "../providers/reddit/fixtures";

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

describe("getActiveCapture", () => {
  let chromeMock: ChromeMock;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    chromeMock = createChromeMock();
    fetchMock = vi.fn();
    vi.stubGlobal("chrome", chromeMock);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unsupported for non-provider pages", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: "https://example.com/article" },
    ]);

    await expect(getActiveCapture()).resolves.toEqual({
      state: "unsupported",
      activeUrl: "https://example.com/article",
    });
  });

  it("returns markdown for a supported reddit thread", async () => {
    const payload = readFixturePayload("thread-with-comments.json");

    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    ]);

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => payload,
    } as Response);

    await expect(getActiveCapture()).resolves.toEqual({
      state: "success",
      result: {
        markdown: readExpected("thread-with-comments.expected.md"),
        sourceUrl:
          "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.reddit.com/r/example/comments/xyz789/comments-thread.json",
    );
  });

  it("returns an error when reddit fetch fails", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 7,
        url: "https://www.reddit.com/r/example/comments/xyz789/comments-thread/",
      },
    ]);

    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    } as Response);

    await expect(getActiveCapture()).resolves.toEqual({
      state: "error",
      error: "Reddit returned 403 Forbidden",
    });
  });
});
