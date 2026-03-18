import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatRedditThreadAsMarkdown,
  isRedditThreadUrl,
  toRedditJsonUrl,
} from "@/lib/reddit";

type PopupState = "loading" | "unsupported" | "error" | "success";

type PopupData = {
  state: PopupState;
  activeUrl: string | null;
  jsonUrl: string | null;
  error: string | null;
  markdown: string | null;
};

const initialData: PopupData = {
  state: "loading",
  activeUrl: null,
  jsonUrl: null,
  error: null,
  markdown: null,
};

function App() {
  const [data, setData] = useState<PopupData>(initialData);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadThread() {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeUrl = tab?.url ?? null;

        if (!activeUrl || !isRedditThreadUrl(activeUrl)) {
          setData({
            state: "unsupported",
            activeUrl,
            jsonUrl: null,
            error: null,
            markdown: null,
          });
          return;
        }

        const jsonUrl = toRedditJsonUrl(activeUrl);
        const response = await fetch(jsonUrl, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(
            `Reddit returned ${response.status} ${response.statusText}`.trim(),
          );
        }

        const payload = await response.json();
        const markdown = formatRedditThreadAsMarkdown(payload, activeUrl);

        setData({
          state: "success",
          activeUrl,
          jsonUrl,
          error: null,
          markdown,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setData((current) => ({
          state: "error",
          activeUrl: current.activeUrl,
          jsonUrl:
            current.activeUrl && isRedditThreadUrl(current.activeUrl)
              ? toRedditJsonUrl(current.activeUrl)
              : current.jsonUrl,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load Reddit thread markdown.",
          markdown: null,
        }));
      }
    }

    void loadThread();

    return () => {
      controller.abort();
    };
  }, []);

  async function handleCopy() {
    if (!data.markdown) {
      return;
    }

    await navigator.clipboard.writeText(data.markdown);
    setCopied(true);
  }

  return (
    <main className="h-80 w-80">
      <div className="flex h-full items-center justify-center p-3 text-center">
        {data.state === "loading" ? (
          <section className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </section>
        ) : null}

        {data.state === "unsupported" ? (
          <section>This tab is not a supported Reddit thread page.</section>
        ) : null}

        {data.state === "error" ? <section>{data.error}</section> : null}

        {data.state === "success" ? (
          <section className="flex items-center justify-center">
            {copied ? (
              <p>Copied to clipboard</p>
            ) : (
              <Button size="lg" onClick={() => void handleCopy()}>
                <Copy />
                Copy markdown
              </Button>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default App;
