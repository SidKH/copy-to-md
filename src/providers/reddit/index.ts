import { extractRedditThread } from "@/providers/reddit/extract";
import { isRedditThreadUrl } from "@/providers/reddit/detect";
import { formatRedditThreadAsMarkdown } from "@/providers/reddit/markdown";

import type { Provider } from "@/core/provider";

export const redditProvider: Provider = {
  id: "reddit",
  supports: isRedditThreadUrl,
  extract: extractRedditThread,
  toMarkdown: (raw, context) => formatRedditThreadAsMarkdown(raw, context.url),
};
