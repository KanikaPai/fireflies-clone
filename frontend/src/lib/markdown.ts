/**
 * A deliberately small Markdown parser for AskFred answers. It produces a plain AST that React renders as
 * elements and text nodes, so no HTML is ever injected: `<script>` in an answer stays visible text, and only
 * http(s)/mailto links are turned into anchors.
 *
 * Supported: paragraphs (single newlines are line breaks), # headings, > quotes, - / * / 1. lists (with
 * `[ ]` / `[x]` task items), --- rules, **bold**, *italic* / _italic_, `code`, [text](url).
 */
export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "br" };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: 1 | 2 | 3 | 4; c: Inline[] }
  | { t: "quote"; c: Block[] }
  | { t: "ul"; items: { checked: boolean | null; c: Inline[] }[] }
  | { t: "ol"; items: Inline[][] }
  | { t: "hr" };

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

/** Parse inline markup. Unmatched markers are kept as text. */
export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^`([^`\n]+)`/))) {
      flush();
      out.push({ t: "code", v: m[1] });
    } else if ((m = rest.match(/^\*\*([^\n]+?)\*\*/))) {
      flush();
      out.push({ t: "strong", c: parseInline(m[1]) });
    } else if ((m = rest.match(/^\*([^*\s][^*\n]*?)\*/)) || (m = rest.match(/^_([^_\s][^_\n]*?)_(?![A-Za-z0-9])/))) {
      flush();
      out.push({ t: "em", c: parseInline(m[1]) });
    } else if ((m = rest.match(/^\[([^\]\n]+)\]\(([^)\s]+)\)/))) {
      flush();
      if (SAFE_LINK.test(m[2])) out.push({ t: "link", href: m[2], c: parseInline(m[1]) });
      else out.push({ t: "text", v: m[1] }); // an unsafe URL (javascript:, data:, ...) is dropped, the label stays
    } else {
      text += source[i];
      i += 1;
      continue;
    }
    i += m[0].length;
  }
  flush();
  return out;
}

const withBreaks = (lines: string[]): Inline[] =>
  lines.flatMap((line, i) => (i === 0 ? parseInline(line) : [{ t: "br" } as Inline, ...parseInline(line)]));

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      blocks.push({ t: "h", level: m[1].length as 1 | 2 | 3 | 4, c: parseInline(m[2].trim()) });
      i++;
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ t: "hr" });
      i++;
    } else if (/^\s*>/.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) inner.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ t: "quote", c: parseMarkdown(inner.join("\n")) });
    } else if (/^\s*[-*]\s+/.test(line)) {
      const items: { checked: boolean | null; c: Inline[] }[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        let body = lines[i++].replace(/^\s*[-*]\s+/, "");
        let checked: boolean | null = null;
        const task = body.match(/^\[([ xX])\]\s+(.*)$/);
        if (task) {
          checked = task[1] !== " ";
          body = task[2];
        }
        items.push({ checked, c: parseInline(body) });
      }
      blocks.push({ t: "ul", items });
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(parseInline(lines[i++].replace(/^\s*\d+[.)]\s+/, "")));
      blocks.push({ t: "ol", items });
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*>|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) para.push(lines[i++].trim());
      blocks.push({ t: "p", c: withBreaks(para) });
    }
  }
  return blocks;
}
