import { describe, expect, it, vi } from "vitest";

import { createXTabSource } from "@/providers/x/source";

describe("x tab source", () => {
  it("extracts the root post payload from the active tab", async () => {
    const executeScript = vi.fn().mockResolvedValue([
      {
        result: {
          rootPost: {
            id: "1234567890",
            authorHandle: "example",
            postedAt: "2025-01-01T23:30:00.000Z",
            text: "Hello from X",
            retweetCount: 12,
            likeCount: 34,
            links: ["https://example.com/article"],
          },
        },
      },
    ]);

    const source = createXTabSource({ executeScript });

    await expect(
      source.fetchRootPostPayload({
        tabId: 7,
        url: "https://x.com/example/status/1234567890",
      }),
    ).resolves.toEqual({
      rootPost: {
        id: "1234567890",
        authorHandle: "example",
        postedAt: "2025-01-01T23:30:00.000Z",
        text: "Hello from X",
        retweetCount: 12,
        likeCount: 34,
        links: ["https://example.com/article"],
      },
    });

    expect(executeScript).toHaveBeenCalledWith({
      args: ["https://x.com/example/status/1234567890"],
      func: expect.any(Function),
      target: {
        tabId: 7,
      },
      world: "MAIN",
    });
  });

  it("fails clearly when the page bridge cannot find the root post", async () => {
    const executeScript = vi.fn().mockResolvedValue([{ result: null }]);

    const source = createXTabSource({ executeScript });

    await expect(
      source.fetchRootPostPayload({
        tabId: 7,
        url: "https://x.com/example/status/1234567890",
      }),
    ).rejects.toThrow("Failed to extract the X root post from the page.");
  });

  it("passes a self-contained extraction function to chrome scripting", async () => {
    const executeScript = vi.fn().mockResolvedValue([
      {
        result: {
          rootPost: {
            id: "1234567890",
            authorHandle: "example",
            postedAt: "2025-01-01T23:30:00.000Z",
            text: "Hello from X",
            retweetCount: 12,
            likeCount: 34,
            links: [],
          },
        },
      },
    ]);

    const source = createXTabSource({ executeScript });

    await source.fetchRootPostPayload({
      tabId: 7,
      url: "https://x.com/example/status/1234567890",
    });

    const injection = executeScript.mock.calls[0]?.[0];
    const isolatedFunc = new Function(
      `return (${String(injection.func)});`,
    )() as (sourceUrl: string) => unknown;

    expect(() => isolatedFunc("not a valid url")).not.toThrow();
    expect(isolatedFunc("not a valid url")).toBeNull();
  });
});
