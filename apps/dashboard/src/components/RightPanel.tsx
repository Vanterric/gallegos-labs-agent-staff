import MarkdownViewer from "./MarkdownViewer";
import VisualPlayground from "./VisualPlayground";
import type { PendingItem, RightPanelTab } from "../lib/types";

interface RightPanelProps {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  selectedItem: PendingItem | null;
  selectedContent: string | null;
  isContentLoading: boolean;
  onApproved?: () => void;
  onDismissed?: (item: PendingItem) => void;
}

export default function RightPanel({
  activeTab,
  onTabChange,
  selectedItem,
  selectedContent,
  isContentLoading,
  onApproved,
  onDismissed,
}: RightPanelProps) {
  return (
    <aside className="flex h-full w-96 shrink-0 flex-col border-l border-nimbus-border bg-nimbus-surface-elevated">
      <div className="flex border-b border-nimbus-border">
        <button
          onClick={() => onTabChange("md-viewer")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "md-viewer"
              ? "border-b-2 border-nimbus-accent text-nimbus-accent"
              : "text-nimbus-text-muted hover:text-nimbus-text-primary"
          }`}
        >
          MD Viewer
        </button>
        <button
          onClick={() => onTabChange("visual-playground")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "visual-playground"
              ? "border-b-2 border-nimbus-accent text-nimbus-accent"
              : "text-nimbus-text-muted hover:text-nimbus-text-primary"
          }`}
        >
          Visual Playground
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === "md-viewer" ? (
          <MarkdownViewer
            item={selectedItem}
            content={selectedContent}
            isLoading={isContentLoading}
            onApproved={onApproved}
            onDismissed={onDismissed}
          />
        ) : (
          <VisualPlayground />
        )}
      </div>
    </aside>
  );
}
