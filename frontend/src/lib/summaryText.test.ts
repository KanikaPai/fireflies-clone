import { describe, expect, it } from "vitest";

import { summaryAsText } from "./summaryText";

describe("summaryAsText", () => {
  it("renders bullets, keywords and timestamped notes", () => {
    const text = summaryAsText({
      title: "Sprint Planning",
      summary: { bullets: [{ label: "Capacity", text: "28 points." }], keywords: ["sprint", "capacity"] },
      chapters: [{ title: "Review", summary: "Looked back.", start_ms: 65_000, points: [{ text: "Export slipped", start_ms: 125_000 }] }],
    });
    expect(text).toBe(
      ["Sprint Planning", "", "Summary", "- Capacity: 28 points.", "", "Keywords: sprint, capacity", "", "Notes", "", "Review", "Looked back. (01:05)", "- Export slipped (02:05)"].join("\n"),
    );
  });
  it("copes with a meeting that has no summary yet", () => {
    expect(summaryAsText({ title: "Empty", summary: null, chapters: [] })).toBe("Empty");
  });
});
