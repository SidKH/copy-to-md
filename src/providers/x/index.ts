import { isXStatusUrl } from "@/providers/x/detect";

import type { CaptureRequest, CaptureResult, SiteCapture } from "@/core/provider";

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

const xCaptureBoundary: XCaptureBoundary = {
  async captureThread() {
    throw new Error("X capture is not implemented yet.");
  },
};

export const xCapture = createXCapture(xCaptureBoundary);
