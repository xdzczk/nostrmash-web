export type NoteBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "quote"; text: string };

/**
 * Kind-1 notes sometimes paste Markdown. Headings and quotes stay structured
 * so the renderer can drop the punctuation. Inline links are left for the
 * tokenizer, which turns a real URL into an anchor and a broken target into
 * the label alone.
 */
export function splitNoteBlocks(content: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let quote: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join("\n").trim();
    paragraph = [];
    if (text) blocks.push({ kind: "paragraph", text });
  };
  const flushQuote = () => {
    const text = quote.join("\n").trim();
    quote = [];
    if (text) blocks.push({ kind: "quote", text });
  };

  for (const line of lines) {
    const heading = /^(#{1,6})[ \t]+(\S.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushQuote();
      blocks.push({ kind: "heading", text: heading[2]!.trim() });
      continue;
    }
    const quoted = /^>[ \t]?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      quote.push(quoted[1] ?? "");
      continue;
    }
    flushQuote();
    if (line.trim().length === 0) {
      flushParagraph();
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushQuote();
  return blocks.length > 0 ? blocks : [{ kind: "paragraph", text: content }];
}
