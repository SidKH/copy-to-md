import { afterEach, describe, expect, it, vi } from "vitest";

import { createDevLogger } from "@/lib/debug";

describe("createDevLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs scoped messages when enabled", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const logger = createDevLogger("x", { enabled: true });

    logger.debug("normalize result", { found: 3 });

    expect(debugSpy).toHaveBeenCalledWith(
      "[copy-to-md:x] normalize result",
      { found: 3 },
    );
  });

  it("does not log when disabled", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const logger = createDevLogger("x", { enabled: false });

    logger.debug("normalize result", { found: 3 });

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("posts serialized log entries to the local sink in dev mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const logger = createDevLogger("x", {
      enabled: true,
      fetchImpl: fetchMock,
      sinkEndpoint: "http://127.0.0.1:47321/log",
    });

    logger.debug("normalize result", {
      error: new Error("boom"),
      found: 3,
    });
    await Promise.resolve();

    expect(debugSpy).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:47321/log",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));

    expect(body.scope).toBe("x");
    expect(body.message).toBe("normalize result");
    expect(body.details).toEqual({
      error: {
        message: "boom",
        name: "Error",
        stack: expect.any(String),
      },
      found: 3,
    });
  });
});
