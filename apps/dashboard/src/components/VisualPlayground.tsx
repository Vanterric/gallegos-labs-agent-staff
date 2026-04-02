import { useEffect, useMemo, useState } from "react";
import { fetchPlaygroundEvents, fetchPlaygroundPayload } from "../lib/api";
import type { PlaygroundEvent } from "../lib/types";

export function createPlaygroundDocument(html: string) {
  if (!html.trim()) {
    return "<div style=\"display:flex;align-items:center;justify-content:center;height:100%;background:#0a0e1a;color:#94a3b8;font-family:Inter,system-ui,sans-serif;\">No HTML pushed yet.</div>";
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; background: #0a0e1a; color: #f1f5f9; font-family: Inter, system-ui, sans-serif; }
      [data-choice] { cursor: pointer; }
      [data-choice][data-selected="true"] { outline: 2px solid #3b82f6; outline-offset: 2px; }
    </style>
  </head>
  <body>
    ${html}
    <script>
      (() => {
        const postEvent = (payload) => window.parent.postMessage({ source: 'visual-playground', ...payload }, '*');
        const clearSelections = () => {
          document.querySelectorAll('[data-choice][data-selected="true"]').forEach((node) => node.setAttribute('data-selected', 'false'));
        };
        document.addEventListener('click', (event) => {
          const target = event.target instanceof Element ? event.target.closest('[data-choice]') : null;
          if (!target) return;
          clearSelections();
          target.setAttribute('data-selected', 'true');
          const choice = target.getAttribute('data-choice') || undefined;
          const text = (target.textContent || '').trim();
          postEvent({ type: 'click', choice, text, timestamp: Date.now() });
        });
      })();
    </script>
  </body>
</html>`;
}

export default function VisualPlayground() {
  const [html, setHtml] = useState("");
  const [filename, setFilename] = useState<string | undefined>();
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [events, setEvents] = useState<PlaygroundEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [payload, eventData] = await Promise.all([
          fetchPlaygroundPayload(),
          fetchPlaygroundEvents(),
        ]);

        if (cancelled) return;
        setHtml(payload.html ?? "");
        setFilename(payload.filename);
        setUpdatedAt(payload.updatedAt);
        setEvents(eventData.events ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load visual playground");
        }
      }
    };

    void load();

    const interval = window.setInterval(() => {
      void fetchPlaygroundEvents()
        .then((data) => {
          if (!cancelled) {
            setEvents(data.events ?? []);
          }
        })
        .catch(() => {
          // keep last good state
        });
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const iframeMarkup = useMemo(() => createPlaygroundDocument(html), [html]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || event.data.source !== "visual-playground") {
        return;
      }

      const payload = {
        type: String(event.data.type || "click"),
        choice: typeof event.data.choice === "string" ? event.data.choice : undefined,
        text: typeof event.data.text === "string" ? event.data.text : undefined,
        timestamp: Number(event.data.timestamp || Date.now()),
      } satisfies PlaygroundEvent;

      setEvents((current) => [payload, ...current].slice(0, 25));

      void fetch("/api/playground/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // keep optimistic local event list
      });
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-xl border border-nimbus-border bg-nimbus-bg-secondary px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-nimbus-text-primary">Interactive Preview</h2>
            <p className="text-xs text-nimbus-text-muted">
              {filename ? filename : "Waiting for Staff to push HTML to /api/playground"}
            </p>
          </div>
          {updatedAt ? (
            <span className="text-[11px] text-nimbus-text-subtle">
              Updated {new Date(updatedAt).toLocaleString()}
            </span>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-nimbus-border bg-nimbus-bg">
        <div className="flex items-center justify-between border-b border-nimbus-border bg-nimbus-surface-elevated px-4 py-2 text-xs text-nimbus-text-muted">
          <span>Selection-enabled preview</span>
          <span>{events.length} event{events.length === 1 ? "" : "s"}</span>
        </div>
        <iframe
          title="Visual Playground"
          srcDoc={iframeMarkup}
          sandbox="allow-scripts"
          className="h-[420px] w-full bg-nimbus-bg"
        />
      </div>

      <div className="rounded-xl border border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.08)] p-4">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-nimbus-text-primary">Captured events</h3>
          <span className="text-[11px] uppercase tracking-[0.12em] text-nimbus-text-subtle">
            GET /api/playground/events
          </span>
        </div>
        {error ? <p className="mb-2 text-sm text-nimbus-error">{error}</p> : null}
        {events.length === 0 ? (
          <p className="text-sm text-nimbus-text-muted">
            Click any element with a <code>data-choice</code> attribute to capture an event.
          </p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 8).map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className="rounded-lg border border-nimbus-border bg-nimbus-surface-elevated px-3 py-2 text-sm text-nimbus-text-primary"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{event.choice ?? event.type}</span>
                  <span className="text-[11px] text-nimbus-text-subtle">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {event.text ? <p className="mt-1 text-nimbus-text-muted">{event.text}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
