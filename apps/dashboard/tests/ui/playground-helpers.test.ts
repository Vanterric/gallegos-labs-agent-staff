import { describe, expect, it } from "vitest";
import { createPlaygroundDocument } from "../../src/components/VisualPlayground";
import { sortOpenClawLogEntries } from "../../src/components/OpenClawLogView";

describe("phase 4 UI helpers", () => {
  it("sorts OpenClaw log entries chronologically", () => {
    const ordered = sortOpenClawLogEntries([
      { timestamp: "2026-04-02T10:01:00.000Z", direction: "openclaw-to-staff", message: "later" },
      { timestamp: "2026-04-02T10:00:00.000Z", direction: "staff-to-openclaw", message: "earlier" },
    ]);

    expect(ordered.map((entry) => entry.message)).toEqual(["earlier", "later"]);
  });

  it("builds a playground document with selection mechanics and placeholder state", () => {
    expect(createPlaygroundDocument("")).toContain("No HTML pushed yet.");

    const doc = createPlaygroundDocument('<button data-choice="alpha">Alpha</button>');
    expect(doc).toContain("data-choice");
    expect(doc).toContain("data-selected");
    expect(doc).toContain("postMessage");
  });
});
