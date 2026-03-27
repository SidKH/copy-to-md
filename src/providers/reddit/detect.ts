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
