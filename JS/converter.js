/*
 * converter.js
 * Converts the editor's HTML (contenteditable DOM) into GitHub-Flavored Markdown.
 * Pure, dependency-free DOM walker. Exposed as window.HtmlToMarkdown.
 */
(function () {
  "use strict";

  // Escape characters that would otherwise break inline markdown.
  function escapeInline(text) {
    return text.replace(/([\\`*_\[\]<>])/g, "\\$1");
  }

  // Collapse whitespace the way HTML rendering would (but keep single spaces).
  function normalizeSpace(text) {
    return text.replace(/\s+/g, " ");
  }

  // Render a URL for a Markdown link/image destination. Plain URLs are emitted
  // as-is; ones containing spaces or parentheses are wrapped in <...> so the
  // "(url)" form doesn't break (both this app and GitHub render the <...> form).
  function mdUrl(url) {
    return /[()\s]/.test(url) ? "<" + url.replace(/[<>]/g, "") + ">" : url;
  }

  // ---- Inline rendering -------------------------------------------------
  // Renders inline content of a node into a markdown string (no block breaks).
  function renderInline(node) {
    let out = "";
    node.childNodes.forEach(function (child) {
      out += renderInlineNode(child);
    });
    return out;
  }

  function renderInlineNode(node) {
    if (node.nodeType === 3) {
      // text node
      return escapeInline(normalizeSpace(node.nodeValue));
    }
    if (node.nodeType !== 1) return "";

    const tag = node.tagName;
    switch (tag) {
      case "BR":
        return "  \n"; // hard line break
      case "STRONG":
      case "B": {
        const inner = renderInline(node).trim();
        return inner ? "**" + inner + "**" : "";
      }
      case "EM":
      case "I": {
        const inner = renderInline(node).trim();
        return inner ? "*" + inner + "*" : "";
      }
      case "DEL":
      case "S":
      case "STRIKE": {
        const inner = renderInline(node).trim();
        return inner ? "~~" + inner + "~~" : "";
      }
      case "SUB":
        return "<sub>" + renderInline(node) + "</sub>";
      case "SUP":
        return "<sup>" + renderInline(node) + "</sup>";
      case "CODE": {
        // Inline math is stored as <code data-math="inline">expr</code>.
        if (node.getAttribute && node.getAttribute("data-math") === "inline") {
          return "$" + node.textContent + "$";
        }
        // inline code — do not escape inside
        const text = node.textContent;
        // Choose a fence of backticks longer than any run inside.
        const longest = (text.match(/`+/g) || []).reduce(
          (m, s) => Math.max(m, s.length),
          0
        );
        const fence = "`".repeat(longest + 1);
        const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
        return fence + pad + text + pad + fence;
      }
      case "A": {
        const href = node.getAttribute("href") || "";
        const inner = renderInline(node).trim() || href;
        const title = node.getAttribute("title");
        const titlePart = title ? ' "' + title + '"' : "";
        if (!href) return inner;
        return "[" + inner + "](" + mdUrl(href) + titlePart + ")";
      }
      case "IMG": {
        // Prefer data-md-src: the canonical repo-relative path. The live src may
        // be a blob: URL used only to display the image locally (see app.js).
        const src = node.getAttribute("data-md-src") || node.getAttribute("src") || "";
        const alt = node.getAttribute("alt") || "";
        const title = node.getAttribute("title");
        const titlePart = title ? ' "' + title + '"' : "";
        return "![" + alt + "](" + mdUrl(src) + titlePart + ")";
      }
      case "SPAN":
      case "FONT":
        return renderInline(node);
      default:
        // Unknown inline-ish element: render its children.
        return renderInline(node);
    }
  }

  // ---- Block rendering --------------------------------------------------
  function renderChildrenBlocks(node, indent) {
    const blocks = [];
    node.childNodes.forEach(function (child) {
      const rendered = renderBlockNode(child, indent);
      if (rendered !== null && rendered !== "") blocks.push(rendered);
    });
    return blocks;
  }

  function renderBlockNode(node, indent) {
    indent = indent || "";

    // Text node directly in a block container -> treat as paragraph text.
    if (node.nodeType === 3) {
      const text = escapeInline(normalizeSpace(node.nodeValue));
      return text.trim() ? text.trim() : null;
    }
    if (node.nodeType !== 1) return null;

    const tag = node.tagName;

    switch (tag) {
      case "H1":
      case "H2":
      case "H3":
      case "H4":
      case "H5":
      case "H6": {
        const level = parseInt(tag.charAt(1), 10);
        const text = renderInline(node).trim();
        return "#".repeat(level) + " " + text;
      }

      case "P":
      case "DIV": {
        // Aligned blocks (e.g. <p align="center">) are kept as raw HTML so the
        // alignment survives — a very common README pattern for centered logos,
        // badge rows and back-to-top links.
        const align = node.getAttribute && node.getAttribute("align");
        if (align) return node.outerHTML.replace(/\n+/g, " ");
        const text = renderInline(node).trim();
        return text ? text : null;
      }

      case "BR":
        return null;

      case "HR":
        return "---";

      case "PICTURE":
        // GitHub supports raw HTML; emit the <picture> block as-is.
        return node.outerHTML.replace(/\n+/g, "");

      case "DETAILS": {
        const summaryEl = node.querySelector("summary");
        const summary = summaryEl ? renderInline(summaryEl).trim() : "Details";
        const tmp = node.ownerDocument.createElement("div");
        node.childNodes.forEach(function (c) {
          if (!(c.nodeType === 1 && c.tagName === "SUMMARY")) tmp.appendChild(c.cloneNode(true));
        });
        const content = renderChildrenBlocks(tmp, "").join("\n\n");
        return "<details>\n<summary>" + summary + "</summary>\n\n" + content + "\n\n</details>";
      }

      case "BLOCKQUOTE": {
        const inner = renderChildrenBlocks(node, "").join("\n\n");
        let lines = inner.split("\n").map((l) => (l ? "> " + l : ">"));
        // Alert callouts are stored as <blockquote data-alert="NOTE">…</blockquote>.
        const alert = node.getAttribute && node.getAttribute("data-alert");
        if (alert) lines = ["> [!" + alert.toUpperCase() + "]"].concat(lines);
        return lines.join("\n");
      }

      case "PRE": {
        // Block math is stored as <pre data-math="block"><code>expr</code></pre>.
        if (node.getAttribute && node.getAttribute("data-math") === "block") {
          const expr = (node.querySelector("code") || node).textContent.replace(/\n$/, "");
          return "$$\n" + expr + "\n$$";
        }
        // Code block. Look for a <code> child to read a language class.
        const codeEl = node.querySelector("code") || node;
        let lang = "";
        const cls = codeEl.getAttribute && codeEl.getAttribute("class");
        if (cls) {
          const m = cls.match(/language-([\w-]+)/);
          if (m) lang = m[1];
        }
        const dataLang = node.getAttribute && node.getAttribute("data-lang");
        if (!lang && dataLang) lang = dataLang;
        const code = codeEl.textContent.replace(/\n$/, "");
        // fence longer than any backtick run inside
        const longest = (code.match(/`+/g) || []).reduce(
          (m, s) => Math.max(m, s.length),
          0
        );
        const fence = "`".repeat(Math.max(3, longest + 1));
        return fence + lang + "\n" + code + "\n" + fence;
      }

      case "UL":
      case "OL":
        return renderList(node, indent);

      case "TABLE":
        return renderTable(node);

      default: {
        // An inline element sitting directly at block level (e.g. a bare
        // <img> badge, an <a>, or inline math <code>). Render the element
        // itself, not just its children.
        const inline = renderInlineNode(node).trim();
        return inline ? inline : null;
      }
    }
  }

  function renderList(listNode, indent) {
    const ordered = listNode.tagName === "OL";
    const isTask = listNode.getAttribute("data-type") === "task";
    const items = [];
    let index = 1;

    Array.prototype.forEach.call(listNode.children, function (li) {
      if (li.tagName !== "LI") return;

      // Separate nested lists from the item's own inline content.
      let inlineParts = "";
      const nested = [];
      li.childNodes.forEach(function (child) {
        if (child.nodeType === 1 && (child.tagName === "UL" || child.tagName === "OL")) {
          nested.push(child);
        } else {
          inlineParts += renderInlineNode(child);
        }
      });

      let marker = ordered ? index + "." : "-";
      let line = inlineParts.trim();

      // Task list support (checkbox)
      if (isTask || li.getAttribute("data-checked") !== null) {
        const checked =
          li.getAttribute("data-checked") === "true" ||
          (li.querySelector('input[type="checkbox"]') || {}).checked;
        marker = "- [" + (checked ? "x" : " ") + "]";
        // strip a leading checkbox char if present
        line = line.replace(/^\[[ xX]\]\s*/, "");
      }

      let itemText = indent + marker + " " + line;

      // Render nested lists with deeper indent.
      nested.forEach(function (nl) {
        const childIndent = indent + "  ";
        itemText += "\n" + renderList(nl, childIndent);
      });

      items.push(itemText);
      index++;
    });

    return items.join("\n");
  }

  function renderTable(tableNode) {
    const rows = [];
    const trs = tableNode.querySelectorAll("tr");
    if (!trs.length) return "";

    let headerCells = null;
    const bodyRows = [];

    trs.forEach(function (tr, i) {
      const cells = Array.prototype.map.call(
        tr.querySelectorAll("th,td"),
        function (cell) {
          return renderInline(cell).trim().replace(/\|/g, "\\|").replace(/\n/g, " ");
        }
      );
      const hasTh = tr.querySelector("th");
      if (i === 0 || (hasTh && headerCells === null)) {
        if (headerCells === null) {
          headerCells = cells;
          return;
        }
      }
      bodyRows.push(cells);
    });

    if (!headerCells) {
      // No header row detected; synthesize an empty header.
      const colCount = bodyRows.length ? bodyRows[0].length : 0;
      headerCells = new Array(colCount).fill(" ");
    }

    const colCount = headerCells.length;
    const pad = (cells) => {
      const c = cells.slice();
      while (c.length < colCount) c.push("");
      return c.slice(0, colCount);
    };

    rows.push("| " + pad(headerCells).join(" | ") + " |");
    rows.push("| " + new Array(colCount).fill("---").join(" | ") + " |");
    bodyRows.forEach(function (r) {
      rows.push("| " + pad(r).join(" | ") + " |");
    });

    return rows.join("\n");
  }

  // ---- Public entry -----------------------------------------------------
  function convert(rootEl) {
    // Work on a clone so we never mutate the live editor.
    const clone = rootEl.cloneNode(true);

    // Strip editor-only cruft.
    clone.querySelectorAll("[contenteditable]").forEach(function (n) {
      n.removeAttribute("contenteditable");
    });

    const blocks = renderChildrenBlocks(clone, "");
    let md = blocks.join("\n\n");

    // Tidy: collapse 3+ newlines, trim trailing spaces on lines, ensure single EOF newline.
    md = md
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return md + "\n";
  }

  window.HtmlToMarkdown = { convert: convert };
})();
