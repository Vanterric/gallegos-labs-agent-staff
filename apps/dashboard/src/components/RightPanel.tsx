import type { RightPanelTab } from "../lib/types";

interface RightPanelProps {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
}

export default function RightPanel({ activeTab, onTabChange }: RightPanelProps) {
  return (
    <aside className="w-80 h-full flex flex-col bg-nimbus-surface-elevated border-l border-nimbus-border shrink-0">
      {/* Tab bar */}
      <div className="flex border-b border-nimbus-border">
        <button
          onClick={() => onTabChange("md-viewer")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "md-viewer"
              ? "text-nimbus-accent border-b-2 border-nimbus-accent"
              : "text-nimbus-text-muted hover:text-nimbus-text-primary"
          }`}
        >
          MD Viewer
        </button>
        <button
          onClick={() => onTabChange("visual-playground")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "visual-playground"
              ? "text-nimbus-accent border-b-2 border-nimbus-accent"
              : "text-nimbus-text-muted hover:text-nimbus-text-primary"
          }`}
        >
          Visual Playground
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 overflow-auto">
        {activeTab === "md-viewer" ? (
          <p className="text-nimbus-text-muted text-sm">
            Select an item to view its markdown content.
          </p>
        ) : (
          <p className="text-nimbus-text-muted text-sm">
            Visual playground — HTML mockups will render here.
          </p>
        )}
      </div>
    </aside>
  );
}
