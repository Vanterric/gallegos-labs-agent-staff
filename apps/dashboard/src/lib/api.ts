import type {
  ChatHistoryResponse,
  DismissResponse,
  FileContentResponse,
  PendingResponse,
} from "./types";

export async function fetchPending(): Promise<PendingResponse> {
  const res = await fetch("/api/pending");
  if (!res.ok) {
    throw new Error(`Failed to fetch pending items: ${res.status}`);
  }
  return res.json();
}

export async function fetchFileContent(path: string): Promise<FileContentResponse> {
  const url = `/api/content/file?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch file content: ${res.status}`);
  }
  return res.json();
}

export async function approveResearchPlan(cardId: string): Promise<void> {
  const res = await fetch(`/api/approve/research-plan/${cardId}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Failed to approve research plan: ${res.status}`);
  }
}

export async function dismissPendingItem(itemId: string): Promise<DismissResponse> {
  const res = await fetch(`/api/dismiss/${encodeURIComponent(itemId)}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Failed to dismiss inbox item: ${res.status}`);
  }

  return res.json();
}

export async function fetchChatHistory(): Promise<ChatHistoryResponse> {
  const res = await fetch("/api/chat/history");
  if (!res.ok) {
    throw new Error(`Failed to fetch chat history: ${res.status}`);
  }

  return res.json();
}
