import { GET_ACTIVE_CAPTURE } from "@/background/messages";
import { captureRegistry } from "@/core/registry";
import { createDevLogger } from "@/lib/debug";

import type {
  ActiveCaptureResponse,
  GetActiveCaptureRequest,
} from "@/background/messages";
import type { CaptureRegistry } from "@/core/registry";

const logger = createDevLogger("background");

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

  logger.debug("active capture requested", { activeUrl, tabId });

  if (!activeUrl || tabId == null) {
    logger.debug("active capture unsupported: no active tab url", {
      activeUrl,
      tabId,
    });
    return {
      state: "unsupported",
      activeUrl,
    };
  }

  try {
    const result = await registry.tryCapture({ tabId, url: activeUrl });

    if (!result) {
      logger.debug("active capture unsupported: no provider matched", {
        activeUrl,
      });
      return {
        state: "unsupported",
        activeUrl,
      };
    }

    logger.debug("active capture succeeded", {
      markdownLength: result.markdown.length,
      sourceUrl: result.sourceUrl,
    });

    return {
      state: "success",
      result,
    };
  } catch (error) {
    logger.error("active capture failed", {
      activeUrl,
      error: error instanceof Error ? error.message : error,
    });
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
