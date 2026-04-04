import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import InboxView from "./components/InboxView";
import ResearchView from "./components/ResearchView";
import SoftwareView from "./components/SoftwareView";
import ChatView from "./components/ChatView";
import OpenClawLogView from "./components/OpenClawLogView";
import KanbanView from "./components/KanbanView";
import RightPanel from "./components/RightPanel";
import { usePending } from "./hooks/usePending";
import { fetchFileContent } from "./lib/api";
import type { NavSection, PendingItem, RightPanelTab } from "./lib/types";

const staticViews: Record<Exclude<NavSection, "inbox">, () => JSX.Element> = {
  research: ResearchView,
  software: SoftwareView,
  chat: ChatView,
  openclaw: OpenClawLogView,
  kanban: KanbanView,
};

const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 900;
const DEFAULT_PANEL_WIDTH = 384; // w-96

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>("inbox");
  const [activeTab, setActiveTab] = useState<RightPanelTab>("md-viewer");
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [pushedTitle, setPushedTitle] = useState<string | null>(null);
  const [pushedContent, setPushedContent] = useState<string | null>(null);
  const isDragging = useRef(false);
  const { items, isLoading, error, reload, removeItem } = usePending();

  // --- Poll for viewer pushes ---
  const lastViewerTimestamp = useRef<string | null>(null);
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/viewer/current");
        const data = (await res.json()) as { title: string | null; content: string | null; timestamp: string | null };
        if (data.title && data.content && data.timestamp && data.timestamp !== lastViewerTimestamp.current) {
          lastViewerTimestamp.current = data.timestamp;
          localStorage.setItem("viewer-push-title", data.title);
          localStorage.setItem("viewer-push-content", data.content);
          setPushedTitle(data.title);
          setPushedContent(data.content);
          setActiveTab("md-viewer");
          setSelectedItem(null);
          setSelectedContent(null);
        }
      } catch {
        // server unreachable, skip
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-select first inbox item, but not when showing pushed content
  useEffect(() => {
    if (pushedTitle) return;

    if (items.length === 0) {
      setSelectedItem(null);
      return;
    }

    if (!selectedItem) {
      setSelectedItem(items[0]);
      return;
    }

    const refreshedSelected = items.find((item) => item.id === selectedItem.id);
    if (!refreshedSelected) {
      setSelectedItem(items[0]);
      return;
    }

    if (refreshedSelected !== selectedItem) {
      setSelectedItem(refreshedSelected);
    }
  }, [items, selectedItem, pushedTitle]);

  useEffect(() => {
    const loadContent = async () => {
      if (!selectedItem?.filePath) {
        setSelectedContent(selectedItem?.content ?? null);
        return;
      }

      try {
        setIsContentLoading(true);
        const data = await fetchFileContent(selectedItem.filePath);
        setSelectedContent(data.content);
      } catch (err) {
        setSelectedContent(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setIsContentLoading(false);
      }
    };

    void loadContent();
  }, [selectedItem]);

  const handleSelectItem = (item: PendingItem) => {
    setSelectedItem(item);
    setPushedTitle(null);
    setPushedContent(null);
    setActiveNav("inbox");
    setActiveTab("md-viewer");
  };

  const handleDismissed = (item: PendingItem) => {
    removeItem(item.id);
    setSelectedContent(null);
  };

  // --- Resize handle ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - moveEvent.clientX;
      setPanelWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // Determine what the viewer should show
  const viewerItem = selectedItem ?? (pushedTitle ? { id: "pushed", type: "software-review" as const, title: pushedTitle, source: "staff", context: "", createdAt: new Date().toISOString() } : null);
  const viewerContent = selectedItem ? selectedContent : pushedContent;

  const View = activeNav === "inbox" ? null : staticViews[activeNav];

  return (
    <div className="flex h-screen w-screen overflow-hidden text-nimbus-text-primary">
      <Sidebar active={activeNav} onNavigate={setActiveNav} />
      <main className="flex-1 overflow-auto bg-nimbus-bg">
        {activeNav === "inbox" ? (
          <InboxView
            items={items}
            isLoading={isLoading}
            error={error}
            selectedItemId={selectedItem?.id ?? null}
            onSelectItem={handleSelectItem}
          />
        ) : View ? (
          <View />
        ) : null}
      </main>

      {/* Resize handle — wide invisible grab zone with visible center line */}
      <div
        onMouseDown={handleMouseDown}
        className="relative shrink-0 cursor-col-resize"
        style={{ width: 12 }}
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-nimbus-border transition-colors" />
        <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-transparent hover:bg-nimbus-accent/50 transition-colors" />
      </div>

      <RightPanel
        width={panelWidth}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedItem={viewerItem}
        selectedContent={viewerContent}
        isContentLoading={isContentLoading}
        onApproved={() => void reload()}
        onDismissed={handleDismissed}
      />
    </div>
  );
}
