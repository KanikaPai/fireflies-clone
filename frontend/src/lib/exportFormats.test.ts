import { describe, expect, it } from "vitest";

import { filenameFromDisposition } from "./api/client";
import { DOWNLOAD_OPTIONS, printPath } from "./exportFormats";

describe("export helpers", () => {
  it("reads the filename from Content-Disposition", () => {
    expect(filenameFromDisposition('attachment; filename="sprint-planning-2026-09-25.md"')).toBe("sprint-planning-2026-09-25.md");
    expect(filenameFromDisposition(null)).toBeNull();
  });
  it("offers the five download choices", () => {
    expect(DOWNLOAD_OPTIONS.map((o) => o.key)).toEqual(["txt", "vtt", "md", "json", "pdf"]);
    expect(printPath(7)).toBe("/meetings/7/print");
  });
});
