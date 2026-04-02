import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 5174;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(ROOT, "..", "..");
const RESEARCH_REPO = path.resolve(WORKSPACE_ROOT, "..", "gallegos-labs-research");
const STAFF_CONFIG = path.resolve(WORKSPACE_ROOT, "..", "openclaw-staff", "config.md");
const INBOX_STATE_DIR = path.join(ROOT, ".inbox-state");
const DISMISSED_ITEMS_FILE = path.join(INBOX_STATE_DIR, "dismissed-items.json");

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

function titleFromFilename(filePath: string) {
  return path
    .basename(filePath)
    .replace(/\.(md|markdown)$/i, "")
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/[-_]+/g, " ")
    .trim();
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

async function start() {
  await ensureInboxStateDir();

  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/pending", async (_req, res) => {
    const items = await listPendingItems();
    res.json({ items });
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

  app.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
  });
}

start();
