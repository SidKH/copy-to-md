import { useEffect, useState } from "react";
import {
  GET_ACTIVE_CAPTURE,
  type ActiveCaptureResponse,
} from "@/background/messages";
import { formatRedditThreadAsMarkdown } from "@/providers/reddit/markdown";

import type { CaptureResult } from "@/core/provider";

export type CaptureState =
  | { state: "loading" }
  | { state: "unsupported"; activeUrl: string | null }
  | { state: "error"; error: string }
  | { state: "success"; result: CaptureResult };

export function useActiveCapture(): CaptureState {
  const [state, setState] = useState<CaptureState>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const useFixture = params.get("fixture") === "1";
    const devLoading = params.get("devLoading") === "1";

    async function loadCapture() {
      try {
        if (import.meta.env.DEV && devLoading) {
          return;
        }

        if (import.meta.env.DEV && useFixture) {
          const { default: payload } = await import("../../fixtures/reddit-thread.json");
          const sourceUrl =
            "https://www.reddit.com/r/example/comments/fixture123/dev-fixture/";

          if (cancelled) {
            return;
          }

          setState({
            state: "success",
            result: {
              markdown: formatRedditThreadAsMarkdown(payload, sourceUrl),
              sourceUrl,
            },
          });
          return;
        }

        const response = (await chrome.runtime.sendMessage({
          type: GET_ACTIVE_CAPTURE,
        })) as ActiveCaptureResponse;

        if (cancelled) {
          return;
        }

        setState(response);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          state: "error",
          error:
            error instanceof Error ? error.message : "Failed to load markdown.",
        });
      }
    }

    void loadCapture();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
