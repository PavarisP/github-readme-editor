/*
 * converter.js
 * Converts the editor's HTML (contenteditable DOM) into GitHub-Flavored
 * Markdown. Built on the battle-tested Turndown library (+ GFM plugin) for
 * robust handling of arbitrary/messy HTML (pasted Word/Docs content, nested
 * lists, mixed inline/block, odd whitespace), with custom rules that preserve
 * this app's Markdown/HTML conventions (alerts, math, task lists, aligned
 * blocks, data-md-src image paths, …). Exposed as window.HtmlToMarkdown.
 *
 * The previous hand-written converter is kept as converter.legacy.js.
 */
(function () {
  "use strict";

  // Render a URL for a Markdown link/image destination. Plain URLs are emitted
  // as-is; ones containing spaces or parentheses are wrapped in <...> so the
  // "(url)" form doesn't break (both this app and GitHub render the <...> form).
  function mdUrl(url) {
    return /[()\s]/.test(url) ? "<" + url.replace(/[<>]/g, "") + ">" : url;
  }

  // ---- Build the Turndown service (once) --------------------------------
  let service = null;

  function buildService() {
    const TS = window.TurndownService;
    if (!TS) return null;

    const s = new TS({
      headingStyle: "atx",
      hr: "---",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      fence: "```",
      emDelimiter: "*",
      strongDelimiter: "**",
      linkStyle: "inlined",
      br: "  ",
    });

    // GFM: strikethrough, tables, task-list checkbox inputs.
    if (window.turndownPluginGfm && window.turndownPluginGfm.gfm) {
      s.use(window.turndownPluginGfm.gfm);
    }

    // Protect $…$ / $$…$$ math spans from Turndown's text escaper, so a
    // subscript like $x_i$ isn't mangled into $x\_i$ (which would break KaTeX
    // on the way back). Math is emitted verbatim; everything else escapes as
    // usual. Only affects text that actually contains a $…$ pair.
    const nativeEscape = s.escape.bind(s);
    s.escape = function (str) {
      const spans = [];
      const stashed = str.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g, function (m) {
        spans.push(m);
        return "zZmathZz" + (spans.length - 1) + "zZ";
      });
      return nativeEscape(stashed).replace(/zZmathZz(\d+)zZ/g, function (_, i) {
        return spans[+i];
      });
    };

    // Keep raw HTML for constructs GitHub renders but Markdown can't express.
    s.keep(["picture", "sub", "sup", "kbd"]);

    // Strikethrough with the conventional double tilde (GFM plugin emits a
    // single ~, which is less widely supported).
    s.addRule("strikethrough", {
      filter: ["del", "s", "strike"],
      replacement: function (content) {
        return content ? "~~" + content + "~~" : "";
      },
    });

    // Table cells: escape literal pipes and flatten newlines, so a "|" or a
    // line break inside a cell doesn't shatter the table (the GFM plugin's
    // default cell does neither).
    s.addRule("tableCell", {
      filter: ["th", "td"],
      replacement: function (content, node) {
        // Encode literal pipes as &#124; — both GitHub and markdown-it render
        // that as "|" inside a cell without splitting it (a "\|" escape is not
        // understood by markdown-it's table parser and would drop cells).
        content = content.replace(/\|/g, "&#124;").replace(/\r?\n/g, " ").trim();
        const prefix = node.previousElementSibling ? " " : "| ";
        return prefix + content + " |";
      },
    });

    // Tighter list formatting than Turndown's default ("-   item" / 4-space
    // nesting): a single space after the marker and 2-space nested indent, so
    // the raw Markdown stays clean and diffs stay small.
    s.addRule("appListItem", {
      filter: "li",
      replacement: function (content, node, options) {
        content = content
          .replace(/^\n+/, "")
          .replace(/\n+$/, "\n")
          .replace(/\n/gm, "\n  ");
        let prefix = options.bulletListMarker + " ";
        const parent = node.parentNode;
        if (parent.nodeName === "OL") {
          const start = parent.getAttribute("start");
          const index = Array.prototype.indexOf.call(parent.children, node);
          prefix = (start ? Number(start) + index : index + 1) + ". ";
        }
        return prefix + content + (node.nextSibling && !/\n$/.test(content) ? "\n" : "");
      },
    });

    // Aligned blocks (<p align>, <div align>) — a very common README pattern for
    // centered logos, badge rows and back-to-top links. Keep them verbatim.
    s.addRule("alignedBlock", {
      filter: function (node) {
        return (node.nodeName === "P" || node.nodeName === "DIV") && node.getAttribute("align");
      },
      replacement: function (_content, node) {
        return "\n\n" + node.outerHTML.replace(/\s*\n\s*/g, " ").trim() + "\n\n";
      },
    });

    // Images: prefer data-md-src (the canonical repo-relative path; the live
    // src may be a blob: URL used only for local display). Encode tricky URLs.
    s.addRule("appImage", {
      filter: "img",
      replacement: function (_content, node) {
        const src = node.getAttribute("data-md-src") || node.getAttribute("src") || "";
        const alt = node.getAttribute("alt") || "";
        const title = node.getAttribute("title");
        const titlePart = title ? ' "' + title + '"' : "";
        return "![" + alt + "](" + mdUrl(src) + titlePart + ")";
      },
    });

    // Links: encode tricky URLs; fall back to the href as text when empty.
    s.addRule("appLink", {
      filter: function (node) {
        return node.nodeName === "A" && node.getAttribute("href");
      },
      replacement: function (content, node) {
        const href = node.getAttribute("href") || "";
        const title = node.getAttribute("title");
        const titlePart = title ? ' "' + title + '"' : "";
        const text = (content || "").trim() || href;
        return "[" + text + "](" + mdUrl(href) + titlePart + ")";
      },
    });

    // Inline math stored as <code data-math="inline">expr</code> -> $expr$.
    s.addRule("inlineMath", {
      filter: function (node) {
        return node.nodeName === "CODE" && node.getAttribute("data-math") === "inline";
      },
      replacement: function (_content, node) {
        return "$" + node.textContent + "$";
      },
    });

    // Block math stored as <pre data-math="block"><code>expr</code></pre>.
    s.addRule("blockMath", {
      filter: function (node) {
        return node.nodeName === "PRE" && node.getAttribute("data-math") === "block";
      },
      replacement: function (_content, node) {
        const code = node.querySelector("code") || node;
        return "\n\n$$\n" + code.textContent.replace(/\n$/, "") + "\n$$\n\n";
      },
    });

    // Fenced code blocks — read the language from the <code> class
    // (language-xxx), a <pre class="mermaid"> marker, or the pre's data-lang.
    s.addRule("appCodeBlock", {
      filter: function (node) {
        return node.nodeName === "PRE" && !node.getAttribute("data-math");
      },
      replacement: function (_content, node) {
        const codeEl = node.querySelector("code") || node;
        let lang = "";
        const cls = (codeEl.getAttribute && codeEl.getAttribute("class")) || "";
        const m = cls.match(/language-([\w-]+)/);
        if (m) lang = m[1];
        const preCls = node.getAttribute("class") || "";
        if (!lang && /\bmermaid\b/.test(preCls)) lang = "mermaid";
        if (!lang && node.getAttribute("data-lang")) lang = node.getAttribute("data-lang");
        const code = codeEl.textContent.replace(/\n$/, "");
        const longest = (code.match(/`+/g) || []).reduce((a, b) => Math.max(a, b.length), 0);
        const fence = "`".repeat(Math.max(3, longest + 1));
        return "\n\n" + fence + lang + "\n" + code + "\n" + fence + "\n\n";
      },
    });

    // Alert callouts stored as <blockquote data-alert="NOTE">…</blockquote>.
    s.addRule("alertBlockquote", {
      filter: function (node) {
        return node.nodeName === "BLOCKQUOTE" && node.getAttribute("data-alert");
      },
      replacement: function (content, node) {
        const type = node.getAttribute("data-alert").toUpperCase();
        const inner = content.replace(/^\n+|\n+$/g, "");
        const body = inner
          .split("\n")
          .map(function (l) { return l ? "> " + l : ">"; })
          .join("\n");
        return "\n\n> [!" + type + "]\n" + body + "\n\n";
      },
    });

    // Alert callouts rendered for preview as <div class="markdown-alert
    // markdown-alert-note">… — recognised too, so alerts survive a
    // raw → Word-Processor → raw round-trip (not just the blockquote form).
    s.addRule("alertDiv", {
      filter: function (node) {
        return node.nodeName === "DIV" && /\bmarkdown-alert-(\w+)/.test(node.className || "");
      },
      replacement: function (_content, node) {
        const type = node.className.match(/markdown-alert-(\w+)/)[1].toUpperCase();
        const tmp = node.ownerDocument.createElement("div");
        Array.prototype.forEach.call(node.childNodes, function (c) {
          if (c.nodeType === 1 && c.classList && c.classList.contains("markdown-alert-title")) return;
          tmp.appendChild(c.cloneNode(true));
        });
        const body = s.turndown(tmp).replace(/^\n+|\n+$/g, "");
        const quoted = body
          .split("\n")
          .map(function (l) { return l ? "> " + l : ">"; })
          .join("\n");
        return "\n\n> [!" + type + "]\n" + quoted + "\n\n";
      },
    });

    // <details><summary>…</summary>…</details> — emit with the blank lines
    // GitHub needs so the body Markdown inside still renders. The body is
    // converted recursively so its Markdown formatting is preserved.
    s.addRule("appDetails", {
      filter: "details",
      replacement: function (_content, node) {
        const summaryEl = node.querySelector("summary");
        const summary = summaryEl ? summaryEl.textContent.trim() : "Details";
        const tmp = node.ownerDocument.createElement("div");
        Array.prototype.forEach.call(node.childNodes, function (c) {
          if (!(c.nodeType === 1 && c.nodeName === "SUMMARY")) tmp.appendChild(c.cloneNode(true));
        });
        const body = s.turndown(tmp).trim();
        return "\n\n<details>\n<summary>" + summary + "</summary>\n\n" + body + "\n\n</details>\n\n";
      },
    });

    return s;
  }

  function getService() {
    if (!service) service = buildService();
    return service;
  }

  // ---- Pre-processing ---------------------------------------------------
  // Normalise this app's task-list markup (<ul data-type="task"> /
  // <li data-checked="…">) into the checkbox-input form the GFM plugin
  // understands, so task items convert to "- [x] / - [ ]".
  function normalizeTaskLists(root) {
    const doc = root.ownerDocument;
    Array.prototype.forEach.call(root.querySelectorAll("li"), function (li) {
      const parent = li.parentNode;
      const isTaskList = parent && parent.getAttribute && parent.getAttribute("data-type") === "task";
      const hasChecked = li.getAttribute("data-checked") !== null;
      if (!isTaskList && !hasChecked) return;
      if (li.querySelector('input[type="checkbox"]')) return; // already has one

      const checked =
        li.getAttribute("data-checked") === "true" || li.getAttribute("data-checked") === "";
      if (li.firstChild && li.firstChild.nodeType === 3) {
        li.firstChild.nodeValue = li.firstChild.nodeValue.replace(/^\s*\[[ xX]\]\s*/, "");
      }
      const input = doc.createElement("input");
      input.setAttribute("type", "checkbox");
      if (checked) input.setAttribute("checked", "");
      li.insertBefore(input, li.firstChild);
    });
  }

  // ---- Public entry -----------------------------------------------------
  function convert(rootEl) {
    const s = getService();

    // Work on a clone so we never mutate the live editor.
    const clone = rootEl.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll("[contenteditable]"), function (n) {
      n.removeAttribute("contenteditable");
    });

    // No Turndown available (offline + CDN blocked and vendor missing): fall
    // back to the legacy converter so the app still works.
    if (!s) {
      if (window.HtmlToMarkdownLegacy) return window.HtmlToMarkdownLegacy.convert(rootEl);
      return (clone.textContent || "").trim() + "\n";
    }

    normalizeTaskLists(clone);

    let md = s.turndown(clone);

    // Tidy: collapse 3+ newlines, trim trailing spaces on lines, normalise the
    // spacing after a task-list checkbox to a single space, single EOF NL.
    md = md
      .replace(/[ \t]+\n/g, "\n")
      .replace(/^([ \t]*[-*+] \[[ xX]\])[ \t]+/gm, "$1 ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return md + "\n";
  }

  window.HtmlToMarkdown = { convert: convert };
})();
