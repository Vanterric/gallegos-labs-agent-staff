export type NavSection =
  | "inbox"
  | "research"
  | "software"
  | "chat"
  | "openclaw";

export type RightPanelTab = "md-viewer" | "visual-playground";

export type PendingItemType =
  | "outreach-draft"
  | "research-plan"
  | "software-review";

export interface PendingItem {
  id: string;
  type: PendingItemType;
  title: string;
  source: string;
  context: string;
  createdAt: string;
  cardId?: string;
  filePath?: string;
  content?: string | null;
}

export interface PendingResponse {
  items: PendingItem[];
}

export interface FileContentResponse {
  path: string;
  content: string;
}

export interface DismissResponse {
  ok: true;
  dismissedId: string;
  action: "moved" | "hidden";
  destinationPath?: string;
}

export type ChatChannel = "staff" | "openclaw";
export type ChatAuthor = "president" | "staff" | "openclaw";

export interface ChatMessage {
  type: "message";
  channel: ChatChannel;
  from: ChatAuthor;
  content: string;
  timestamp: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}
