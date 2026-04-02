// @vitest-environment node

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDashboardApp } from "../../server/index";

describe("dashboard OpenClaw log + playground API", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "dashboard-phase4-"));
    await mkdir(path.join(root, ".openclaw-log"), { recursive: true });
    await mkdir(path.join(root, ".playground"), { recursive: true });
  });

  it("returns normalized OpenClaw log entries from jsonl", async () => {
    await writeFile(
      path.join(root, ".openclaw-log", "messages.jsonl"),
      [
        JSON.stringify({
          timestamp: "2026-04-02T10:00:00.000Z",
          direction: "staff-to-openclaw",
          message: "status?",
          response: "idle",
        }),
        "{bad json}",
        JSON.stringify({ timestamp: "2026-04-02T10:01:00.000Z", direction: "openclaw-to-staff", message: "done" }),
      ].join("\n"),
      "utf8",
    );

    const app = await createDashboardApp({ rootDir: root, disableVite: true });
    const res = await request(app).get("/api/openclaw/log");

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
    expect(res.body.entries[0]).toMatchObject({ direction: "staff-to-openclaw", response: "idle" });
  });

  it("stores playground html and clears previous events on push", async () => {
    await writeFile(
      path.join(root, ".playground", "events.json"),
      JSON.stringify([{ type: "click", choice: "old", timestamp: 1 }]),
      "utf8",
    );

    const app = await createDashboardApp({ rootDir: root, disableVite: true });

    const postRes = await request(app)
      .post("/api/playground")
      .send({ html: "<button data-choice=\"a\">A</button>", filename: "mockup.html" });

    expect(postRes.status).toBe(200);
    expect(postRes.body.eventsCleared).toBe(true);

    const payloadRes = await request(app).get("/api/playground");
    expect(payloadRes.body.html).toContain("data-choice");
    expect(payloadRes.body.filename).toBe("mockup.html");

    const eventsRes = await request(app).get("/api/playground/events");
    expect(eventsRes.body.events).toEqual([]);
  });

  it("appends playground interaction events", async () => {
    const app = await createDashboardApp({ rootDir: root, disableVite: true });

    const event = { type: "click", choice: "plan-a", text: "Plan A", timestamp: 123 };
    const postRes = await request(app).post("/api/playground/events").send(event);
    expect(postRes.status).toBe(200);

    const getRes = await request(app).get("/api/playground/events");
    expect(getRes.body.events).toEqual([event]);
  });
});
