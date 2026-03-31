import { toRedditJsonUrl } from "@/providers/reddit/detect";
import { createDevLogger } from "@/lib/debug";

export type RedditTransport = {
  fetchThreadPayload(threadUrl: string): Promise<unknown>;
};

const logger = createDevLogger("reddit:transport");

export function createFetchRedditTransport(
  fetchImpl: typeof fetch = fetch,
): RedditTransport {
  return {
    async fetchThreadPayload(threadUrl: string): Promise<unknown> {
      const jsonUrl = toRedditJsonUrl(threadUrl);

      logger.debug("fetching reddit json", { jsonUrl, threadUrl });
      const response = await fetchImpl(jsonUrl);

      if (!response.ok) {
        logger.warn("reddit fetch failed", {
          status: response.status,
          statusText: response.statusText,
          threadUrl,
        });
        throw new Error(
          `Reddit returned ${response.status} ${response.statusText}`.trim(),
        );
      }

      logger.debug("reddit fetch succeeded", {
        status: response.status,
        threadUrl,
      });

      return response.json();
    },
  };
}
