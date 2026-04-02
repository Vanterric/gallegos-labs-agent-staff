import { useEffect, useMemo, useRef, useState } from "react";
import { fetchChatHistory } from "../lib/api";
import type { ChatAuthor, ChatChannel, ChatMessage } from "../lib/types";

const channelOptions: { value: ChatChannel; label: string }[] = [
  { value: "staff", label: "Staff Chat" },
  { value: "openclaw", label: "OpenClaw Log" },
];

function avatarFor(author: ChatAuthor) {
  if (author === "president") return "D";
  if (author === "openclaw") return "OC";
  return "🤖";
}

function bubbleClass(message: ChatMessage) {
  if (message.from === "president") {
    return "ml-auto border border-[rgba(139,92,246,0.35)] bg-[rgba(59,130,246,0.18)]";
  }

  if (message.from === "openclaw") {
    return "mr-auto border border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.08)]";
  }

  return "mr-auto border border-nimbus-border bg-nimbus-bg-secondary";
}

interface ChatViewProps {
  initialChannel?: ChatChannel;
  forceReadOnly?: boolean;
}

export default function ChatView({ initialChannel = "staff", forceReadOnly = false }: ChatViewProps) {
  const [channel, setChannel] = useState<ChatChannel>(initialChannel);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const data = await fetchChatHistory();
        if (!cancelled) {
          setMessages(data.messages.filter((message) => message.channel === "staff"));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chat history");
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
    socketRef.current = ws;

    ws.addEventListener("open", () => {
      setStatus("Live");
    });

    ws.addEventListener("close", () => {
      setStatus("Disconnected");
    });

    ws.addEventListener("error", () => {
      setStatus("Connection error");
    });

    ws.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data) as ChatMessage;
        if (message.type !== "message" || message.channel !== "staff") return;
        setMessages((current) => [...current, message]);
      } catch {
        setError("Received malformed chat event");
      }
    });

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setChannel(initialChannel);
  }, [initialChannel]);

  const visibleMessages = useMemo(() => {
    if (channel === "openclaw") return [];
    return messages;
  }, [messages, channel]);

  const readOnly = forceReadOnly || channel === "openclaw";

  const sendMessage = () => {
    const content = draft.trim();
    if (!content || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "message",
        from: "president",
        channel: "staff",
        content,
      }),
    );
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Chat</h1>
          <p className="text-sm text-nimbus-text-muted">{status}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-nimbus-text-muted">
          <span>View</span>
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as ChatChannel)}
            className="rounded-btn border border-nimbus-border bg-nimbus-bg-secondary px-3 py-2 text-nimbus-text-primary outline-none"
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex-1 space-y-3 overflow-auto rounded-xl border border-nimbus-border bg-nimbus-surface-elevated p-4">
        {error ? <p className="text-sm text-nimbus-error">{error}</p> : null}
        {channel === "openclaw" ? (
          <p className="text-sm text-nimbus-text-muted">
            OpenClaw log now has its own dedicated view in the sidebar.
          </p>
        ) : visibleMessages.length === 0 ? (
          <p className="text-sm text-nimbus-text-muted">No chat messages yet. Send the first one.</p>
        ) : null}

        {visibleMessages.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={`flex max-w-[85%] gap-3 ${
              message.from === "president" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nimbus-bg-tertiary text-xs font-semibold text-nimbus-text-primary">
              {avatarFor(message.from)}
            </div>
            <div className={`rounded-2xl px-4 py-3 ${bubbleClass(message)}`}>
              <div className="mb-1 text-xs uppercase tracking-[0.12em] text-nimbus-text-subtle">
                {message.from}
              </div>
              <p className="whitespace-pre-wrap text-sm text-nimbus-text-primary">{message.content}</p>
              <div className="mt-2 text-[11px] text-nimbus-text-subtle">
                {new Date(message.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {!readOnly ? (
        <div className="mt-4 flex items-end gap-3 rounded-xl border border-nimbus-border bg-nimbus-surface-elevated p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            rows={3}
            className="min-h-[72px] flex-1 resize-none rounded-btn border border-nimbus-border bg-nimbus-bg-secondary px-3 py-2 text-sm text-nimbus-text-primary outline-none placeholder:text-nimbus-text-subtle"
          />
          <button
            onClick={sendMessage}
            className="rounded-btn bg-nimbus-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!draft.trim() || status !== "Live"}
          >
            Send
          </button>
        </div>
      ) : null}
    </div>
  );
}
