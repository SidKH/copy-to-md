import { redditProvider } from "@/providers/reddit";

import type { Provider } from "@/core/provider";

const providers: Provider[] = [redditProvider];

export function getProviderForUrl(url: string): Provider | null {
  return providers.find((provider) => provider.supports(url)) ?? null;
}
