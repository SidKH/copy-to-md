import { toRedditJsonUrl } from "@/providers/reddit/detect";

export type RedditTransport = {
  fetchThreadPayload(threadUrl: string): Promise<unknown>;
};

export function createFetchRedditTransport(
  fetchImpl: typeof fetch = fetch,
): RedditTransport {
  return {
    async fetchThreadPayload(threadUrl: string): Promise<unknown> {
      const response = await fetchImpl(toRedditJsonUrl(threadUrl));

      if (!response.ok) {
        throw new Error(
          `Reddit returned ${response.status} ${response.statusText}`.trim(),
        );
      }

      return response.json();
    },
  };
}
