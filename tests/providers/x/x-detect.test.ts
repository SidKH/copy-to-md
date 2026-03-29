import { describe, expect, it } from "vitest";

import { isXStatusUrl } from "@/providers/x/detect";

describe("isXStatusUrl", () => {
  it("recognizes canonical x and twitter status URLs", () => {
    expect(isXStatusUrl("https://x.com/example/status/1234567890")).toBe(true);
    expect(
      isXStatusUrl(
        "https://twitter.com/example/status/1234567890?ref_src=twsrc%5Etfw",
      ),
    ).toBe(true);
  });

  it("rejects unsupported x surfaces", () => {
    expect(isXStatusUrl("https://x.com/home")).toBe(false);
    expect(isXStatusUrl("https://x.com/explore")).toBe(false);
    expect(isXStatusUrl("https://x.com/example")).toBe(false);
    expect(isXStatusUrl("https://x.com/search?q=test")).toBe(false);
    expect(isXStatusUrl("https://x.com/i/bookmarks")).toBe(false);
    expect(isXStatusUrl("https://x.com/i/lists/123")).toBe(false);
    expect(isXStatusUrl("https://x.com/example/status/1234567890/retweets")).toBe(
      false,
    );
  });
});
