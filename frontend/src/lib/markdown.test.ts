import { describe, expect, it } from "vitest";

import { parseInline, parseMarkdown } from "./markdown";

describe("parseInline", () => {
  it("parses bold, italic and code", () => {
    expect(parseInline("a **b** *c* _d_ `e`")).toEqual([
      { t: "text", v: "a " },
      { t: "strong", c: [{ t: "text", v: "b" }] },
      { t: "text", v: " " },
      { t: "em", c: [{ t: "text", v: "c" }] },
      { t: "text", v: " " },
      { t: "em", c: [{ t: "text", v: "d" }] },
      { t: "text", v: " " },
      { t: "code", v: "e" },
    ]);
  });
  it("keeps unmatched markers and snake_case as text", () => {
    expect(parseInline("2 * 3 and snake_case_name")).toEqual([{ t: "text", v: "2 * 3 and snake_case_name" }]);
  });
  it("never produces HTML: tags stay text", () => {
    const [node] = parseInline('<img src=x onerror="alert(1)"><script>x</script>');
    expect(node).toEqual({ t: "text", v: '<img src=x onerror="alert(1)"><script>x</script>' });
  });
  it("only links http(s) and mailto", () => {
    expect(parseInline("[ok](https://example.com)")[0]).toMatchObject({ t: "link", href: "https://example.com" });
    expect(parseInline("[mail](mailto:a@b.co)")[0]).toMatchObject({ t: "link" });
    expect(parseInline("[bad](javascript:alert(1))")).toEqual([{ t: "text", v: "bad" }].concat([{ t: "text", v: ")" }]));
    expect(parseInline("[bad](data:text/html;base64,AAAA)").some((n) => n.t === "link")).toBe(false);
  });
});

describe("parseMarkdown", () => {
  it("parses paragraphs with line breaks, headings and rules", () => {
    const blocks = parseMarkdown("# Title\n\nline one\nline two\n\n---");
    expect(blocks[0]).toMatchObject({ t: "h", level: 1 });
    expect(blocks[1]).toEqual({ t: "p", c: [{ t: "text", v: "line one" }, { t: "br" }, { t: "text", v: "line two" }] });
    expect(blocks[2]).toEqual({ t: "hr" });
  });
  it("parses lists and task items", () => {
    const [ul, ol] = parseMarkdown("- [x] done\n- [ ] open\n- plain\n\n1. first\n2. second");
    expect(ul).toMatchObject({ t: "ul", items: [{ checked: true }, { checked: false }, { checked: null }] });
    expect(ol).toMatchObject({ t: "ol" });
    expect((ol as { items: unknown[] }).items).toHaveLength(2);
  });
  it("parses quotes with a citation line", () => {
    const [q] = parseMarkdown('> "Hello there."\n> — **Ann** (00:03)');
    expect(q.t).toBe("quote");
    const inner = (q as { c: { t: string; c: { t: string }[] }[] }).c[0];
    expect(inner.t).toBe("p");
    expect(inner.c.some((n) => n.t === "br") && inner.c.some((n) => n.t === "strong")).toBe(true);
  });
  it("handles empty input", () => {
    expect(parseMarkdown("")).toEqual([]);
  });
});
