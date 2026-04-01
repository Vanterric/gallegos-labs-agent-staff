import { useState } from "react";
import Sidebar from "./components/Sidebar";
import InboxView from "./components/InboxView";
import ResearchView from "./components/ResearchView";
import SoftwareView from "./components/SoftwareView";
import ChatView from "./components/ChatView";
import OpenClawLogView from "./components/OpenClawLogView";
import RightPanel from "./components/RightPanel";
import type { NavSection, RightPanelTab } from "./lib/types";

const views: Record<NavSection, () => JSX.Element> = {
  inbox: InboxView,
  research: ResearchView,
  software: SoftwareView,
  chat: ChatView,
  openclaw: OpenClawLogView,
};

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>("inbox");
  const [activeTab, setActiveTab] = useState<RightPanelTab>("md-viewer");

  const View = views[activeNav];

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar active={activeNav} onNavigate={setActiveNav} />

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-nimbus-bg">
        <View />
      </main>

      <RightPanel activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
