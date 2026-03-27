export type CaptureResult = {
  markdown: string;
  sourceUrl: string;
};

export type ProviderContext = {
  tabId: number;
  url: string;
};

export type Provider<Raw = unknown> = {
  id: string;
  supports(url: string): boolean;
  extract(ctx: ProviderContext): Promise<Raw>;
  toMarkdown(raw: Raw, ctx: ProviderContext): string;
};
