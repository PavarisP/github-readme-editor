/*
 * editor.js
 * WYSIWYG behaviour for the contenteditable surface: toolbar commands,
 * selection handling and custom insertions (code block, table, link, image).
 * Exposed as window.Editor.
 */
(function () {
  "use strict";

  const escapeHtml = window.Util.escapeHtml;

  let editorEl = null;
  let savedRange = null;
  let initialized = false;

  function init(el) {
    editorEl = el;
    if (initialized) return; // listeners are bound once for the lifetime of the editor
    initialized = true;

    // Use CSS <strong>/<em> instead of <b>/<i> for cleaner markup where possible.
    try {
      document.execCommand("styleWithCSS", false, false);
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch (e) {
      /* not all browsers support these — safe to ignore */
    }

    // Keep track of the last selection inside the editor (needed for modals).
    document.addEventListener("selectionchange", function () {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editorEl.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    });

    // Clean up content pasted from Word / Google Docs / RTF so it converts to
    // tidy Markdown instead of carrying over mso styles, spans and classes.
    editorEl.addEventListener("paste", handlePaste);
  }

  // ---- Paste sanitising (Word / Google Docs / RTF-as-HTML) --------------
  // These editors put rich HTML on the clipboard; we keep only semantic tags.
  const KEEP_TAGS = new Set([
    "P", "BR", "H1", "H2", "H3", "H4", "H5", "H6",
    "STRONG", "B", "EM", "I", "U", "DEL", "S", "STRIKE", "CODE", "PRE",
    "BLOCKQUOTE", "UL", "OL", "LI", "A", "IMG",
    "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "HR", "SPAN", "DIV",
  ]);
  const DROP_TAGS = new Set(["STYLE", "SCRIPT", "META", "LINK", "TITLE", "HEAD", "XML"]);
  const KEEP_ATTRS = { A: ["href", "title"], IMG: ["src", "alt", "title", "data-md-src"] };

  function handlePaste(e) {
    const cb = e.clipboardData || window.clipboardData;
    if (!cb) return;
    const html = cb.getData("text/html");
    if (!html) return; // let the browser handle plain-text pastes normally
    e.preventDefault();
    document.execCommand("insertHTML", false, sanitizePastedHtml(html));
  }

  function sanitizePastedHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    sanitizeChildren(doc.body);
    return doc.body.innerHTML;
  }

  function sanitizeChildren(parent) {
    Array.prototype.slice.call(parent.childNodes).forEach(function (node) {
      if (node.nodeType === 8) { node.remove(); return; }       // comment
      if (node.nodeType !== 1) return;                          // keep text nodes
      const tag = node.tagName.toUpperCase();
      if (DROP_TAGS.has(tag) || tag.indexOf(":") !== -1) { node.remove(); return; }

      sanitizeChildren(node); // depth-first so unwrapping preserves inner content

      if (!KEEP_TAGS.has(tag)) { unwrap(node); return; }

      const allowed = KEEP_ATTRS[tag] || [];
      Array.prototype.slice.call(node.attributes).forEach(function (attr) {
        if (allowed.indexOf(attr.name.toLowerCase()) === -1) node.removeAttribute(attr.name);
      });
    });
  }

  function unwrap(node) {
    const parent = node.parentNode;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  }

  function focusEditor() {
    editorEl.focus();
    restoreSelection();
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorEl.contains(sel.anchorNode)) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  }

  function getSelectedText() {
    const sel = window.getSelection();
    return sel && sel.rangeCount ? sel.toString() : "";
  }

  // Insert an HTML fragment at the current caret position.
  function insertHtml(html) {
    focusEditor();
    document.execCommand("insertHTML", false, html);
  }

  // ---- Command dispatch -------------------------------------------------
  function exec(cmd, value) {
    focusEditor();
    switch (cmd) {
      case "bold":
      case "italic":
      case "strikeThrough":
      case "insertUnorderedList":
      case "insertOrderedList":
      case "removeFormat":
      case "undo":
      case "redo":
        document.execCommand(cmd, false, null);
        break;

      case "formatBlock":
        document.execCommand("formatBlock", false, value);
        break;

      case "inlineCode":
        wrapInlineCode();
        break;

      case "blockquote":
        document.execCommand("formatBlock", false, "blockquote");
        break;

      case "codeBlock":
        insertCodeBlock();
        break;

      case "hr":
        insertHtml("<hr>");
        break;

      case "taskList":
        insertTaskList();
        break;

      default:
        console.warn("Unknown command:", cmd);
    }
    editorEl.focus();
  }

  function wrapInlineCode() {
    const text = getSelectedText();
    if (text) {
      insertHtml("<code>" + escapeHtml(text) + "</code>");
    } else {
      insertHtml("<code>code</code>");
    }
  }

  function insertCodeBlock() {
    const text = getSelectedText() || "// your code here";
    const html =
      '<pre data-lang=""><code>' + escapeHtml(text) + "</code></pre><p><br></p>";
    insertHtml(html);
  }

  function insertTaskList() {
    const html =
      '<ul data-type="task">' +
      '<li data-checked="false">To do item</li>' +
      '<li data-checked="true">Completed item</li>' +
      "</ul><p><br></p>";
    insertHtml(html);
  }

  // Report which inline states are currently active (for toolbar highlighting).
  function queryState() {
    const states = {};
    ["bold", "italic", "strikeThrough", "insertUnorderedList", "insertOrderedList"].forEach(
      function (c) {
        try {
          states[c] = document.queryCommandState(c);
        } catch (e) {
          states[c] = false;
        }
      }
    );
    // Current block tag
    let block = "p";
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode;
      while (node && node !== editorEl) {
        if (node.nodeType === 1 && /^(H[1-6]|P|BLOCKQUOTE|PRE)$/.test(node.tagName)) {
          block = node.tagName.toLowerCase();
          break;
        }
        node = node.parentNode;
      }
    }
    states.block = block;
    return states;
  }

  window.Editor = {
    init: init,
    exec: exec,
    saveSelection: saveSelection,
    restoreSelection: restoreSelection,
    getSelectedText: getSelectedText,
    insert: function (html) { insertHtml(html); },
    queryState: queryState,
    getElement: function () { return editorEl; },
    getHtml: function () { return editorEl ? editorEl.innerHTML : ""; },
    setHtml: function (html) { if (editorEl) editorEl.innerHTML = html; },
    // Clean arbitrary HTML (e.g. an imported .html file) the same way pasted
    // content is cleaned, so it converts to tidy Markdown.
    sanitizeHtml: sanitizePastedHtml,
  };
})();
