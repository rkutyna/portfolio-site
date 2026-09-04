// Markdown normalization shared by every place we render author-written copy.
//
// Paragraphs are routinely typed with a leading tab, the way prose is indented
// in a document. CommonMark reads a leading tab (or four spaces) as an indented
// code block, so those paragraphs came out as monospace text inside a <pre>
// that would not wrap. Drop the indent that triggers that, while keeping the
// indentation markdown genuinely needs: fenced blocks stay verbatim and lists
// still nest.

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const LIST_ITEM = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/;

// Column width of a line's leading whitespace, counting a tab as markdown does:
// advance to the next multiple of four.
function indentWidth(line) {
  let width = 0;
  for (const ch of line) {
    if (ch === "\t") width += 4 - (width % 4);
    else if (ch === " ") width += 1;
    else break;
  }
  return width;
}

const dedent = (line) => line.replace(/^[ \t]+/, "");

export function normalizeMarkdown(text) {
  if (typeof text !== "string" || !text) return "";

  // The editor posts CRLF; normalizing here keeps a stray \r from surfacing as
  // trailing whitespace once remark-breaks turns newlines into <br>.
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  let fence = null; // opening marker while inside a fenced code block
  let listBase = null; // indent the open list's own items sit at

  return lines
    .map((line) => {
      const fenceMatch = line.match(FENCE);

      if (fence) {
        const marker = fenceMatch && fenceMatch[1];
        if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
        return line;
      }
      if (fenceMatch) {
        fence = fenceMatch[1];
        return line;
      }

      // Blank lines sit inside a list rather than ending it.
      if (line.trim() === "") return line;

      const width = indentWidth(line);
      const isItem = LIST_ITEM.test(line);

      if (listBase !== null) {
        // Within an open list, deeper indentation is structural: it nests a
        // sub-item or continues the paragraph of the item above.
        if (width > listBase) return line;
        // A sibling item is dedented with the opener so the list stays flat.
        if (isItem && width === listBase) return listBase >= 4 ? dedent(line) : line;
        listBase = null;
      }

      // A bullet carrying a prose indent would read as code, so strip it and
      // let the list open at column zero.
      if (isItem) listBase = width;
      return width >= 4 ? dedent(line) : line;
    })
    .join("\n");
}
