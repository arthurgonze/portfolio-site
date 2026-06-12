// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

/**
 * Parses project front matter and renders a controlled markdown subset.
 *
 * Supported block elements:
 * headings, paragraphs, unordered lists, ordered lists, blockquotes,
 * fenced code blocks, tables, and horizontal rules.
 *
 * Supported inline elements:
 * links, images, inline code, emphasis, strong text, highlight, and
 * footnote references.
 */

/**
 * Loads a markdown document from a URL and parses its front matter.
 * @param {string} url
 * @returns {Promise<{frontMatter: Record<string, unknown>, body: string}>}
 */
export async function loadMarkdownDocument(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load markdown document at "${url}" (${response.status}).`);
  }

  const source = await response.text();
  return parseFrontMatter(source);
}

/**
 * Parses a markdown document with optional YAML-like front matter.
 * @param {string} source
 * @returns {{frontMatter: Record<string, unknown>, body: string}}
 */
export function parseFrontMatter(source) {
  const normalized = normalizeNewlines(source);
  const lines = normalized.split("\n");

  if (lines[0]?.trim() !== "---") {
    return {
      frontMatter: {},
      body: normalized.replace(/^\s*\n/, ""),
    };
  }

  let endIndex = -1;
  for (let index = 1; index < lines.length; index++) {
    if (lines[index].trim() === "---") {
      endIndex = index;
      break;
    }
  }

  if (endIndex === -1) {
    return {
      frontMatter: {},
      body: normalized.replace(/^\s*\n/, ""),
    };
  }

  const frontMatterText = lines.slice(1, endIndex).join("\n");
  const body = lines.slice(endIndex + 1).join("\n").replace(/^\s*\n/, "");

  return {
    frontMatter: parseSimpleFrontMatter(frontMatterText),
    body,
  };
}

/**
 * Renders markdown content into a HTML string using a controlled subset.
 * @param {string} markdownBody
 * @returns {string}
 */
export function renderMarkdown(markdownBody) {
  const normalized = normalizeNewlines(markdownBody);
  const rawLines = normalized.split("\n");
  const footnoteDefinitions = collectFootnoteDefinitions(rawLines);
  const lines = stripFootnoteDefinitions(rawLines);
  const sections = [];
  let currentSection = [];
  let index = 0;
  const footnoteOrder = [];

  while (index < lines.length) {
    const line = lines[index];

    if (isBlankLine(line)) {
      index++;
      continue;
    }

    if (isCodeFenceStart(line)) {
      const parsedCodeBlock = parseCodeBlock(lines, index);
      currentSection.push(parsedCodeBlock.html);
      index = parsedCodeBlock.nextIndex;
      continue;
    }

    if (isTableStart(lines, index)) {
      const parsedTable = parseTable(lines, index, footnoteDefinitions, footnoteOrder);
      currentSection.push(parsedTable.html);
      index = parsedTable.nextIndex;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushCurrentSection(sections, currentSection);
      const level = headingMatch[1].length;
      currentSection.push(
        `<h${level}>${renderInlineMarkdown(headingMatch[2], footnoteDefinitions, footnoteOrder)}</h${level}>`,
      );
      index++;
      continue;
    }

    if (isHorizontalRule(line)) {
      currentSection.push("<hr />");
      index++;
      continue;
    }

    if (isOrderedListItem(line) || isUnorderedListItem(line)) {
      const parsedList = parseList(lines, index, footnoteDefinitions, footnoteOrder);
      currentSection.push(parsedList.html);
      index = parsedList.nextIndex;
      continue;
    }

    if (isBlockquoteLine(line)) {
      const parsedQuote = parseBlockquote(lines, index, footnoteDefinitions, footnoteOrder);
      currentSection.push(parsedQuote.html);
      index = parsedQuote.nextIndex;
      continue;
    }

    const parsedParagraph = parseParagraph(lines, index, footnoteDefinitions, footnoteOrder);
    currentSection.push(parsedParagraph.html);
    index = parsedParagraph.nextIndex;
  }

  flushCurrentSection(sections, currentSection);

  if (footnoteOrder.length > 0) {
    sections.push(renderFootnotesSection(footnoteDefinitions, footnoteOrder));
  }

  return sections.join("");
}

function normalizeNewlines(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isBlankLine(line) {
  return line.trim().length === 0;
}

function isHorizontalRule(line) {
  return /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line);
}

function isCodeFenceStart(line) {
  return /^\s*```/.test(line);
}

function isUnorderedListItem(line) {
  return /^\s*[-*+]\s+/.test(line);
}

function isOrderedListItem(line) {
  return /^\s*\d+\.\s+/.test(line);
}

function isBlockquoteLine(line) {
  return /^\s*>\s?/.test(line);
}

function isTableStart(lines, index) {
  const headerLine = lines[index];
  const delimiterLine = lines[index + 1];
  if (!headerLine || !delimiterLine || !headerLine.includes("|")) {
    return false;
  }

  return isTableDelimiterRow(delimiterLine);
}

function isTableDelimiterRow(line) {
  const cells = splitTableRow(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function collectFootnoteDefinitions(lines) {
  const definitions = new Map();

  for (const line of lines) {
    const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
    if (match) {
      definitions.set(match[1], match[2]);
    }
  }

  return definitions;
}

function stripFootnoteDefinitions(lines) {
  return lines.filter((line) => !/^\[\^([^\]]+)\]:\s*(.*)$/.test(line));
}

function flushCurrentSection(sections, currentSection) {
  if (currentSection.length === 0) {
    return;
  }

  sections.push(`<section class="project-section">${currentSection.join("")}</section>`);
  currentSection.length = 0;
}

function parseCodeBlock(lines, startIndex) {
  const startLine = lines[startIndex];
  const fenceMatch = startLine.match(/^\s*```([\w-]+)?\s*$/);
  const language = fenceMatch?.[1] || "";
  const codeLines = [];
  let index = startIndex + 1;

  while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
    codeLines.push(lines[index]);
    index++;
  }

  if (index < lines.length) {
    index++;
  }

  const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
  return {
    html: `<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
    nextIndex: index,
  };
}

function parseList(lines, startIndex, footnoteDefinitions, footnoteOrder) {
  const firstLine = lines[startIndex];
  const orderedMatch = firstLine.match(/^\s*(\d+)\.\s+(.+)$/);
  const ordered = Boolean(orderedMatch);
  const startNumber = ordered ? Number.parseInt(orderedMatch[1], 10) || 1 : 1;
  const items = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const match = ordered
      ? line.match(/^\s*(\d+)\.\s+(.+)$/)
      : line.match(/^\s*[-*+]\s+(.+)$/);

    if (!match) {
      break;
    }

    let itemText = match[2].trim();
    index++;

    while (index < lines.length) {
      const nextLine = lines[index];
      const nextIsListItem = ordered
        ? /^\s*\d+\.\s+/.test(nextLine)
        : /^\s*[-*+]\s+/.test(nextLine);
      const nextIsBlockStart =
        isBlankLine(nextLine) ||
        isCodeFenceStart(nextLine) ||
        isHorizontalRule(nextLine) ||
        /^(#{1,6})\s+/.test(nextLine) ||
        isBlockquoteLine(nextLine) ||
        isTableStart(lines, index);

      if (nextIsListItem || nextIsBlockStart) {
        break;
      }

      itemText += ` ${nextLine.trim()}`;
      index++;
    }

    items.push(`<li>${renderInlineMarkdown(itemText, footnoteDefinitions, footnoteOrder)}</li>`);
  }

  const tagName = ordered ? "ol" : "ul";
  const startAttribute = ordered && startNumber !== 1 ? ` start="${startNumber}"` : "";
  return {
    html: `<${tagName}${startAttribute}>${items.join("")}</${tagName}>`,
    nextIndex: index,
  };
}

function parseBlockquote(lines, startIndex, footnoteDefinitions, footnoteOrder) {
  const quoteLines = [];
  let index = startIndex;

  while (index < lines.length && isBlockquoteLine(lines[index])) {
    quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
    index++;
  }

  return {
    html: `<blockquote>${renderInlineMarkdown(
      quoteLines.join(" "),
      footnoteDefinitions,
      footnoteOrder,
    )}</blockquote>`,
    nextIndex: index,
  };
}

function parseTable(lines, startIndex, footnoteDefinitions, footnoteOrder) {
  const headerCells = splitTableRow(lines[startIndex]);
  const delimiterCells = splitTableRow(lines[startIndex + 1]);
  const alignments = delimiterCells.map(parseTableAlignment);
  const rows = [];
  let index = startIndex + 2;

  while (index < lines.length && !isBlankLine(lines[index]) && lines[index].includes("|")) {
    rows.push(splitTableRow(lines[index]));
    index++;
  }

  const headerHtml = headerCells
    .map((cell, cellIndex) => {
      const alignment = alignments[cellIndex];
      return `<th${alignment ? ` style="text-align: ${alignment};"` : ""}>${renderInlineMarkdown(
        cell,
        footnoteDefinitions,
        footnoteOrder,
      )}</th>`;
    })
    .join("");

  const rowHtml = rows
    .map((row) => {
      const cells = headerCells.map((_, cellIndex) => {
        const alignment = alignments[cellIndex];
        const cellValue = row[cellIndex] || "";
        return `<td${alignment ? ` style="text-align: ${alignment};"` : ""}>${renderInlineMarkdown(
          cellValue,
          footnoteDefinitions,
          footnoteOrder,
        )}</td>`;
      });
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");

  return {
    html: `<table><thead><tr>${headerHtml}</tr></thead>${rowHtml ? `<tbody>${rowHtml}</tbody>` : ""}</table>`,
    nextIndex: index,
  };
}

function parseTableAlignment(cell) {
  const trimmed = cell.trim();
  if (trimmed.startsWith(":") && trimmed.endsWith(":")) {
    return "center";
  }
  if (trimmed.startsWith(":")) {
    return "left";
  }
  if (trimmed.endsWith(":")) {
    return "right";
  }
  return "";
}

function splitTableRow(row) {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseParagraph(lines, startIndex, footnoteDefinitions, footnoteOrder) {
  const parts = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (
      isBlankLine(line) ||
      isCodeFenceStart(line) ||
      isHorizontalRule(line) ||
      /^(#{1,6})\s+/.test(line) ||
      isUnorderedListItem(line) ||
      isOrderedListItem(line) ||
      isBlockquoteLine(line) ||
      isTableStart(lines, index)
    ) {
      break;
    }

    parts.push(line.trim());
    index++;
  }

  return {
    html: `<p>${renderInlineMarkdown(parts.join(" "), footnoteDefinitions, footnoteOrder)}</p>`,
    nextIndex: index,
  };
}

function renderFootnotesSection(footnoteDefinitions, footnoteOrder) {
  const items = footnoteOrder
    .map((label) => {
      const content = footnoteDefinitions.get(label) || "";
      return `<li id="footnote-${escapeHtml(label)}">${renderInlineMarkdown(
        content,
        footnoteDefinitions,
        footnoteOrder,
        { collectFootnoteRefs: false },
      )}</li>`;
    })
    .join("");

  return `<section class="project-section project-footnotes"><h2>Footnotes</h2><ol class="footnotes">${items}</ol></section>`;
}

function renderInlineMarkdown(
  text,
  footnoteDefinitions,
  footnoteOrder,
  { collectFootnoteRefs = true } = {},
) {
  let output = "";
  let index = 0;

  while (index < text.length) {
    const slice = text.slice(index);
    const token = matchInlineToken(slice, footnoteDefinitions, footnoteOrder, collectFootnoteRefs);

    if (token) {
      output += token.html;
      index += token.length;
      continue;
    }

    const nextTokenIndex = findNextInlineTokenIndex(slice);
    const segmentLength = nextTokenIndex <= 0 ? 1 : nextTokenIndex;
    const segment = slice.slice(0, segmentLength);
    output += escapeHtml(segment);
    index += segment.length;
  }

  return output;
}

function matchInlineToken(slice, footnoteDefinitions, footnoteOrder, collectFootnoteRefs) {
  const tokenMatchers = [
    {
      regex: /^!\[([^\]]*)\]\(([^)]+)\)/,
      render: (match) =>
        `<img src="${escapeAttribute(sanitizeUrl(match[2]))}" alt="${escapeAttribute(
          match[1],
        )}" />`,
    },
    {
      regex: /^\[([^\]]+)\]\(([^)]+)\)/,
      render: (match) =>
        `<a href="${escapeAttribute(sanitizeUrl(match[2]))}">${escapeHtml(match[1])}</a>`,
    },
    {
      regex: /^`([^`]+)`/,
      render: (match) => `<code>${escapeHtml(match[1])}</code>`,
    },
    {
      regex: /^\*\*([^*]+)\*\*/,
      render: (match) => `<strong>${escapeHtml(match[1])}</strong>`,
    },
    {
      regex: /^__([^_]+)__/,
      render: (match) => `<strong>${escapeHtml(match[1])}</strong>`,
    },
    {
      regex: /^==(.+?)==/,
      render: (match) => `<mark>${escapeHtml(match[1])}</mark>`,
    },
    {
      regex: /^\*([^*]+)\*/,
      render: (match) => `<em>${escapeHtml(match[1])}</em>`,
    },
    {
      regex: /^_([^_]+)_/,
      render: (match) => `<em>${escapeHtml(match[1])}</em>`,
    },
    {
      regex: /^\[\^([^\]]+)\]/,
      render: (match) => {
        if (!collectFootnoteRefs || !footnoteDefinitions.has(match[1])) {
          return null;
        }

        let footnoteIndex = footnoteOrder.indexOf(match[1]);
        if (footnoteIndex === -1) {
          footnoteOrder.push(match[1]);
          footnoteIndex = footnoteOrder.length - 1;
        }

        const number = footnoteIndex + 1;
        return `<sup class="footnote-ref"><a href="#footnote-${escapeAttribute(
          match[1],
        )}">${number}</a></sup>`;
      },
    },
  ];

  for (const matcher of tokenMatchers) {
    const match = slice.match(matcher.regex);
    if (!match) {
      continue;
    }

    const rendered = matcher.render(match);
    if (rendered === null) {
      continue;
    }

    return {
      html: rendered,
      length: match[0].length,
    };
  }

  return null;
}

function findNextInlineTokenIndex(slice) {
  const candidates = ["![", "[", "`", "**", "__", "==", "*", "_", "[^"];
  let nextIndex = -1;

  for (const token of candidates) {
    const index = slice.indexOf(token);
    if (index === -1) {
      continue;
    }
    if (nextIndex === -1 || index < nextIndex) {
      nextIndex = index;
    }
  }

  return nextIndex;
}

function parseSimpleFrontMatter(text) {
  const result = {};
  const lines = normalizeNewlines(text).split("\n");
  let currentArrayKey = null;
  let currentArray = null;

  const commitArray = () => {
    if (currentArrayKey) {
      result[currentArrayKey] = currentArray || [];
    }
    currentArrayKey = null;
    currentArray = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const arrayItemMatch = rawLine.match(/^\s*-\s+(.*)$/);
    if (currentArray && arrayItemMatch) {
      currentArray.push(parseFrontMatterScalar(arrayItemMatch[1]));
      continue;
    }

    if (currentArray) {
      commitArray();
    }

    const keyMatch = rawLine.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!keyMatch) {
      continue;
    }

    const key = keyMatch[1];
    const value = keyMatch[2] ?? "";

    if (value === "") {
      currentArrayKey = key;
      currentArray = [];
      continue;
    }

    result[key] = parseFrontMatterScalar(value);
  }

  commitArray();
  return result;
}

function parseFrontMatterScalar(value) {
  const trimmed = value.trim();

  if (!trimmed.length) {
    return "";
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return parseInlineArray(trimmed.slice(1, -1));
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (trimmed === "null") {
    return null;
  }

  const numericValue = Number(trimmed);
  if (!Number.isNaN(numericValue) && trimmed === String(numericValue)) {
    return numericValue;
  }

  return trimmed;
}

function parseInlineArray(value) {
  if (!value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => parseFrontMatterScalar(entry))
    .filter((entry) => entry !== "");
}

function sanitizeUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) {
    return "";
  }

  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
