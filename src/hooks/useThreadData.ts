import { useEffect, useState } from "react";
import {
  formatRedditThreadAsMarkdown,
  isRedditThreadUrl,
  toRedditJsonUrl,
} from "@/lib/reddit";

/** Outcome of loading Reddit thread markdown for the active tab. */
export type ThreadStatus = "loading" | "unsupported" | "error" | "success";

export type ThreadData = {
  state: ThreadStatus;
  activeUrl: string | null;
  jsonUrl: string | null;
  error: string | null;
  markdown: string | null;
};

const initialData: ThreadData = {
  state: "loading",
  activeUrl: null,
  jsonUrl: null,
  error: null,
  markdown: null,
};

/**
 * Loads Reddit thread markdown for the current window’s active tab. Dev-only:
 * `?fixture=1` or `?devLoading=1` on the page URL.
 */
export function useThreadData(): ThreadData {
  const [data, setData] = useState<ThreadData>(initialData);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const useFixture = params.get("fixture") === "1";
    const devLoading = params.get("devLoading") === "1";

    async function loadThread() {
      try {
        if (import.meta.env.DEV && devLoading) {
          return;
        }

        if (import.meta.env.DEV && useFixture) {
          const { default: payload } = await import(
            "../../fixtures/reddit-thread.json"
          );
          const syntheticUrl =
            "https://www.reddit.com/r/example/comments/fixture123/dev-fixture/";
          const markdown = formatRedditThreadAsMarkdown(payload, syntheticUrl);
          setData({
            state: "success",
            activeUrl: syntheticUrl,
            jsonUrl: toRedditJsonUrl(syntheticUrl),
            error: null,
            markdown,
          });
          return;
        }

        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeUrl = tab?.url ?? null;

        if (!activeUrl || !isRedditThreadUrl(activeUrl)) {
          setData({
            state: "unsupported",
            activeUrl,
            jsonUrl: null,
            error: null,
            markdown: null,
          });
          return;
        }

        const jsonUrl = toRedditJsonUrl(activeUrl);
        const response = await fetch(jsonUrl, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(
            `Reddit returned ${response.status} ${response.statusText}`.trim(),
          );
        }

        const payload = await response.json();
        const markdown = formatRedditThreadAsMarkdown(payload, activeUrl);

        setData({
          state: "success",
          activeUrl,
          jsonUrl,
          error: null,
          markdown,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setData((current) => ({
          state: "error",
          activeUrl: current.activeUrl,
          jsonUrl:
            current.activeUrl && isRedditThreadUrl(current.activeUrl)
              ? toRedditJsonUrl(current.activeUrl)
              : current.jsonUrl,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load Reddit thread markdown.",
          markdown: null,
        }));
      }
    }

    void loadThread();

    return () => {
      controller.abort();
    };
  }, []);

  return data;
}
