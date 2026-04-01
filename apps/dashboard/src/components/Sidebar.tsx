import {
  Inbox,
  FlaskConical,
  Cog,
  MessageCircle,
  ScrollText,
} from "lucide-react";
import type { NavSection } from "../lib/types";

const navItems: { id: NavSection; icon: typeof Inbox; label: string }[] = [
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "research", icon: FlaskConical, label: "Research" },
  { id: "software", icon: Cog, label: "Software" },
  { id: "chat", icon: MessageCircle, label: "Chat" },
  { id: "openclaw", icon: ScrollText, label: "OpenClaw Log" },
];

interface SidebarProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="w-14 h-full flex flex-col items-center bg-nimbus-surface-elevated border-r border-nimbus-border py-4 gap-1 shrink-0">
      {/* Logo */}
      <div className="w-9 h-9 rounded-btn bg-nimbus-accent flex items-center justify-center text-white font-bold text-lg mb-4 select-none">
        G
      </div>

      {/* Nav items */}
      {navItems.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            title={label}
            className={`w-10 h-10 flex items-center justify-center rounded-btn transition-colors ${
              isActive
                ? "bg-nimbus-bg-tertiary border border-[rgba(59,130,246,0.3)] text-nimbus-accent"
                : "text-nimbus-text-muted hover:text-nimbus-text-primary hover:bg-nimbus-bg-secondary border border-transparent"
            }`}
          >
            <Icon size={20} />
          </button>
        );
      })}
    </aside>
  );
}
