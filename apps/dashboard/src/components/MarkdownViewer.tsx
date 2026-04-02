import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { approveResearchPlan, createInsight, fetchInsightOptions } from "../lib/api";
import type { InsightOptionsResponse, PendingItem } from "../lib/types";

interface MarkdownViewerProps {
  item: PendingItem | null;
  content: string | null;
  isLoading: boolean;
  onApproved?: () => void;
}

interface SelectionState {
  text: string;
  top: number;
  left: number;
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

function normalizeSelectionText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export default function MarkdownViewer({ item, content, isLoading, onApproved }: MarkdownViewerProps) {
  const [approveState, setApproveState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isInsightFormOpen, setIsInsightFormOpen] = useState(false);
  const [insightOptions, setInsightOptions] = useState<InsightOptionsResponse | null>(null);
  const [insightOptionsError, setInsightOptionsError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState("general");
  const [selectedCategory, setSelectedCategory] = useState<InsightOptionsResponse["categories"][0]>("pain-point");
  const [comment, setComment] = useState("");
  const [insightState, setInsightState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [insightMessage, setInsightMessage] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const parsed = useMemo(() => parseFrontmatter(content ?? ""), [content]);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        const data = await fetchInsightOptions();
        if (cancelled) return;
        setInsightOptions(data);
        const defaultProduct = data.products.find((product) => product.key === "general")?.key ?? data.products[0]?.key ?? "general";
        setSelectedProduct(defaultProduct);
        setSelectedCategory(data.categories[0] ?? "pain-point");
      } catch (error) {
        if (cancelled) return;
        setInsightOptionsError(error instanceof Error ? error.message : "Failed to load insight options");
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelection(null);
    setIsInsightFormOpen(false);
    setComment("");
    setInsightState("idle");
    setInsightMessage(null);
  }, [item?.id, content]);

  const clearSelection = () => {
    setSelection(null);
    setIsInsightFormOpen(false);
    const nativeSelection = window.getSelection();
    nativeSelection?.removeAllRanges();
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!item || !articleRef.current || !viewerRef.current || isLoading) {
        setSelection(null);
        return;
      }

      const nativeSelection = window.getSelection();
      if (!nativeSelection || nativeSelection.rangeCount === 0 || nativeSelection.isCollapsed) {
        if (!isInsightFormOpen) {
          setSelection(null);
        }
        return;
      }

      const range = nativeSelection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer;
      const article = articleRef.current;
      const withinArticle = ancestor === article || article.contains(ancestor.nodeType === Node.ELEMENT_NODE ? ancestor : ancestor.parentNode);

      if (!withinArticle) {
        if (!isInsightFormOpen) {
          setSelection(null);
        }
        return;
      }

      const text = normalizeSelectionText(nativeSelection.toString());
      if (!text) {
        if (!isInsightFormOpen) {
          setSelection(null);
        }
        return;
      }

      const rect = range.getBoundingClientRect();
      const containerRect = viewerRef.current.getBoundingClientRect();
      setSelection({
        text,
        top: rect.top - containerRect.top + viewerRef.current.scrollTop - 44,
        left: Math.min(
          Math.max(rect.left - containerRect.left + viewerRef.current.scrollLeft + rect.width / 2, 72),
          Math.max(containerRect.width - 72, 72),
        ),
      });
      setInsightState("idle");
      setInsightMessage(null);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [item, isLoading, isInsightFormOpen]);

  const handleApprove = async () => {
    if (!item?.cardId) return;

    try {
      setApproveState("submitting");
      setApproveError(null);
      await approveResearchPlan(item.cardId);
      setApproveState("done");
      onApproved?.();
    } catch (error) {
      setApproveState("error");
      setApproveError(error instanceof Error ? error.message : "Approval failed");
    }
  };

  const handleCreateInsight = async () => {
    if (!item || !selection) return;

    try {
      setInsightState("submitting");
      setInsightMessage(null);
      const result = await createInsight({
        itemId: item.id,
        selectedText: selection.text,
        product: selectedProduct,
        category: selectedCategory,
        comment,
        sourceDocumentTitle: item.title,
        sourceDocumentPath: item.filePath,
        sourceDocumentContent: content,
        fallbackSource: parsed.frontmatter.source || item.source,
      });
      setInsightState("done");
      setInsightMessage(`Saved ${result.findingId} and pushed research repo changes.`);
      setComment("");
      clearSelection();
    } catch (error) {
      setInsightState("error");
      setInsightMessage(error instanceof Error ? error.message : "Failed to create insight");
    }
  };

  if (!item) {
    return <p className="text-sm text-nimbus-text-muted">Select an item to view its markdown content.</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-nimbus-text-muted">Loading markdown…</p>;
  }

  return (
    <div ref={viewerRef} className="relative space-y-4">
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

      {selection && (
        <div
          className="absolute z-20 -translate-x-1/2 rounded-xl border border-nimbus-border bg-nimbus-surface p-2 shadow-2xl"
          style={{ top: `${Math.max(selection.top, 0)}px`, left: `${selection.left}px` }}
        >
          {!isInsightFormOpen ? (
            <button
              onClick={() => setIsInsightFormOpen(true)}
              className="rounded-btn bg-nimbus-accent px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              Save as Insight
            </button>
          ) : (
            <div className="w-72 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-nimbus-text-subtle">Selected text</p>
                <p className="mt-1 max-h-24 overflow-auto rounded-lg bg-nimbus-bg px-2 py-2 text-xs text-nimbus-text-muted">
                  {selection.text}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-xs text-nimbus-text-muted">
                  <span>Product</span>
                  <select
                    value={selectedProduct}
                    onChange={(event) => setSelectedProduct(event.target.value)}
                    className="w-full rounded-lg border border-nimbus-border bg-nimbus-bg px-2 py-2 text-sm text-nimbus-text-primary"
                  >
                    {(insightOptions?.products ?? []).map((product) => (
                      <option key={product.key} value={product.key}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs text-nimbus-text-muted">
                  <span>Category</span>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value as InsightOptionsResponse["categories"][0])}
                    className="w-full rounded-lg border border-nimbus-border bg-nimbus-bg px-2 py-2 text-sm text-nimbus-text-primary"
                  >
                    {(insightOptions?.categories ?? []).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1 text-xs text-nimbus-text-muted">
                <span>Comment</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  placeholder="Add President context or why this matters…"
                  className="w-full rounded-lg border border-nimbus-border bg-nimbus-bg px-2 py-2 text-sm text-nimbus-text-primary"
                />
              </label>

              <div className="rounded-lg bg-nimbus-bg px-2 py-2 text-[11px] text-nimbus-text-subtle">
                Source: {item.filePath ?? item.cardId ?? item.id}
              </div>

              {insightOptionsError && <p className="text-xs text-nimbus-error">{insightOptionsError}</p>}
              {insightMessage && (
                <p className={`text-xs ${insightState === "error" ? "text-nimbus-error" : "text-green-400"}`}>
                  {insightMessage}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={clearSelection}
                  className="rounded-btn border border-nimbus-border px-3 py-2 text-xs text-nimbus-text-muted hover:text-nimbus-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleCreateInsight()}
                  disabled={insightState === "submitting" || !insightOptions || !!insightOptionsError}
                  className="rounded-btn bg-nimbus-accent px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {insightState === "submitting" ? "Saving…" : "Save Insight"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <article
        ref={articleRef}
        className="prose prose-invert prose-sm max-w-none select-text prose-headings:text-nimbus-text-primary prose-p:text-nimbus-text-muted prose-strong:text-nimbus-text-primary prose-code:text-nimbus-accent-cyan prose-a:text-nimbus-accent"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.body || content || "(empty)"}</ReactMarkdown>
      </article>

      {insightMessage && !selection && (
        <p className={`text-sm ${insightState === "error" ? "text-nimbus-error" : "text-green-400"}`}>{insightMessage}</p>
      )}

      {item.type === "research-plan" && item.cardId && (
        <div className="space-y-2">
          <button
            onClick={() => void handleApprove()}
            disabled={approveState === "submitting" || approveState === "done"}
            className="rounded-btn bg-nimbus-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approveState === "submitting"
              ? "Approving…"
              : approveState === "done"
                ? "Approved"
                : "Approve Research Plan"}
          </button>
          {approveError && <p className="text-sm text-nimbus-error">{approveError}</p>}
        </div>
      )}
    </div>
  );
}
