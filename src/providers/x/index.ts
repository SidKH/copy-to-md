import { isXStatusUrl } from "@/providers/x/detect";
import { formatXThreadAsMarkdown } from "@/providers/x/markdown";
import { normalizeXThread } from "@/providers/x/normalize";
import { createXTabSource } from "@/providers/x/source";

import type { CaptureRequest, CaptureResult, SiteCapture } from "@/core/provider";
import type { XRootPostSource } from "@/providers/x/source";

export type XCaptureBoundary = {
  captureThread(request: CaptureRequest): Promise<CaptureResult>;
};

export function createXCapture(boundary: XCaptureBoundary): SiteCapture {
  return {
    id: "x",
    async tryCapture(request) {
      if (!isXStatusUrl(request.url)) {
        return null;
      }

      return boundary.captureThread(request);
    },
  };
}

export function createXCaptureBoundary(
  source: XRootPostSource,
): XCaptureBoundary {
  return {
    async captureThread(request) {
      const payload = await source.fetchRootPostPayload(request);
      const thread = normalizeXThread(payload, request.url);

      if (!thread) {
        throw new Error("Failed to parse the X root post.");
      }

      return {
        markdown: formatXThreadAsMarkdown(thread, request.url),
        sourceUrl: request.url,
      };
    },
  };
}

const xCaptureBoundary = createXCaptureBoundary(createXTabSource());

export const xCapture = createXCapture(xCaptureBoundary);
