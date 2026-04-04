import { useEffect, useState } from "react";
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

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>("inbox");
  const [activeTab, setActiveTab] = useState<RightPanelTab>("md-viewer");
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const { items, isLoading, error, reload, removeItem } = usePending();

  useEffect(() => {
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
  }, [items, selectedItem]);

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
    setActiveNav("inbox");
    setActiveTab("md-viewer");
  };

  const handleDismissed = (item: PendingItem) => {
    removeItem(item.id);
    setSelectedContent(null);
  };

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
      <RightPanel
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedItem={selectedItem}
        selectedContent={selectedContent}
        isContentLoading={isContentLoading}
        onApproved={() => void reload()}
        onDismissed={handleDismissed}
      />
    </div>
  );
}
