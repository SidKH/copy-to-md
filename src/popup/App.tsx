import { useEffect, useState } from "react";
import { isRedditThreadUrl, toRedditJsonUrl } from "@/lib/reddit";

type PopupState = "loading" | "unsupported" | "error" | "success";

type PopupData = {
  state: PopupState;
  activeUrl: string | null;
  jsonUrl: string | null;
  error: string | null;
  payload: unknown | null;
};

const initialData: PopupData = {
  state: "loading",
  activeUrl: null,
  jsonUrl: null,
  error: null,
  payload: null,
};

function App() {
  const [data, setData] = useState<PopupData>(initialData);

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
            payload: null,
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

        setData({
          state: "success",
          activeUrl,
          jsonUrl,
          error: null,
          payload,
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
              : "Failed to load Reddit thread JSON.",
          payload: null,
        }));
      }
    }

    void loadThread();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="w-80 h-80">
      <div>
        {data.state === "loading" ? (
          <section>
            Checking the active tab and loading Reddit thread JSON...
          </section>
        ) : null}

        {data.state === "unsupported" ? (
          <section>This tab is not a supported Reddit thread page.</section>
        ) : null}

        {data.state === "error" ? <section>{data.error}</section> : null}

        {data.state === "success" ? (
          <section>
            <div>Raw Thread JSON</div>
            <pre>{JSON.stringify(data.payload, null, 2)}</pre>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default App;
