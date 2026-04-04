export type NavSection =
  | "inbox"
  | "research"
  | "software"
  | "chat"
  | "openclaw"
  | "kanban";

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

export interface InsightProductOption {
  key: string;
  name: string;
}

export interface InsightOptionsResponse {
  products: InsightProductOption[];
  categories: Array<"pain-point" | "feature-request" | "competitor-mention" | "sentiment">;
}

export interface CreateInsightRequest {
  itemId: string;
  selectedText: string;
  product: string;
  category: "pain-point" | "feature-request" | "competitor-mention" | "sentiment";
  comment: string;
  sourceDocumentTitle: string;
  sourceDocumentPath?: string;
  sourceDocumentContent?: string | null;
  fallbackSource?: string;
}

export interface CreateInsightResponse {
  ok: true;
  findingId: string;
  filePath: string;
  commitHash: string;
  pushed: true;
}
