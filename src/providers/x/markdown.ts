import type { XPost, XThread } from "@/providers/x/model";

export function formatXThreadAsMarkdown(
  thread: XThread,
  sourceUrl: string,
): string {
  const rootPostDate = formatUtcDate(thread.rootPost.postedAt);

  return [
    "# Thread",
    "",
    sourceUrl,
    "",
    rootPostDate,
    "",
    formatPost(thread.rootPost, 0),
  ].join("\n");
}

function formatPost(post: XPost, depth: number): string {
  const indent = "  ".repeat(depth);
  const parts = [
    `@${post.authorHandle}`,
    formatUtcDate(post.postedAt),
    compactText(post.text),
    `Reposts ${post.retweetCount}`,
    `Likes ${post.likeCount}`,
  ];

  if (post.links.length > 0) {
    parts.push(`Links ${post.links.join(", ")}`);
  }

  return `${indent}- ${parts.join(" | ")}`;
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatUtcDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}
