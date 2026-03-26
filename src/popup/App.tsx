import { useState } from "react";
import { Copy, CopyCheck, LoaderCircle, MessageSquareOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countTokens, formatTokenCount, tokenCountPrefixSymbol } from "@/lib/tokens";
import { useThreadData } from "@/hooks/useThreadData";

function App() {
  const data = useThreadData();
  const [copied, setCopied] = useState(false);
  const markdownTokenCount = data.markdown ? countTokens(data.markdown) : null;

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
        {data.state === "unsupported" ? (
          <section className="flex max-w-[min(100%,280px)] flex-col items-center gap-4 px-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border"
              aria-hidden
            >
              <MessageSquareOff className="size-5 text-foreground" />
            </div>
            <p className="text-xs text-foreground">
              This tab is not a supported Reddit thread page
            </p>
          </section>
        ) : null}

        {data.state === "error" ? <section>{data.error}</section> : null}

        {data.state === "loading" ? (
          <section className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-[spin_0.45s_linear_infinite]" />
            <span>Fetching data</span>
          </section>
        ) : null}

        {data.state === "success" ? (
          <section className="flex flex-col items-center justify-center">
            {markdownTokenCount !== null ? (
              <p className="flex justify-center">
                <span className="relative inline-block text-3xl">
                  <span className="absolute right-full top-0 pr-1 font-bold text-neutral-300">
                    {tokenCountPrefixSymbol(markdownTokenCount)}
                  </span>
                  <span className="font-bold text-primary">
                    {formatTokenCount(markdownTokenCount)}
                  </span>
                </span>
              </p>
            ) : null}
            <p className="-mt-1 text-sm text-muted-foreground">tokens</p>
            <div className="mt-4 flex min-h-9 w-full max-w-[min(100%,280px)] flex-col items-center justify-center">
              {copied ? (
                <div className="copied-to-clipboard-in inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium text-primary">
                  <CopyCheck className="size-4 shrink-0" aria-hidden />
                  Copied to clipboard
                </div>
              ) : (
                <Button size="lg" onClick={() => void handleCopy()}>
                  <Copy />
                  Copy markdown
                </Button>
              )}
            </div>
            <Button
              variant="link"
              size="sm"
              className="mt-2 h-auto p-0 text-muted-foreground hover:text-muted-foreground"
              onClick={handleClose}
            >
              Close popup
            </Button>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default App;
