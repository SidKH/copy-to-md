import { redditCapture } from "@/providers/reddit";
import { xCapture } from "@/providers/x";

import type { CaptureRequest, CaptureResult, SiteCapture } from "@/core/provider";

export type CaptureRegistry = {
  tryCapture(request: CaptureRequest): Promise<CaptureResult | null>;
};

export function createCaptureRegistry(
  captures: SiteCapture[],
): CaptureRegistry {
  return {
    async tryCapture(request) {
      for (const capture of captures) {
        const result = await capture.tryCapture(request);

        if (result) {
          return result;
        }
      }

      return null;
    },
  };
}

export const captureRegistry = createCaptureRegistry([redditCapture, xCapture]);
