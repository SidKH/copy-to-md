import { describe, expect, it, vi } from "vitest";

import { createXTabSource } from "@/providers/x/source";

describe("x tab source", () => {
  it("replays the captured conversation request in the active tab", async () => {
    const executeScript = vi.fn().mockResolvedValue([
      {
        result: {
          ok: true,
          payload: {
            data: {
              threaded_conversation_with_injections_v2: {
                instructions: [],
              },
            },
          },
        },
      },
    ]);

    const source = createXTabSource({ executeScript });

    await expect(
      source.fetchConversationPayload({
        tabId: 7,
        url: "https://x.com/example/status/1234567890",
      }),
    ).resolves.toEqual({
      data: {
        threaded_conversation_with_injections_v2: {
          instructions: [],
        },
      },
    });

    expect(executeScript).toHaveBeenCalledWith({
      func: expect.any(Function),
      target: {
        tabId: 7,
      },
      world: "MAIN",
    });
  });

  it("fails clearly when no captured template is available for the page", async () => {
    const executeScript = vi.fn().mockResolvedValue([
      {
        result: {
          ok: false,
          error: "No captured X conversation request is available for this page.",
        },
      },
    ]);

    const source = createXTabSource({ executeScript });

    await expect(
      source.fetchConversationPayload({
        tabId: 7,
        url: "https://x.com/example/status/1234567890",
      }),
    ).rejects.toThrow(
      "No captured X conversation request is available for this page.",
    );
  });

  it("passes a self-contained replay function to chrome scripting", async () => {
    const executeScript = vi.fn().mockResolvedValue([
      {
        result: {
          ok: true,
          payload: null,
        },
      },
    ]);

    const source = createXTabSource({ executeScript });

    await source.fetchConversationPayload({
      tabId: 7,
      url: "https://x.com/example/status/1234567890",
    });

    const injection = executeScript.mock.calls[0]?.[0];
    const isolatedFunc = new Function(
      `return (${String(injection.func)});`,
    )() as () => Promise<unknown>;

    await expect(isolatedFunc()).resolves.toEqual({
      ok: false,
      error: "X conversation replay bridge is unavailable on this page.",
    });
  });
});
