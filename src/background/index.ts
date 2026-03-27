import { getProviderForUrl } from "@/core/registry";
import { GET_ACTIVE_CAPTURE } from "@/background/messages";

import type {
  ActiveCaptureResponse,
  GetActiveCaptureRequest,
} from "@/background/messages";

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

export async function getActiveCapture(): Promise<ActiveCaptureResponse> {
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

  const provider = getProviderForUrl(activeUrl);

  if (!provider) {
    return {
      state: "unsupported",
      activeUrl,
    };
  }

  try {
    const context = { tabId, url: activeUrl };
    const raw = await provider.extract(context);
    const markdown = provider.toMarkdown(raw, context);

    return {
      state: "success",
      result: {
        markdown,
        sourceUrl: activeUrl,
      },
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
