import type {
  ChatHistoryResponse,
  CreateInsightRequest,
  CreateInsightResponse,
  DismissResponse,
  FileContentResponse,
  InsightOptionsResponse,
  OpenClawLogResponse,
  PendingResponse,
  PlaygroundEventsResponse,
  PlaygroundPayloadResponse,
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

export async function fetchInsightOptions(): Promise<InsightOptionsResponse> {
  const res = await fetch("/api/insights/options");
  if (!res.ok) {
    throw new Error(`Failed to fetch insight options: ${res.status}`);
  }

  return res.json();
}

export async function fetchOpenClawLog(): Promise<OpenClawLogResponse> {
  const res = await fetch("/api/openclaw/log");
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenClaw log: ${res.status}`);
  }

  return res.json();
}

export async function fetchPlaygroundPayload(): Promise<PlaygroundPayloadResponse> {
  const res = await fetch("/api/playground");
  if (!res.ok) {
    throw new Error(`Failed to fetch playground payload: ${res.status}`);
  }

  return res.json();
}

export async function fetchPlaygroundEvents(): Promise<PlaygroundEventsResponse> {
  const res = await fetch("/api/playground/events");
  if (!res.ok) {
    throw new Error(`Failed to fetch playground events: ${res.status}`);
  }

  return res.json();
}

export async function createInsight(payload: CreateInsightRequest): Promise<CreateInsightResponse> {
  const res = await fetch("/api/insights/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = `Failed to create insight: ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      // ignore json parse failures
    }
    throw new Error(message);
  }

  return res.json();
}
