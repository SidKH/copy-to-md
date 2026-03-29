import type { CaptureRequest } from "@/core/provider";

export type XRootPostPayload = {
  rootPost: {
    id: string;
    authorHandle: string;
    postedAt: string;
    text: string;
    retweetCount: number;
    likeCount: number;
    links: string[];
  };
};

type ExecuteScriptResult<T> = Array<{
  result?: T;
}>;

export type XScriptingApi = {
  executeScript(
    injection: chrome.scripting.ScriptInjection<
      [string],
      XRootPostPayload | null
    >,
  ): Promise<ExecuteScriptResult<XRootPostPayload | null>>;
};

export type XRootPostSource = {
  fetchRootPostPayload(request: CaptureRequest): Promise<XRootPostPayload>;
};

export function createXTabSource(
  scripting: XScriptingApi | undefined = getChromeScripting(),
): XRootPostSource {
  return {
    async fetchRootPostPayload(request) {
      if (!scripting) {
        throw new Error("X root-post extraction requires the Chrome scripting API.");
      }

      const [injectionResult] = await scripting.executeScript({
        args: [request.url],
        func: extractRootPostFromPage,
        target: {
          tabId: request.tabId,
        },
        world: "MAIN",
      });

      if (!injectionResult?.result) {
        throw new Error("Failed to extract the X root post from the page.");
      }

      return injectionResult.result;
    },
  };
}

function getChromeScripting(): XScriptingApi | undefined {
  if (typeof chrome === "undefined" || typeof chrome.scripting === "undefined") {
    return undefined;
  }

  return chrome.scripting;
}

function extractRootPostFromPage(sourceUrl: string): XRootPostPayload | null {
  function parseSafeUrl(value: string): URL | null {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  function getStatusIdFromUrl(url: URL): string | null {
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length < 3 || parts[1] !== "status" || !parts[2]) {
      return null;
    }

    return parts[2];
  }

  function findRootPostArticle(statusId: string): HTMLElement | null {
    const timeAnchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(`a[href*="/status/${statusId}"]`),
    );

    for (const anchor of timeAnchors) {
      const article = anchor.closest("article");

      if (article instanceof HTMLElement) {
        return article;
      }
    }

    return null;
  }

  function getAuthorHandle(article: HTMLElement, url: URL): string | null {
    const explicitHandle = article
      .querySelector<HTMLAnchorElement>('a[role="link"][href^="/"]')
      ?.getAttribute("href")
      ?.split("/")
      .filter(Boolean)[0];

    if (explicitHandle) {
      return explicitHandle;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] ?? null;
  }

  function getPostedAt(article: HTMLElement): string | null {
    const dateTime = article.querySelector("time")?.getAttribute("datetime");
    return dateTime && !Number.isNaN(Date.parse(dateTime)) ? dateTime : null;
  }

  function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  function getText(article: HTMLElement): string {
    const text = article.querySelector<HTMLElement>('[data-testid="tweetText"]');
    return normalizeWhitespace(text?.innerText ?? text?.textContent ?? "");
  }

  function parseMetric(value: string): number | null {
    const match = value.match(/([\d.,]+)\s*([KM])?/i);

    if (!match) {
      return null;
    }

    const numericPart = Number.parseFloat(match[1].replace(/,/g, ""));

    if (!Number.isFinite(numericPart)) {
      return null;
    }

    const suffix = match[2]?.toUpperCase();

    if (suffix === "K") {
      return Math.round(numericPart * 1_000);
    }

    if (suffix === "M") {
      return Math.round(numericPart * 1_000_000);
    }

    return Math.round(numericPart);
  }

  function getMetric(article: HTMLElement, testIds: string[]): number {
    for (const testId of testIds) {
      const metricNode = article.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

      if (!metricNode) {
        continue;
      }

      const labelledValue =
        metricNode.getAttribute("aria-label") ??
        metricNode.closest<HTMLElement>("[aria-label]")?.getAttribute("aria-label") ??
        "";
      const parsedLabel = parseMetric(labelledValue);

      if (parsedLabel != null) {
        return parsedLabel;
      }

      const parsedText = parseMetric(metricNode.innerText || metricNode.textContent || "");

      if (parsedText != null) {
        return parsedText;
      }
    }

    return 0;
  }

  function getLinks(article: HTMLElement, statusId: string): string[] {
    const links = Array.from(article.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((anchor) => anchor.href)
      .filter((href) => {
        if (!href) {
          return false;
        }

        if (href.includes(`/status/${statusId}`)) {
          return false;
        }

        return /^https?:\/\//.test(href);
      });

    return Array.from(new Set(links));
  }

  const parsedUrl = parseSafeUrl(sourceUrl);

  if (!parsedUrl) {
    return null;
  }

  const statusId = getStatusIdFromUrl(parsedUrl);

  if (!statusId) {
    return null;
  }

  const article = findRootPostArticle(statusId);

  if (!article) {
    return null;
  }

  const authorHandle = getAuthorHandle(article, parsedUrl);
  const postedAt = getPostedAt(article);

  if (!authorHandle || !postedAt) {
    return null;
  }

  return {
    rootPost: {
      id: statusId,
      authorHandle,
      postedAt,
      text: getText(article),
      retweetCount: getMetric(article, ["repost", "retweet", "unrepost", "unretweet"]),
      likeCount: getMetric(article, ["like", "unlike"]),
      links: getLinks(article, statusId),
    },
  };
}
