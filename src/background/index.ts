import { GET_ACTIVE_CAPTURE } from "@/background/messages";
import { captureRegistry } from "@/core/registry";

import type {
  ActiveCaptureResponse,
  GetActiveCaptureRequest,
} from "@/background/messages";
import type { CaptureRegistry } from "@/core/registry";

function isGetActiveCaptureRequest(
  message: unknown,
): message is GetActiveCaptureRequest {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === GET_ACTIVE_CAPTURE
  );
}

export async function getActiveCapture(
  registry: CaptureRegistry = captureRegistry,
): Promise<ActiveCaptureResponse> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const activeUrl = tab?.url ?? null;
  const tabId = tab?.id;

  if (!activeUrl || tabId == null) {
    return {
      state: "unsupported",
      activeUrl,
    };
  }

  try {
    const result = await registry.tryCapture({ tabId, url: activeUrl });

    if (!result) {
      return {
        state: "unsupported",
        activeUrl,
      };
    }

    return {
      state: "success",
      result,
    };
  } catch (error) {
    return {
      state: "error",
      error:
        error instanceof Error ? error.message : "Failed to load markdown.",
    };
  }
}

export function registerBackgroundHandlers(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isGetActiveCaptureRequest(message)) {
      return undefined;
    }

    void getActiveCapture().then(sendResponse);
    return true;
  });
}

if (
  typeof chrome !== "undefined" &&
  typeof chrome.runtime !== "undefined" &&
  typeof chrome.runtime.onMessage !== "undefined"
) {
  registerBackgroundHandlers();
}
