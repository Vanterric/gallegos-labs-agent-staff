import type { PendingItem } from "../lib/types";

interface InboxViewProps {
  items: PendingItem[];
  isLoading: boolean;
  error: string | null;
  selectedItemId: string | null;
  onSelectItem: (item: PendingItem) => void;
}

const badgeClasses: Record<PendingItem["type"], string> = {
  "outreach-draft": "border-nimbus-warning text-nimbus-warning",
  "research-plan": "border-nimbus-violet text-nimbus-violet",
  "software-review": "border-nimbus-success text-nimbus-success",
};

const badgeLabels: Record<PendingItem["type"], string> = {
  "outreach-draft": "Outreach",
  "research-plan": "Research",
  "software-review": "Software",
};

export default function InboxView({
  items,
  isLoading,
  error,
  selectedItemId,
  onSelectItem,
}: InboxViewProps) {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold mb-1">Inbox</h1>
          <p className="text-sm text-nimbus-text-muted">
            Pending items that need President attention.
          </p>
        </div>
        <div className="rounded-full border border-nimbus-border px-3 py-1 text-sm text-nimbus-text-muted">
          {items.length} pending
        </div>
      </div>

      {isLoading ? (
        <p className="text-nimbus-text-muted">Loading pending items…</p>
      ) : error ? (
        <p className="text-nimbus-error">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-nimbus-text-muted">No pending items right now.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isSelected = selectedItemId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-nimbus-accent bg-nimbus-bg-tertiary"
                    : "border-nimbus-border bg-nimbus-bg-secondary hover:bg-nimbus-bg-tertiary"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide ${badgeClasses[item.type]}`}
                  >
                    {badgeLabels[item.type]}
                  </span>
                  <span className="text-xs text-nimbus-text-subtle">{item.context}</span>
                </div>
                <div className="font-medium text-nimbus-text-primary">{item.title}</div>
                <div className="mt-2 text-sm text-nimbus-text-muted">
                  {item.source} • {new Date(item.createdAt).toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
