import express from "express";
import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { watch } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { WebSocketServer } from "ws";

const execFileAsync = promisify(execFile);
const PORT = 5174;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(ROOT, "..", "..");
const RESEARCH_REPO = path.resolve(WORKSPACE_ROOT, "..", "gallegos-labs-research");
const STAFF_CONFIG = path.resolve(WORKSPACE_ROOT, "..", "openclaw-staff", "config.md");
const INBOX_STATE_DIR = path.join(ROOT, ".inbox-state");
const DISMISSED_ITEMS_FILE = path.join(INBOX_STATE_DIR, "dismissed-items.json");
const CHAT_RELAY_DIR = path.join(ROOT, ".chat-relay");
const CHAT_INBOX_FILE = path.join(CHAT_RELAY_DIR, "inbox.jsonl");
const CHAT_OUTBOX_FILE = path.join(CHAT_RELAY_DIR, "outbox.jsonl");
const OPENCLAW_LOG_DIR = path.join(ROOT, ".openclaw-log");
const OPENCLAW_LOG_FILE = path.join(OPENCLAW_LOG_DIR, "messages.jsonl");
const PLAYGROUND_DIR = path.join(ROOT, ".playground");
const PLAYGROUND_HTML_FILE = path.join(PLAYGROUND_DIR, "current.html");
const PLAYGROUND_META_FILE = path.join(PLAYGROUND_DIR, "meta.json");
const PLAYGROUND_EVENTS_FILE = path.join(PLAYGROUND_DIR, "events.json");
const PRODUCTS_CONFIG = path.join(RESEARCH_REPO, "config", "products.yaml");
const FINDINGS_RAW_DIR = path.join(RESEARCH_REPO, "findings", "raw");
const INSIGHT_CATEGORIES = ["pain-point", "feature-request", "competitor-mention", "sentiment"] as const;

interface DashboardPaths {
  rootDir: string;
  openClawLogFile: string;
  playgroundHtmlFile: string;
  playgroundMetaFile: string;
  playgroundEventsFile: string;
}

interface DashboardAppOptions {
  rootDir?: string;
  disableVite?: boolean;
}

interface PendingItem {
  id: string;
  type: "outreach-draft" | "research-plan" | "software-review";
  title: string;
  source: string;
  context: string;
  createdAt: string;
  cardId?: string;
  filePath?: string;
  content?: string | null;
}

interface KanbanProjectSummary {
  id: string;
  name: string;
  boardVersion: number;
}

interface KanbanProjectsResponse {
  projects: KanbanProjectSummary[];
}

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

interface KanbanBoardResponse {
  project: KanbanProjectSummary;
  columns: KanbanColumn[];
}

type ChatChannel = "staff" | "openclaw";
type ChatAuthor = "president" | "staff" | "openclaw";

interface ChatMessage {
  type: "message";
  channel: ChatChannel;
  from: ChatAuthor;
  content: string;
  timestamp: string;
}

interface InsightProductOption {
  key: string;
  name: string;
}

interface CreateInsightPayload {
  itemId?: string;
  selectedText?: string;
  product?: string;
  category?: (typeof INSIGHT_CATEGORIES)[number];
  comment?: string;
  sourceDocumentTitle?: string;
  sourceDocumentPath?: string;
  sourceDocumentContent?: string | null;
  fallbackSource?: string;
}

function titleFromFilename(filePath: string) {
  return path
    .basename(filePath)
    .replace(/\.(md|markdown)$/i, "")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "finding";
}

function escapeYaml(value: string) {
  return JSON.stringify(value);
}

function parseSimpleFrontmatter(markdown: string): Record<string, string> {
  if (!markdown.startsWith("---\n")) return {};
  const endIndex = markdown.indexOf("\n---\n", 4);
  if (endIndex === -1) return {};

  return markdown
    .slice(4, endIndex)
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return acc;
      acc[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      return acc;
    }, {});
}

function parseProductsYaml(raw: string): InsightProductOption[] {
  const lines = raw.split(/\r?\n/);
  const products: InsightProductOption[] = [];
  let currentKey: string | null = null;
  let currentName: string | null = null;
  let inProducts = false;

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (line.trim() === "products:") {
      inProducts = true;
      continue;
    }
    if (!inProducts) continue;

    const keyMatch = line.match(/^  ([a-z0-9-]+):\s*$/i);
    if (keyMatch) {
      if (currentKey) {
        products.push({ key: currentKey, name: currentName ?? currentKey });
      }
      currentKey = keyMatch[1];
      currentName = null;
      continue;
    }

    const nameMatch = line.match(/^    name:\s*["']?(.*?)["']?\s*$/);
    if (nameMatch && currentKey) {
      currentName = nameMatch[1];
    }
  }

  if (currentKey) {
    products.push({ key: currentKey, name: currentName ?? currentKey });
  }

  return products;
}

function inferFindingSource(frontmatter: Record<string, string>, fallbackSource?: string) {
  const candidate = frontmatter.source || fallbackSource || "president-annotation";
  const normalized = candidate.toLowerCase();
  const allowed = new Set(["reddit", "in-app-feedback", "email", "survey", "interview", "president-annotation"]);
  return allowed.has(normalized) ? normalized : "president-annotation";
}

function buildFindingPopulation(frontmatter: Record<string, string>, itemId: string) {
  return frontmatter.population || `President annotation derived from ${itemId}`;
}

function buildFindingContext(params: {
  sourceDocumentTitle: string;
  sourceDocumentPath?: string;
  selectedText: string;
  comment: string;
}) {
  const lines = [
    `Source document: ${params.sourceDocumentTitle}`,
    params.sourceDocumentPath ? `Source path: ${params.sourceDocumentPath}` : null,
    "",
    "Selected excerpt:",
    `> ${params.selectedText.replace(/\n+/g, "\n> ")}`,
  ];

  if (params.comment.trim()) {
    lines.push("", "President annotation:", params.comment.trim());
  }

  return lines.filter(Boolean).join("\n");
}

async function safeStat(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function ensureInboxStateDir() {
  await fs.mkdir(INBOX_STATE_DIR, { recursive: true });
}

async function ensureChatRelayFiles() {
  await fs.mkdir(CHAT_RELAY_DIR, { recursive: true });
  await fs.mkdir(OPENCLAW_LOG_DIR, { recursive: true });
  await fs.appendFile(CHAT_INBOX_FILE, "", "utf8");
  await fs.appendFile(CHAT_OUTBOX_FILE, "", "utf8");
  await fs.appendFile(OPENCLAW_LOG_FILE, "", "utf8");
}

async function readDismissedItems(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(DISMISSED_ITEMS_FILE, "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function markItemDismissed(itemId: string) {
  await ensureInboxStateDir();
  const dismissed = await readDismissedItems();
  dismissed[itemId] = new Date().toISOString();
  await fs.writeFile(DISMISSED_ITEMS_FILE, `${JSON.stringify(dismissed, null, 2)}\n`, "utf8");
}

async function loadOutreachDrafts(): Promise<PendingItem[]> {
  const draftsDir = path.join(RESEARCH_REPO, "outreach", "drafts");
  const stat = await safeStat(draftsDir);
  if (!stat?.isDirectory()) return [];

  const entries = await fs.readdir(draftsDir, { withFileTypes: true });
  const items = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name))
      .map(async (entry) => {
        const fullPath = path.join(draftsDir, entry.name);
        const fileStat = await fs.stat(fullPath);
        return {
          id: `outreach:${entry.name}`,
          type: "outreach-draft" as const,
          title: titleFromFilename(entry.name),
          source: "research repo",
          context: "outreach/drafts",
          createdAt: fileStat.mtime.toISOString(),
          filePath: fullPath,
        };
      }),
  );

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function isPathAllowed(requestedPath: string) {
  const resolved = path.resolve(requestedPath);
  return [RESEARCH_REPO, WORKSPACE_ROOT, ROOT].some((base) => resolved.startsWith(base));
}

async function loadKanbanConfig() {
  const raw = await fs.readFile(STAFF_CONFIG, "utf8");
  const values = Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf("=");
        return idx === -1 ? [line, ""] : [line.slice(0, idx), line.slice(idx + 1)];
      }),
  );
  return {
    api: values.KANBAN_API,
    token: values.KANBAN_TOKEN,
    boardName: values.BOARD_NAME,
  };
}

async function loadInsightProducts() {
  const raw = await fs.readFile(PRODUCTS_CONFIG, "utf8");
  const products = parseProductsYaml(raw);
  if (products.length === 0) {
    throw new Error("No products found in config/products.yaml");
  }
  return products;
}

async function fetchProjects(api: string, token: string): Promise<KanbanProjectSummary[]> {
  const res = await fetch(`${api}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch projects (${res.status})`);
  }

  const data = (await res.json()) as KanbanProjectsResponse;
  return data.projects ?? [];
}

async function fetchBoard(api: string, token: string, projectId: string): Promise<KanbanBoardResponse> {
  const res = await fetch(`${api}/api/projects/${projectId}/board`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch board (${res.status})`);
  }

  return (await res.json()) as KanbanBoardResponse;
}

async function fetchKanbanPending(): Promise<PendingItem[]> {
  try {
    const { api, token } = await loadKanbanConfig();
    if (!api || !token) return [];

    const projects = await fetchProjects(api, token);
    const named = new Map(projects.map((project) => [project.name, project]));
    const research = named.get("Research Pipeline");
    const engine = named.get("Autonomous Engine");

    const boards = await Promise.all([
      research ? fetchBoard(api, token, research.id) : Promise.resolve(null),
      engine ? fetchBoard(api, token, engine.id) : Promise.resolve(null),
    ]);

    const [researchBoard, engineBoard] = boards;
    const items: PendingItem[] = [];

    if (researchBoard) {
      const planReview = researchBoard.columns.find((column) => column.title === "Plan Review");
      for (const card of planReview?.cards ?? []) {
        items.push({
          id: `research:${card.id}`,
          type: "research-plan",
          title: card.title,
          source: "research-pipeline",
          context: "Plan Review",
          createdAt: card.updatedAt || card.createdAt || new Date().toISOString(),
          cardId: card.id,
          content: card.description || null,
        });
      }
    }

    if (engineBoard) {
      const review = engineBoard.columns.find((column) => column.title === "Review");
      for (const card of review?.cards ?? []) {
        items.push({
          id: `software:${card.id}`,
          type: "software-review",
          title: card.title,
          source: "autonomous-engine",
          context: "Review",
          createdAt: card.updatedAt || card.createdAt || new Date().toISOString(),
          cardId: card.id,
          content: card.description || null,
        });
      }
    }

    return items;
  } catch {
    return [];
  }
}

async function listPendingItems(): Promise<PendingItem[]> {
  const [drafts, kanbanItems, dismissedItems] = await Promise.all([
    loadOutreachDrafts(),
    fetchKanbanPending(),
    readDismissedItems(),
  ]);

  return [...drafts, ...kanbanItems]
    .filter((item) => !dismissedItems[item.id])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function dismissOutreachDraft(itemId: string) {
  const filename = path.basename(itemId.replace(/^outreach:/, ""));
  const draftsDir = path.join(RESEARCH_REPO, "outreach", "drafts");
  const dismissedDir = path.join(RESEARCH_REPO, "outreach", "dismissed");
  const sourcePath = path.join(draftsDir, filename);
  const destinationPath = path.join(dismissedDir, filename);

  const stat = await safeStat(sourcePath);
  if (!stat?.isFile()) {
    throw new Error("Outreach draft not found");
  }

  await fs.mkdir(dismissedDir, { recursive: true });
  await fs.rename(sourcePath, destinationPath);

  return destinationPath;
}

async function appendJsonLine(filePath: string, payload: unknown) {
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

async function readJsonLines<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as T];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

function createChatMessage(from: ChatAuthor, channel: ChatChannel, content: string): ChatMessage {
  return {
    type: "message",
    from,
    channel,
    content,
    timestamp: new Date().toISOString(),
  };
}

function watchJsonlFile<T>(filePath: string, onEntries: (entries: T[]) => void) {
  let lastLineCount = 0;

  const readNewEntries = async () => {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const lines = raw.split(/\r?\n/).filter(Boolean);
      if (lines.length <= lastLineCount) return;
      const newLines = lines.slice(lastLineCount);
      lastLineCount = lines.length;
      const entries = newLines.map((line) => JSON.parse(line) as T);
      onEntries(entries);
    } catch {
      // ignore watcher races
    }
  };

  void fs.readFile(filePath, "utf8").then((raw) => {
    lastLineCount = raw.split(/\r?\n/).filter(Boolean).length;
  }).catch(() => {});

  const watcher = watch(filePath, () => {
    void readNewEntries();
  });

  return watcher;
}

function resolveDashboardPaths(rootDir = ROOT): DashboardPaths {
  const openClawLogDir = path.join(rootDir, ".openclaw-log");
  const playgroundDir = path.join(rootDir, ".playground");

  return {
    rootDir,
    openClawLogFile: path.join(openClawLogDir, "messages.jsonl"),
    playgroundHtmlFile: path.join(playgroundDir, "current.html"),
    playgroundMetaFile: path.join(playgroundDir, "meta.json"),
    playgroundEventsFile: path.join(playgroundDir, "events.json"),
  };
}

async function ensureDashboardPaths(paths: DashboardPaths) {
  await Promise.all([
    fs.mkdir(path.dirname(paths.openClawLogFile), { recursive: true }),
    fs.mkdir(path.dirname(paths.playgroundHtmlFile), { recursive: true }),
  ]);
}

function normalizeOpenClawLogEntry(entry: Partial<OpenClawLogEntry> | null | undefined): OpenClawLogEntry | null {
  if (!entry || typeof entry.timestamp !== "string" || typeof entry.direction !== "string" || typeof entry.message !== "string") {
    return null;
  }

  return {
    timestamp: entry.timestamp,
    direction: entry.direction,
    message: entry.message,
    response: typeof entry.response === "string" ? entry.response : undefined,
  };
}

async function readOpenClawLog(paths = resolveDashboardPaths()): Promise<OpenClawLogEntry[]> {
  const entries = await readJsonLines<OpenClawLogEntry>(paths.openClawLogFile);
  return entries.map(normalizeOpenClawLogEntry).filter((entry): entry is OpenClawLogEntry => Boolean(entry));
}

async function readPlaygroundPayload(paths = resolveDashboardPaths()) {
  const [html, rawMeta] = await Promise.all([
    fs.readFile(paths.playgroundHtmlFile, 'utf8').catch(() => ''),
    fs.readFile(paths.playgroundMetaFile, 'utf8').catch(() => ''),
  ]);

  let meta: { filename?: string; updatedAt?: string } = {};
  if (rawMeta) {
    try {
      meta = JSON.parse(rawMeta) as { filename?: string; updatedAt?: string };
    } catch {
      meta = {};
    }
  }

  return {
    html,
    filename: meta.filename,
    updatedAt: meta.updatedAt,
  };
}

async function writePlaygroundPayload(html: string, filename: string | undefined, paths = resolveDashboardPaths()) {
  await ensureDashboardPaths(paths);
  const meta = {
    filename,
    updatedAt: new Date().toISOString(),
  };

  await Promise.all([
    fs.writeFile(paths.playgroundHtmlFile, html, 'utf8'),
    fs.writeFile(paths.playgroundMetaFile, JSON.stringify(meta, null, 2), 'utf8'),
    fs.writeFile(paths.playgroundEventsFile, '[]\n', 'utf8'),
  ]);

  return meta;
}

async function readPlaygroundEvents(paths = resolveDashboardPaths()): Promise<PlaygroundEvent[]> {
  try {
    const raw = await fs.readFile(paths.playgroundEventsFile, 'utf8');
    const parsed = JSON.parse(raw) as PlaygroundEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendPlaygroundEvent(event: PlaygroundEvent, paths = resolveDashboardPaths()) {
  const events = await readPlaygroundEvents(paths);
  events.push(event);
  await ensureDashboardPaths(paths);
  await fs.writeFile(paths.playgroundEventsFile, JSON.stringify(events, null, 2), 'utf8');
}

async function attachOpenClawPlaygroundRoutes(app: express.Express, paths = resolveDashboardPaths()) {
  await ensureDashboardPaths(paths);

  app.get('/api/openclaw/log', async (_req, res) => {
    const entries = await readOpenClawLog(paths);
    res.json({ entries });
  });

  app.get('/api/openclaw/log/stream', async (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    const writeEvent = (payload: unknown) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    writeEvent({ entries: await readOpenClawLog(paths) });
    const heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    const watcher = watchJsonlFile<OpenClawLogEntry>(paths.openClawLogFile, (entries) => {
      for (const entry of entries.map(normalizeOpenClawLogEntry).filter((value): value is OpenClawLogEntry => Boolean(value))) {
        writeEvent({ entry });
      }
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      watcher.close();
      res.end();
    });
  });

  app.get('/api/playground', async (_req, res) => {
    res.json(await readPlaygroundPayload(paths));
  });

  app.post('/api/playground', async (req, res) => {
    const html = typeof req.body?.html === 'string' ? req.body.html : '';
    const filename = typeof req.body?.filename === 'string' ? req.body.filename : undefined;
    const meta = await writePlaygroundPayload(html, filename, paths);
    res.json({ ok: true, html, filename: meta.filename, updatedAt: meta.updatedAt, eventsCleared: true });
  });

  app.get('/api/playground/events', async (_req, res) => {
    res.json({ events: await readPlaygroundEvents(paths) });
  });

  app.post('/api/playground/events', async (req, res) => {
    const payload: PlaygroundEvent = {
      type: typeof req.body?.type === 'string' ? req.body.type : 'click',
      choice: typeof req.body?.choice === 'string' ? req.body.choice : undefined,
      text: typeof req.body?.text === 'string' ? req.body.text : undefined,
      timestamp: typeof req.body?.timestamp === 'number' ? req.body.timestamp : Date.now(),
    };

    await appendPlaygroundEvent(payload, paths);
    res.json({ ok: true });
  });
}

export async function createDashboardApp(options: DashboardAppOptions = {}) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  await attachOpenClawPlaygroundRoutes(app, resolveDashboardPaths(options.rootDir));
  return app;
}

async function nextFindingId(date: string) {
  const entries = await fs.readdir(FINDINGS_RAW_DIR, { withFileTypes: true }).catch(() => []);
  const prefix = `f-${date}-`;
  let max = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const raw = await fs.readFile(path.join(FINDINGS_RAW_DIR, entry.name), "utf8").catch(() => "");
    const match = raw.match(/^id:\s*(f-\d{4}-\d{2}-\d{2}-(\d{3}))$/m);
    if (!match || !match[1].startsWith(prefix)) continue;
    max = Math.max(max, Number(match[2]));
  }

  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function runResearchGit(args: string[]) {
  return execFileAsync("git", args, { cwd: RESEARCH_REPO });
}

async function createFindingRecord(
  payload: Required<Pick<CreateInsightPayload, "itemId" | "selectedText" | "product" | "category" | "sourceDocumentTitle">> & CreateInsightPayload,
) {
  const today = new Date().toISOString().slice(0, 10);
  const selectedText = payload.selectedText.trim();
  const comment = (payload.comment ?? "").trim();
  const frontmatter = parseSimpleFrontmatter(payload.sourceDocumentContent ?? "");
  const source = inferFindingSource(frontmatter, payload.fallbackSource);
  const sourceUrl = frontmatter.source_url || "N/A";
  const findingId = await nextFindingId(today);
  const slug = slugify(`${payload.sourceDocumentTitle}-${selectedText.slice(0, 50)}`);
  const filename = `${today}-${source}-${slug}.md`;
  const filePath = path.join(FINDINGS_RAW_DIR, filename);
  const context = buildFindingContext({
    sourceDocumentTitle: payload.sourceDocumentTitle,
    sourceDocumentPath: payload.sourceDocumentPath,
    selectedText,
    comment,
  });

  const markdown = `---
id: ${findingId}
date: ${today}
source: ${source}
source_url: ${escapeYaml(sourceUrl)}
product: ${payload.product}
population: ${escapeYaml(buildFindingPopulation(frontmatter, payload.itemId))}
methodology: president-annotation
category: ${payload.category}
processed: false
insight_ids: []
---

## Finding
${selectedText}

## Context
${context}
`;

  await fs.mkdir(FINDINGS_RAW_DIR, { recursive: true });
  await fs.writeFile(filePath, markdown, "utf8");

  await runResearchGit(["add", filePath]);
  await runResearchGit(["commit", "-m", `feat(findings): add ${findingId} from dashboard highlight`]);
  const commit = (await runResearchGit(["rev-parse", "HEAD"])).stdout.trim();
  await runResearchGit(["push"]);

  return { findingId, filePath, commitHash: commit };
}

async function start() {
  await ensureInboxStateDir();
  await ensureChatRelayFiles();

  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  await attachOpenClawPlaygroundRoutes(app);

  app.get("/api/pending", async (_req, res) => {
    const items = await listPendingItems();
    res.json({ items });
  });

  app.get("/api/chat/history", async (_req, res) => {
    const [inboxMessages, outboxMessages] = await Promise.all([
      readJsonLines<ChatMessage>(CHAT_INBOX_FILE),
      readJsonLines<ChatMessage>(CHAT_OUTBOX_FILE),
    ]);

    const messages = [...inboxMessages, ...outboxMessages].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    res.json({ messages });
  });

  app.post("/api/chat/reply", async (req, res) => {
    const body = (req.body ?? {}) as { content?: string; channel?: string };
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return res.status(400).json({ error: "Missing message content" });
    }

    const channel = body.channel === "openclaw" ? "openclaw" : "staff";
    const message = createChatMessage("staff", channel as ChatChannel, content);
    await appendJsonLine(CHAT_OUTBOX_FILE, message);
    return res.json({ ok: true, message });
  });

  app.get("/api/chat/wait", async (req, res) => {
    const since = typeof req.query.since === "string" ? req.query.since : "";
    if (!since) {
      return res.status(400).json({ error: "Missing 'since' query parameter (ISO timestamp)" });
    }

    const timeoutSec = Math.min(Math.max(Number(req.query.timeout) || 60, 5), 120);
    const deadline = Date.now() + timeoutSec * 1000;

    const getNewMessages = async (): Promise<ChatMessage[]> => {
      const messages = await readJsonLines<ChatMessage>(CHAT_INBOX_FILE);
      return messages.filter((m) => m.from === "president" && m.timestamp > since);
    };

    const immediate = await getNewMessages();
    if (immediate.length > 0) {
      return res.json({ messages: immediate });
    }

    const interval = setInterval(async () => {
      try {
        const msgs = await getNewMessages();
        if (msgs.length > 0) {
          clearInterval(interval);
          if (!res.headersSent) {
            return res.json({ messages: msgs });
          }
        }
        if (Date.now() >= deadline) {
          clearInterval(interval);
          if (!res.headersSent) {
            return res.status(204).end();
          }
        }
      } catch {
        clearInterval(interval);
        if (!res.headersSent) {
          return res.status(500).json({ error: "Internal error while waiting" });
        }
      }
    }, 1500);

    res.on("close", () => {
      clearInterval(interval);
    });
  });

  app.get("/api/insights/options", async (_req, res) => {
    try {
      const products = await loadInsightProducts();
      res.json({ products, categories: [...INSIGHT_CATEGORIES] });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load insight options" });
    }
  });

  app.post("/api/insights/create", async (req, res) => {
    const payload = (req.body ?? {}) as CreateInsightPayload;
    const selectedText = typeof payload.selectedText === "string" ? payload.selectedText.trim() : "";
    const product = typeof payload.product === "string" ? payload.product.trim() : "";
    const category = payload.category;
    const sourceDocumentTitle = typeof payload.sourceDocumentTitle === "string" ? payload.sourceDocumentTitle.trim() : "";
    const itemId = typeof payload.itemId === "string" ? payload.itemId.trim() : "";

    if (!itemId || !selectedText || !product || !sourceDocumentTitle || !category) {
      return res.status(400).json({ error: "Missing required insight fields" });
    }

    if (!INSIGHT_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category: ${String(category)}` });
    }

    try {
      const products = await loadInsightProducts();
      if (!products.some((entry) => entry.key === product)) {
        return res.status(400).json({ error: `Unknown product: ${product}` });
      }

      const result = await createFindingRecord({
        ...payload,
        itemId,
        selectedText,
        product,
        category,
        sourceDocumentTitle,
      });

      return res.json({ ok: true, ...result, pushed: true });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create insight" });
    }
  });

  app.get("/api/content/file", async (req, res) => {
    const requestedPath = String(req.query.path || "");
    if (!requestedPath) {
      return res.status(400).json({ error: "Missing path" });
    }

    if (!isPathAllowed(requestedPath)) {
      return res.status(403).json({ error: "Path not allowed" });
    }

    try {
      const content = await fs.readFile(path.resolve(requestedPath), "utf8");
      return res.json({ path: path.resolve(requestedPath), content });
    } catch (error) {
      return res.status(404).json({ error: error instanceof Error ? error.message : "File not found" });
    }
  });

  app.post("/api/dismiss/:itemId", async (req, res) => {
    const itemId = String(req.params.itemId || "");
    if (!itemId) {
      return res.status(400).json({ error: "Missing item id" });
    }

    try {
      if (itemId.startsWith("outreach:")) {
        const destinationPath = await dismissOutreachDraft(itemId);
        return res.json({ ok: true, dismissedId: itemId, action: "moved", destinationPath });
      }

      const pendingItems = await listPendingItems();
      const item = pendingItems.find((candidate) => candidate.id === itemId);
      if (!item) {
        return res.status(404).json({ error: "Inbox item not found" });
      }

      await markItemDismissed(itemId);
      return res.json({ ok: true, dismissedId: itemId, action: "hidden" });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Dismiss failed" });
    }
  });

  app.post("/api/approve/research-plan/:cardId", async (req, res) => {
    try {
      const { api, token } = await loadKanbanConfig();
      const { cardId } = req.params;
      const projects = await fetchProjects(api, token);
      const research = projects.find((project) => project.name === "Research Pipeline");

      if (!research) {
        return res.status(404).json({ error: "Research Pipeline board not found" });
      }

      const board = await fetchBoard(api, token, research.id);
      const fromColumn = board.columns.find((column) => column.cards.some((card) => card.id === cardId));
      const recruiting = board.columns.find((column) => column.title === "Recruiting");

      if (!fromColumn || !recruiting) {
        return res.status(404).json({ error: "Research plan card or Recruiting column not found" });
      }

      const moveRes = await fetch(`${api}/api/cards/move`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          projectId: research.id,
          cardId,
          fromColumnId: fromColumn.id,
          toColumnId: recruiting.id,
          toIndex: 0,
          boardVersion: board.project.boardVersion,
        }),
      });

      if (!moveRes.ok) {
        const text = await moveRes.text();
        return res.status(502).json({ error: text || "Failed to move card" });
      }

      return res.json({ ok: true, movedTo: "Recruiting" });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Approval failed" });
    }
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  const broadcast = (message: ChatMessage) => {
    const serialized = JSON.stringify(message);
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(serialized);
      }
    }
  };

  wss.on("connection", (socket) => {
    socket.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString()) as Partial<ChatMessage>;
        if (data.type !== "message" || data.from !== "president" || typeof data.content !== "string") {
          return;
        }

        const message = createChatMessage("president", "staff", data.content.trim());
        if (!message.content) return;
        await appendJsonLine(CHAT_INBOX_FILE, message);
        broadcast(message);
      } catch {
        // ignore malformed client messages
      }
    });
  });

  const outboxWatcher = watchJsonlFile(CHAT_OUTBOX_FILE, (entries) => {
    for (const entry of entries) {
      broadcast(entry);
      if (entry.channel === "openclaw") {
        void appendJsonLine(OPENCLAW_LOG_FILE, {
          timestamp: entry.timestamp,
          direction: "openclaw-log",
          message: entry.content,
        });
      }
    }
  });

  server.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
  });

  process.on("SIGINT", () => {
    outboxWatcher.close();
    wss.close();
    server.close(() => process.exit(0));
  });
}

if (!process.env.VITEST) {
  void start();
}
