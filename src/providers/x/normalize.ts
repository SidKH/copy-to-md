import type { XPost, XReply, XThread } from "@/providers/x/model";

export type XPayloadDebugSummary = {
  candidateTweetIds: string[];
  parsedTweetCount: number;
  rootFound: boolean;
  sourceUrl: string | undefined;
  statusId: string | null;
  topLevelErrorCount: number;
  tweetResultCount: number;
};

export function normalizeXThread(
  payload: unknown,
  sourceUrl?: string,
): XThread | null {
  const statusId = sourceUrl ? getStatusIdFromUrl(sourceUrl) : null;
  const tweets = collectTweetResults(payload);

  if (tweets.length === 0) {
    return null;
  }

  const nodes = tweets
    .map((tweet) => parseTweetNode(tweet, sourceUrl))
    .filter((node): node is ParsedTweetNode => Boolean(node));
  const rootNode = statusId
    ? nodes.find((node) => node.post.id === statusId) ?? null
    : nodes[0] ?? null;

  if (!rootNode) {
    return null;
  }

  const repliesByParentId = new Map<string, XReply[]>();

  for (const node of nodes) {
    if (!node.parentId || node.post.id === rootNode.post.id) {
      continue;
    }

    const reply: XReply = {
      post: node.post,
      replies: repliesByParentId.get(node.post.id) ?? [],
    };
    const siblingReplies = repliesByParentId.get(node.parentId) ?? [];

    siblingReplies.push(reply);
    repliesByParentId.set(node.parentId, siblingReplies);
  }

  return {
    rootPost: rootNode.post,
    replies: repliesByParentId.get(rootNode.post.id) ?? [],
  };
}

export function summarizeXPayloadForDebug(
  payload: unknown,
  sourceUrl?: string,
): XPayloadDebugSummary {
  const statusId = sourceUrl ? getStatusIdFromUrl(sourceUrl) : null;
  const tweets = collectTweetResults(payload);
  const nodes = tweets
    .map((tweet) => parseTweetNode(tweet, sourceUrl))
    .filter((node): node is ParsedTweetNode => Boolean(node));

  return {
    candidateTweetIds: nodes.slice(0, 20).map((node) => node.post.id),
    parsedTweetCount: nodes.length,
    rootFound: statusId ? nodes.some((node) => node.post.id === statusId) : nodes.length > 0,
    sourceUrl,
    statusId,
    topLevelErrorCount: getTopLevelErrorCount(payload),
    tweetResultCount: tweets.length,
  };
}

type ParsedTweetNode = {
  post: XPost;
  parentId: string | null;
};

function parseTweetNode(
  value: Record<string, unknown>,
  sourceUrl?: string,
): ParsedTweetNode | null {
  const id = getString(value.rest_id);
  const legacy = getRecord(value.legacy);

  if (!id || !legacy) {
    return null;
  }

  const authorHandle =
    getString(
      getRecord(
        getRecord(getRecord(getRecord(value.core)?.user_results)?.result)?.core,
      )?.screen_name,
    ) ??
    getString(
      getRecord(
        getRecord(getRecord(getRecord(value.core)?.user_results)?.result)?.legacy,
      )?.screen_name,
    ) ??
    getHandleFromUrl(sourceUrl);
  const postedAt = parseTimestamp(getString(legacy.created_at));

  if (!authorHandle || !postedAt) {
    return null;
  }

  return {
    post: {
      id,
      authorHandle,
      postedAt,
      text: getTweetText(value, legacy),
      retweetCount: getNumber(legacy.retweet_count),
      likeCount: getNumber(legacy.favorite_count),
      links: getTweetLinks(legacy),
    },
    parentId: getString(legacy.in_reply_to_status_id_str),
  };
}

function getTweetText(
  value: Record<string, unknown>,
  legacy: Record<string, unknown>,
): string {
  const noteTweetText = getString(
    getRecord(
      getRecord(getRecord(value.note_tweet)?.note_tweet_results)?.result,
    )?.text,
  );

  if (noteTweetText) {
    return noteTweetText;
  }

  return getString(legacy.full_text) ?? "";
}

function getTweetLinks(legacy: Record<string, unknown>): string[] {
  const entities = getRecord(legacy.entities);

  if (!entities) {
    return [];
  }

  const urls = getRecordArray(entities.urls)
    .map((entry) => getString(entry.expanded_url) ?? getString(entry.url))
    .filter((entry): entry is string => Boolean(entry));
  const media = getRecordArray(entities.media)
    .map((entry) => getString(entry.expanded_url) ?? getString(entry.media_url_https))
    .filter((entry): entry is string => Boolean(entry));

  return Array.from(new Set([...urls, ...media]));
}

function collectTweetResults(payload: unknown): Record<string, unknown>[] {
  const seen = new Set<unknown>();
  const tweets: Record<string, unknown>[] = [];

  function visit(value: unknown): void {
    if (!value || typeof value !== "object") {
      return;
    }

    if (seen.has(value)) {
      return;
    }

    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (!isRecord(value)) {
      return;
    }

    if (looksLikeTweetResult(value)) {
      tweets.push(value);
    }

    for (const nested of Object.values(value)) {
      visit(nested);
    }
  }

  visit(payload);
  return tweets;
}

function looksLikeTweetResult(value: Record<string, unknown>): boolean {
  return typeof value.rest_id === "string" && isRecord(value.legacy);
}

function parseTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getTopLevelErrorCount(payload: unknown): number {
  if (!isRecord(payload) || !Array.isArray(payload.errors)) {
    return 0;
  }

  return payload.errors.length;
}

function getStatusIdFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const parts = parsedUrl.pathname.split("/").filter(Boolean);

    if (parts.length < 3 || parts[1] !== "status") {
      return null;
    }

    return parts[2] ?? null;
  } catch {
    return null;
  }
}

function getHandleFromUrl(url?: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const parts = parsedUrl.pathname.split("/").filter(Boolean);
    return parts[0] ?? null;
  } catch {
    return null;
  }
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function getRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
