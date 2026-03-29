import type { XPost, XThread } from "@/providers/x/model";

export function normalizeXThread(
  payload: unknown,
  sourceUrl?: string,
): XThread | null {
  const extracted = parseExtractedRootPost(payload);

  if (extracted) {
    return {
      rootPost: extracted,
      replies: [],
    };
  }

  const statusId = sourceUrl ? getStatusIdFromUrl(sourceUrl) : null;
  const tweet = findTweetResult(payload, statusId);

  if (!tweet) {
    return null;
  }

  const rootPost = parseTweetResult(tweet, sourceUrl);

  if (!rootPost) {
    return null;
  }

  return {
    rootPost,
    replies: [],
  };
}

function parseExtractedRootPost(payload: unknown): XPost | null {
  if (!isRecord(payload) || !isRecord(payload.rootPost)) {
    return null;
  }

  return parsePostRecord(payload.rootPost);
}

function parseTweetResult(value: Record<string, unknown>, sourceUrl?: string): XPost | null {
  const id = getString(value.rest_id);
  const legacy = getRecord(value.legacy);

  if (!id || !legacy) {
    return null;
  }

  const authorHandle =
    getString(
      getRecord(
        getRecord(getRecord(getRecord(value.core)?.user_results)?.result)?.legacy,
      )?.screen_name,
    ) ?? getHandleFromUrl(sourceUrl);
  const postedAt = parseTimestamp(getString(legacy.created_at));

  if (!authorHandle || !postedAt) {
    return null;
  }

  return {
    id,
    authorHandle,
    postedAt,
    text: getTweetText(value, legacy),
    retweetCount: getNumber(legacy.retweet_count),
    likeCount: getNumber(legacy.favorite_count),
    links: getTweetLinks(legacy),
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

function findTweetResult(
  payload: unknown,
  statusId: string | null,
): Record<string, unknown> | null {
  const seen = new Set<unknown>();

  function visit(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    if (seen.has(value)) {
      return null;
    }

    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        const match = visit(item);

        if (match) {
          return match;
        }
      }

      return null;
    }

    if (!isRecord(value)) {
      return null;
    }

    if (looksLikeTweetResult(value)) {
      const restId = getString(value.rest_id);

      if (!statusId || restId === statusId) {
        return value;
      }
    }

    for (const nested of Object.values(value)) {
      const match = visit(nested);

      if (match) {
        return match;
      }
    }

    return null;
  }

  return visit(payload);
}

function looksLikeTweetResult(value: Record<string, unknown>): boolean {
  return typeof value.rest_id === "string" && isRecord(value.legacy);
}

function parsePostRecord(value: Record<string, unknown>): XPost | null {
  const id = getString(value.id);
  const authorHandle = getString(value.authorHandle);
  const postedAt = parseTimestamp(getString(value.postedAt));

  if (!id || !authorHandle || !postedAt) {
    return null;
  }

  return {
    id,
    authorHandle,
    postedAt,
    text: getString(value.text) ?? "",
    retweetCount: getNumber(value.retweetCount),
    likeCount: getNumber(value.likeCount),
    links: getStringArray(value.links),
  };
}

function parseTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((entry) => getString(entry))
        .filter((entry): entry is string => Boolean(entry))
    : [];
}

function getNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
