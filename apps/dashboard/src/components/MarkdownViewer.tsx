import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { approveResearchPlan } from "../lib/api";
import type { PendingItem } from "../lib/types";

interface MarkdownViewerProps {
  item: PendingItem | null;
  content: string | null;
  isLoading: boolean;
  onApproved?: () => void;
}

function parseFrontmatter(markdown: string): { frontmatter: Record<string, string>; body: string } {
  if (!markdown.startsWith("---\n")) {
    return { frontmatter: {}, body: markdown };
  }

  const endIndex = markdown.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { frontmatter: {}, body: markdown };
  }

  const raw = markdown.slice(4, endIndex).trim();
  const body = markdown.slice(endIndex + 5);
  const frontmatter = raw.split("\n").reduce<Record<string, string>>((acc, line) => {
    const idx = line.indexOf(":");
    if (idx > -1) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      acc[key] = value;
    }
    return acc;
  }, {});

  return { frontmatter, body };
}

export default function MarkdownViewer({ item, content, isLoading, onApproved }: MarkdownViewerProps) {
  const parsed = useMemo(() => parseFrontmatter(content ?? ""), [content]);

  const handleApprove = async () => {
    if (!item?.cardId) return;
    await approveResearchPlan(item.cardId);
    onApproved?.();
  };

  if (!item) {
    return <p className="text-sm text-nimbus-text-muted">Select an item to view its markdown content.</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-nimbus-text-muted">Loading markdown…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-nimbus-text-primary">{item.title}</h2>
        <p className="mt-1 text-xs text-nimbus-text-subtle">{item.filePath ?? item.cardId ?? item.id}</p>
      </div>

      {Object.keys(parsed.frontmatter).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(parsed.frontmatter).map(([key, value]) => (
            <span
              key={key}
              className="rounded-full border border-nimbus-border bg-nimbus-bg-secondary px-2 py-1 text-xs text-nimbus-text-muted"
            >
              {key}: {value}
            </span>
          ))}
        </div>
      )}

      <article className="prose prose-invert prose-sm max-w-none prose-headings:text-nimbus-text-primary prose-p:text-nimbus-text-muted prose-strong:text-nimbus-text-primary prose-code:text-nimbus-accent-cyan prose-a:text-nimbus-accent">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.body || content || "(empty)"}</ReactMarkdown>
      </article>

      {item.type === "research-plan" && item.cardId && (
        <button
          onClick={() => void handleApprove()}
          className="rounded-btn bg-nimbus-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Approve Research Plan
        </button>
      )}
    </div>
  );
}
