import { isRedditThreadUrl } from "@/providers/reddit/detect";
import { formatRedditThreadAsMarkdown } from "@/providers/reddit/markdown";
import { createFetchRedditTransport } from "@/providers/reddit/transport";
import { createDevLogger } from "@/lib/debug";

import type { SiteCapture } from "@/core/provider";
import type { RedditTransport } from "@/providers/reddit/transport";

const logger = createDevLogger("reddit");

export function createRedditCapture(transport: RedditTransport): SiteCapture {
  return {
    id: "reddit",
    async tryCapture(request) {
      if (!isRedditThreadUrl(request.url)) {
        return null;
      }

      logger.debug("capturing reddit thread", { url: request.url });

      const payload = await transport.fetchThreadPayload(request.url);
      const markdown = formatRedditThreadAsMarkdown(payload, request.url);

      logger.debug("reddit thread captured", {
        markdownLength: markdown.length,
        url: request.url,
      });

      return {
        markdown,
        sourceUrl: request.url,
      };
    },
  };
}

export const redditCapture = createRedditCapture(createFetchRedditTransport());
