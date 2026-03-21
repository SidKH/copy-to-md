export function isRedditThreadUrl(url: string): boolean {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, "");
  if (hostname !== "reddit.com") {
    return false;
  }

  const parts = parsedUrl.pathname.split("/").filter(Boolean);
  return (
    parts.length >= 4 &&
    parts[0] === "r" &&
    parts[2] === "comments" &&
    parts[3].length > 0
  );
}

export function toRedditJsonUrl(url: string): string {
  const parsedUrl = new URL(url);
  const normalizedPath = parsedUrl.pathname.replace(/\/+$/, "");
  const jsonPath = normalizedPath.endsWith(".json")
    ? normalizedPath
    : `${normalizedPath}.json`;

  parsedUrl.hostname = "www.reddit.com";
  parsedUrl.pathname = jsonPath;
  parsedUrl.search = "";
  parsedUrl.hash = "";

  return parsedUrl.toString();
}

type RedditPost = {
  title: string;
  body: string;
  imageUrl: string | null;
  author: string;
  score: number;
  postedAt: string;
  threadUrl: string;
};

type RedditComment = {
  author: string;
  body: string;
  score: number;
  replies: RedditComment[];
};

const DELETED_COMMENT_PLACEHOLDER = "[deleted comment]";

export function formatRedditThreadAsMarkdown(
  payload: unknown,
  threadUrl?: string,
): string {
  const parsedThread = parseRedditThread(payload, threadUrl);

  if (!parsedThread) {
    return "Failed to parse Reddit thread.";
  }

  const lines = [
    `# ${parsedThread.post.title}`,
    "",
    parsedThread.post.threadUrl,
    "",
    parsedThread.post.postedAt,
  ];

  if (parsedThread.post.imageUrl) {
    lines.push("", `![preview image](${parsedThread.post.imageUrl})`);
  }

  if (parsedThread.post.body) {
    lines.push("", parsedThread.post.body);
  }

  lines.push("", formatKarma(parsedThread.post.score), "", "## Comments", "");

  if (parsedThread.comments.length === 0) {
    lines.push("- None");
  } else {
    lines.push(
      ...parsedThread.comments.flatMap((comment) => formatComment(comment, 0)),
    );
  }

  return lines.join("\n");
}

function parseRedditThread(
  payload: unknown,
  threadUrl?: string,
): { post: RedditPost; comments: RedditComment[] } | null {
  if (!Array.isArray(payload) || payload.length < 2) {
    return null;
  }

  const postChildren = getListingChildren(payload[0]);
  const commentChildren = getListingChildren(payload[1]);

  if (!postChildren || !commentChildren) {
    return null;
  }

  const postThing = postChildren.find((child) => getKind(child) === "t3");
  const postData = getDataObject(postThing);

  if (!postData) {
    return null;
  }

  const post = parsePost(postData, threadUrl);
  const comments = commentChildren.flatMap((child) => parseComment(child));

  return { post, comments };
}

function parsePost(data: Record<string, unknown>, threadUrl?: string): RedditPost {
  const imageUrl = getSubmissionImageUrl(data);

  return {
    title: getString(data.title, "Untitled Reddit Post"),
    body: cleanBody(getString(data.selftext)),
    imageUrl,
    author: getAuthor(data.author),
    score: getNumber(data.score),
    postedAt: formatUtcDate(data.created_utc),
    threadUrl: getThreadUrl(data, threadUrl),
  };
}

function getSubmissionImageUrl(data: Record<string, unknown>): string | null {
  if (data.is_self === true) {
    return null;
  }

  if (getString(data.post_hint) !== "image") {
    return null;
  }

  const direct = getString(data.url) || getString(data.url_overridden_by_dest);
  return direct || null;
}

function parseComment(thing: unknown): RedditComment[] {
  if (getKind(thing) !== "t1") {
    return [];
  }

  const data = getDataObject(thing);
  if (!data) {
    return [];
  }

  const body = cleanBody(getString(data.body));
  const nestedReplies = getReplyChildren(data.replies).flatMap((child) =>
    parseComment(child),
  );

  if (isDeletedCommentBody(body)) {
    if (nestedReplies.length === 0) {
      return [];
    }

    return [
      {
        author: getAuthor(data.author),
        body: DELETED_COMMENT_PLACEHOLDER,
        score: getNumber(data.score),
        replies: nestedReplies,
      },
    ];
  }

  return [
    {
      author: getAuthor(data.author),
      body,
      score: getNumber(data.score),
      replies: nestedReplies,
    },
  ];
}

function isDeletedCommentBody(body: string): boolean {
  return body === "[deleted]";
}

function formatComment(comment: RedditComment, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const body = comment.body ? comment.body.replace(/\s*\n+\s*/g, " ") : "";
  const parts: string[] = [];

  if (body) {
    parts.push(body);
  }

  parts.push(formatKarma(comment.score));

  const lines = [`${indent}- ${parts.join(" ")}`];

  for (const reply of comment.replies) {
    lines.push(...formatComment(reply, depth + 1));
  }

  return lines;
}

function getListingChildren(value: unknown): unknown[] | null {
  const data = getDataObject(value);
  const children = data?.children;

  return Array.isArray(children) ? children : null;
}

function getReplyChildren(value: unknown): unknown[] {
  if (typeof value === "string") {
    return [];
  }

  return getListingChildren(value) ?? [];
}

function getKind(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.kind === "string" ? value.kind : null;
}

function getDataObject(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !isRecord(value.data)) {
    return null;
  }

  return value.data;
}

function getThreadUrl(data: Record<string, unknown>, threadUrl?: string): string {
  if (threadUrl) {
    return threadUrl;
  }

  const url = getString(data.url);
  if (url) {
    return url;
  }

  const permalink = getString(data.permalink);
  if (permalink) {
    return `https://www.reddit.com${permalink}`;
  }

  return "https://www.reddit.com";
}

function getAuthor(value: unknown): string {
  const author = getString(value);
  return author || "[deleted]";
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function getNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function cleanBody(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function formatUtcDate(value: unknown): string {
  const seconds = getNumber(value);

  if (seconds <= 0) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(seconds * 1000));
}

function formatKarma(score: number): string {
  return `↑ ${score} ↓`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
