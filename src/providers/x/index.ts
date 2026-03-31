import { isXStatusUrl } from "@/providers/x/detect";
import { formatXThreadAsMarkdown } from "@/providers/x/markdown";
import { normalizeXThread, summarizeXPayloadForDebug } from "@/providers/x/normalize";
import { createXTabSource } from "@/providers/x/source";
import { createDevLogger } from "@/lib/debug";

import type { CaptureRequest, CaptureResult, SiteCapture } from "@/core/provider";
import type { XConversationSource } from "@/providers/x/source";

const logger = createDevLogger("x");

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
  source: XConversationSource,
): XCaptureBoundary {
  return {
    async captureThread(request) {
      logger.debug("capturing x thread", { url: request.url });
      const payload = await source.fetchConversationPayload(request);
      const payloadSummary = summarizeXPayloadForDebug(payload, request.url);

      logger.debug("x payload replayed", payloadSummary);
      const thread = normalizeXThread(payload, request.url);

      if (!thread) {
        logger.warn("failed to normalize x payload", payloadSummary);
        throw new Error("Failed to parse the X conversation payload.");
      }

      const markdown = formatXThreadAsMarkdown(thread, request.url);

      logger.debug("x thread captured", {
        markdownLength: markdown.length,
        replyCount: thread.replies.length,
        rootPostId: thread.rootPost.id,
      });

      return {
        markdown,
        sourceUrl: request.url,
      };
    },
  };
}

const xCaptureBoundary = createXCaptureBoundary(createXTabSource());

export const xCapture = createXCapture(xCaptureBoundary);
