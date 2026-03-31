import { redditCapture } from "@/providers/reddit";
import { xCapture } from "@/providers/x";
import { createDevLogger } from "@/lib/debug";

import type { CaptureRequest, CaptureResult, SiteCapture } from "@/core/provider";

export type CaptureRegistry = {
  tryCapture(request: CaptureRequest): Promise<CaptureResult | null>;
};

const logger = createDevLogger("registry");

export function createCaptureRegistry(
  captures: SiteCapture[],
): CaptureRegistry {
  return {
    async tryCapture(request) {
      for (const capture of captures) {
        logger.debug("trying provider", {
          providerId: capture.id,
          url: request.url,
        });

        try {
          const result = await capture.tryCapture(request);

          if (result) {
            logger.debug("provider captured page", {
              providerId: capture.id,
              sourceUrl: result.sourceUrl,
            });
            return result;
          }

          logger.debug("provider skipped page", {
            providerId: capture.id,
            url: request.url,
          });
        } catch (error) {
          logger.error("provider failed", {
            providerId: capture.id,
            url: request.url,
            error: error instanceof Error ? error.message : error,
          });
          throw error;
        }
      }

      return null;
    },
  };
}

export const captureRegistry = createCaptureRegistry([redditCapture, xCapture]);
