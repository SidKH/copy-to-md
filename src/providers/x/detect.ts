const SUPPORTED_HOSTS = new Set(["x.com", "twitter.com"]);

export function isXStatusUrl(url: string): boolean {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, "");

  if (!SUPPORTED_HOSTS.has(hostname)) {
    return false;
  }

  const parts = parsedUrl.pathname.split("/").filter(Boolean);

  return (
    parts.length === 3 &&
    parts[0].length > 0 &&
    parts[1] === "status" &&
    parts[2].length > 0
  );
}
