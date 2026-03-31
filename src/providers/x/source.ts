import type { CaptureRequest } from "@/core/provider";
import { createDevLogger } from "@/lib/debug";

type XConversationReplayScriptResult =
  | {
      ok: true;
      payload: unknown;
    }
  | {
      ok: false;
      error: string;
    };

type ExecuteScriptResult<T> = Array<{
  result?: T;
}>;

export type XScriptingApi = {
  executeScript(
    injection: chrome.scripting.ScriptInjection<
      [],
      XConversationReplayScriptResult
    >,
  ): Promise<ExecuteScriptResult<XConversationReplayScriptResult>>;
};

export type XConversationSource = {
  fetchConversationPayload(request: CaptureRequest): Promise<unknown>;
};

const logger = createDevLogger("x:source");

export function createXTabSource(
  scripting: XScriptingApi | undefined = getChromeScripting(),
): XConversationSource {
  return {
    async fetchConversationPayload(request) {
      if (!scripting) {
        throw new Error("X conversation replay requires the Chrome scripting API.");
      }

      logger.debug("replaying x conversation payload", {
        tabId: request.tabId,
        url: request.url,
      });

      const [injectionResult] = await scripting.executeScript({
        func:
          replayCapturedConversationFromPage as unknown as () => XConversationReplayScriptResult,
        target: {
          tabId: request.tabId,
        },
        world: "MAIN",
      });
      const result = injectionResult?.result;

      if (!result) {
        logger.warn("x conversation replay returned no result", {
          tabId: request.tabId,
          url: request.url,
        });
        throw new Error("Failed to replay the X conversation request.");
      }

      if (!result.ok) {
        logger.warn("x conversation replay returned an error", {
          error: result.error,
          tabId: request.tabId,
          url: request.url,
        });
        throw new Error(result.error);
      }

      logger.debug("x conversation replay succeeded", {
        tabId: request.tabId,
        url: request.url,
      });

      return result.payload;
    },
  };
}

function getChromeScripting(): XScriptingApi | undefined {
  if (typeof chrome === "undefined" || typeof chrome.scripting === "undefined") {
    return undefined;
  }

  return chrome.scripting;
}

async function replayCapturedConversationFromPage(): Promise<XConversationReplayScriptResult> {
  const bridgeKey = "__COPY_TO_MD_X_CONVERSATION_BRIDGE__";
  const bridgeOwner = globalThis as Record<string, unknown>;
  const bridge = bridgeOwner[bridgeKey];

  if (
    !bridge ||
    typeof bridge !== "object" ||
    typeof (bridge as { replayLatest?: unknown }).replayLatest !== "function"
  ) {
    return {
      ok: false,
      error: "X conversation replay bridge is unavailable on this page.",
    };
  }

  try {
    const payload = await (
      bridge as {
        replayLatest(): Promise<unknown>;
      }
    ).replayLatest();

    return {
      ok: true,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to replay the X conversation request.",
    };
  }
}
