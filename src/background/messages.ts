import type { CaptureResult } from "@/core/provider";

export const GET_ACTIVE_CAPTURE = "capture/get-active";

export type GetActiveCaptureRequest = {
  type: typeof GET_ACTIVE_CAPTURE;
};

export type ActiveCaptureResponse =
  | {
      state: "unsupported";
      activeUrl: string | null;
    }
  | {
      state: "error";
      error: string;
    }
  | {
      state: "success";
      result: CaptureResult;
    };
