import { toRedditJsonUrl } from "@/providers/reddit/detect";

import type { ProviderContext } from "@/core/provider";

export async function extractRedditThread(
  context: ProviderContext,
): Promise<unknown> {
  const response = await fetch(toRedditJsonUrl(context.url));

  if (!response.ok) {
    throw new Error(
      `Reddit returned ${response.status} ${response.statusText}`.trim(),
    );
  }

  return response.json();
}
