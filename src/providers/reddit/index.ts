import { isRedditThreadUrl } from "@/providers/reddit/detect";
import { formatRedditThreadAsMarkdown } from "@/providers/reddit/markdown";
import { createFetchRedditTransport } from "@/providers/reddit/transport";

import type { SiteCapture } from "@/core/provider";
import type { RedditTransport } from "@/providers/reddit/transport";

export function createRedditCapture(transport: RedditTransport): SiteCapture {
  return {
    id: "reddit",
    async tryCapture(request) {
      if (!isRedditThreadUrl(request.url)) {
        return null;
      }

      const payload = await transport.fetchThreadPayload(request.url);

      return {
        markdown: formatRedditThreadAsMarkdown(payload, request.url),
        sourceUrl: request.url,
      };
    },
  };
}

export const redditCapture = createRedditCapture(createFetchRedditTransport());
