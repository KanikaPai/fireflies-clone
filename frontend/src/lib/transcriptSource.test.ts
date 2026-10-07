import { describe, expect, it } from "vitest";

import { EXAMPLE_TRANSCRIPT, formatBytes, sourceKey, titleFromFileName, validateFile } from "./transcriptSource";

const file = (name: string, size: number) => ({ name, size, lastModified: 1 }) as File;

describe("validateFile", () => {
  it("accepts supported extensions regardless of case", () => {
    expect(validateFile(file("a.txt", 10))).toBeNull();
    expect(validateFile(file("A.VTT", 10))).toBeNull();
    expect(validateFile(file("a.b.json", 10))).toBeNull();
  });
  it("rejects other types, oversize and empty files with clear messages", () => {
    expect(validateFile(file("a.pdf", 10))).toMatch(/isn't supported/);
    expect(validateFile(file("noext", 10))).toMatch(/isn't supported/);
    expect(validateFile(file("big.txt", 5 * 1024 * 1024 + 1))).toMatch(/maximum is 5 MB/);
    expect(validateFile(file("ok.txt", 5 * 1024 * 1024))).toBeNull();
    expect(validateFile(file("e.txt", 0))).toMatch(/empty/);
  });
});

describe("helpers", () => {
  it("derives a title from a file name", () => {
    expect(titleFromFileName("weekly_standup.vtt")).toBe("weekly standup");
    expect(titleFromFileName("Q3 review.final.json")).toBe("Q3 review.final");
    expect(titleFromFileName("notes")).toBe("notes");
  });
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
  it("makes distinct stable keys", () => {
    expect(sourceKey({ kind: "text", text: "abc" })).toBe(sourceKey({ kind: "text", text: "abc" }));
    expect(sourceKey({ kind: "text", text: "abc" })).not.toBe(sourceKey({ kind: "text", text: "abd" }));
    expect(sourceKey({ kind: "file", file: file("a.txt", 3) })).toContain("a.txt");
  });
  it("ships an example that looks like the txt format", () => {
    expect(EXAMPLE_TRANSCRIPT.split("\n").every((line) => /^\[\d\d:\d\d\] [^:]+: /.test(line))).toBe(true);
  });
});
