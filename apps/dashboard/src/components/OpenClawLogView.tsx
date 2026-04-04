import { useEffect, useMemo, useState } from "react";
import { fetchOpenClawLog } from "../lib/api";
import type { OpenClawLogEntry } from "../lib/types";

function describeDirection(direction: string) {
  if (direction === "staff-to-openclaw") return "Staff → OpenClaw";
  if (direction === "openclaw-to-staff") return "OpenClaw → Staff";
  return direction.replace(/[-_]+/g, " ");
}

export function sortOpenClawLogEntries(entries: OpenClawLogEntry[]) {
  return [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export default function OpenClawLogView() {
  const [entries, setEntries] = useState<OpenClawLogEntry[]>([]);
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/openclaw/log/stream");

    const load = async () => {
      try {
        const data = await fetchOpenClawLog();
        if (!cancelled) {
          setEntries(data.entries);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load OpenClaw log");
        }
      }
    };

    void load();

    source.onopen = () => {
      setStatus("Live");
    };

    source.onerror = () => {
      setStatus("Reconnecting…");
    };

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { entry?: OpenClawLogEntry; entries?: OpenClawLogEntry[] };
        if (payload.entries) {
          setEntries(payload.entries);
          return;
        }

        if (payload.entry) {
          setEntries((current) => [...current, payload.entry!]);
        }
      } catch {
        setError("Received malformed OpenClaw log event");
      }
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  const orderedEntries = useMemo(() => sortOpenClawLogEntries(entries), [entries]);

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">OpenClaw Log</h1>
        <p className="text-sm text-nimbus-text-muted">{status}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-auto rounded-xl border border-nimbus-border bg-nimbus-surface-elevated p-4">
        {error ? <p className="text-sm text-nimbus-error">{error}</p> : null}
        {orderedEntries.length === 0 ? (
          <p className="text-sm text-nimbus-text-muted">No OpenClaw exchanges logged yet.</p>
        ) : null}

        {orderedEntries.map((entry, index) => (
          <article
            key={`${entry.timestamp}-${index}`}
            className="rounded-2xl border border-[rgba(6,182,212,0.24)] bg-[rgba(6,182,212,0.07)] p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-nimbus-accent-cyan">
                {describeDirection(entry.direction)}
              </span>
              <span className="text-[11px] text-nimbus-text-subtle">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="space-y-3 text-sm text-nimbus-text-primary">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-nimbus-text-subtle">
                  Message
                </div>
                <pre className="whitespace-pre-wrap break-words rounded-xl bg-nimbus-bg px-3 py-2 font-sans text-sm text-nimbus-text-primary">
                  {entry.message}
                </pre>
              </div>
              {entry.response ? (
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-nimbus-text-subtle">
                    Response
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-xl bg-nimbus-bg-secondary px-3 py-2 font-sans text-sm text-nimbus-text-primary">
                    {entry.response}
                  </pre>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
