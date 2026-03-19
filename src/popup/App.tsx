import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatRedditThreadAsMarkdown,
  isRedditThreadUrl,
  toRedditJsonUrl,
} from "@/lib/reddit";
import { countTokens } from "@/lib/tokens";

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

function formatScrambledTokenCount(value: number) {
  return value.toLocaleString();
}

function App() {
  const [data, setData] = useState<PopupData>(initialData);
  const [copied, setCopied] = useState(false);
  const [scrambledTokenCount, setScrambledTokenCount] = useState(() =>
    formatScrambledTokenCount(1234),
  );
  const markdownTokenCount = data.markdown ? countTokens(data.markdown) : null;

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

  useEffect(() => {
    if (data.state !== "loading") {
      return;
    }

    const interval = window.setInterval(() => {
      const nextValue = Math.floor(1000 + Math.random() * 9000);
      setScrambledTokenCount(formatScrambledTokenCount(nextValue));
    }, 20);

    return () => {
      window.clearInterval(interval);
    };
  }, [data.state]);

  async function handleCopy() {
    if (!data.markdown) {
      return;
    }

    await navigator.clipboard.writeText(data.markdown);
    setCopied(true);
  }

  function handleClose() {
    window.close();
  }

  return (
    <main className="relative h-full w-full overflow-hidden bg-transparent text-stone-950">
      <div className="animate-[popup-enter_300ms_cubic-bezier(0.16,1,0.3,1)] relative flex h-full items-center justify-center text-center">
        {data.state === "loading" ? (
          <section className="flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              {scrambledTokenCount} tokens
            </p>
            <Button size="lg" disabled>
              <Copy />
              Copy markdown
            </Button>
          </section>
        ) : null}

        {data.state === "unsupported" ? (
          <section>This tab is not a supported Reddit thread page.</section>
        ) : null}

        {data.state === "error" ? <section>{data.error}</section> : null}

        {data.state === "success" ? (
          <section className="flex flex-col items-center justify-center gap-3">
            {copied ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Copied to clipboard!
                </p>
                <Button size="lg" onClick={handleClose}>
                  Close window
                </Button>
              </>
            ) : (
              <>
                {markdownTokenCount !== null ? (
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {markdownTokenCount.toLocaleString()} tokens
                  </p>
                ) : null}
                <Button size="lg" onClick={() => void handleCopy()}>
                  <Copy />
                  Copy markdown
                </Button>
              </>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default App;
