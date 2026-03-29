export type CaptureResult = {
  markdown: string;
  sourceUrl: string;
};

export type CaptureRequest = {
  tabId: number;
  url: string;
};

export type SiteCapture = {
  id: string;
  tryCapture(request: CaptureRequest): Promise<CaptureResult | null>;
};
