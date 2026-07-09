/*
 * tableedit.js
 * In-place table editing for the Word Processor. When the caret is inside a
 * table cell, a small floating toolbar appears above the table with buttons to
 * insert/delete rows and columns. Edits dispatch an "input" event on the editor
 * so autosave and the live preview update automatically. Exposed as
 * window.TableEdit.
 */
(function () {
  "use strict";

  let editorEl = null;
  let bar = null;
  let currentCell = null;

  function init(el) {
    if (!el || editorEl) return;
    editorEl = el;
    bar = buildBar();
    document.body.appendChild(bar);

    document.addEventListener("selectionchange", onSelectionChange);
    // Keep the bar glued to the table as the editor scrolls / the window resizes.
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    // A mousedown on the bar must not blur the editor (that would lose the caret
    // and the cell we're acting on); click still fires normally.
    bar.addEventListener("mousedown", function (e) { e.preventDefault(); });
    bar.addEventListener("click", onBarClick);
  }

  function buildBar() {
    const el = document.createElement("div");
    el.className = "table-tools";
    el.setAttribute("role", "toolbar");
    el.setAttribute("aria-label", "Table editing");
    el.innerHTML =
      btn("rowAbove", "bi-arrow-bar-up", "Insert row above") +
      btn("rowBelow", "bi-arrow-bar-down", "Insert row below") +
      btn("colLeft", "bi-arrow-bar-left", "Insert column left") +
      btn("colRight", "bi-arrow-bar-right", "Insert column right") +
      '<span class="tt-sep"></span>' +
      btn("delRow", "bi-dash-square", "Delete row", "danger") +
      btn("delCol", "bi-x-square", "Delete column", "danger") +
      btn("delTable", "bi-trash3", "Delete table", "danger");
    return el;
  }
  function btn(act, icon, title, extra) {
    return '<button type="button" data-act="' + act + '" title="' + title + '" aria-label="' + title + '"' +
      (extra ? ' class="' + extra + '"' : "") + '><i class="bi ' + icon + '"></i></button>';
  }

  // ---- Caret / cell detection ------------------------------------------
  function cellFromSelection() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node = sel.anchorNode;
    if (!node || !editorEl.contains(node)) return null;
    while (node && node !== editorEl) {
      if (node.nodeType === 1 && (node.tagName === "TD" || node.tagName === "TH")) return node;
      node = node.parentNode;
    }
    return null;
  }

  function onSelectionChange() {
    const cell = cellFromSelection();
    currentCell = cell;
    if (cell) { bar.classList.add("show"); reposition(); }
    else bar.classList.remove("show");
  }

  function hide() { bar.classList.remove("show"); currentCell = null; }

  function reposition() {
    if (!currentCell || !bar.classList.contains("show")) return;
    const table = currentCell.closest("table");
    if (!table) { hide(); return; }
    const r = table.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) { bar.classList.remove("show"); return; }
    const barH = bar.offsetHeight || 34;
    // Default just BELOW the table — the space above a table is usually taken by
    // the section heading, so anchoring below avoids covering it. Flip above
    // only when the bar would drop off the bottom of the viewport.
    let top = r.bottom + 6;
    if (top + barH > window.innerHeight - 4) top = r.top - barH - 6;
    if (top < 4) top = 4;
    const left = Math.max(6, Math.min(r.left, window.innerWidth - bar.offsetWidth - 6));
    bar.style.top = Math.round(top) + "px";
    bar.style.left = Math.round(left) + "px";
  }

  // ---- Toolbar actions --------------------------------------------------
  function onBarClick(e) {
    const b = e.target.closest("button");
    if (!b || !currentCell) return;
    const table = currentCell.closest("table");
    if (!table) return;
    const act = b.getAttribute("data-act");
    if (ops[act]) ops[act](table, currentCell);
    editorEl.dispatchEvent(new Event("input", { bubbles: true })); // trigger autosave + preview
    reposition();
  }

  const ops = {
    rowAbove: (t, c) => insertRow(t, c, true),
    rowBelow: (t, c) => insertRow(t, c, false),
    colLeft: (t, c) => insertCol(t, c, true),
    colRight: (t, c) => insertCol(t, c, false),
    delRow: (t, c) => deleteRow(t, c),
    delCol: (t, c) => deleteCol(t, c),
    delTable: (t) => {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      t.replaceWith(p);
      hide();
      placeCaret(p);
    },
  };

  function colCount(table) {
    const hr = table.tHead && table.tHead.rows[0];
    if (hr) return hr.cells.length;
    return table.rows[0] ? table.rows[0].cells.length : 0;
  }
  function ensureBody(table) {
    let tb = table.tBodies[0];
    if (!tb) { tb = document.createElement("tbody"); table.appendChild(tb); }
    return tb;
  }

  function insertRow(table, cell, above) {
    const n = colCount(table);
    const tr = document.createElement("tr");
    for (let i = 0; i < n; i++) {
      const td = document.createElement("td");
      td.textContent = "Cell";
      tr.appendChild(td);
    }
    const row = cell.parentNode;
    if (row.parentNode.tagName === "THEAD") {
      // The single header row stays put; a new data row goes to the top of body.
      ensureBody(table).insertBefore(tr, ensureBody(table).firstChild);
    } else {
      row.parentNode.insertBefore(tr, above ? row : row.nextSibling);
    }
    placeCaret(tr.cells[Math.min(cell.cellIndex, n - 1)]);
  }

  function insertCol(table, cell, left) {
    const idx = cell.cellIndex + (left ? 0 : 1);
    Array.prototype.forEach.call(table.rows, function (row) {
      const isHead = row.parentNode.tagName === "THEAD" ||
        (row.cells[0] && row.cells[0].tagName === "TH");
      const c = document.createElement(isHead ? "th" : "td");
      c.textContent = isHead ? "Header" : "Cell";
      row.insertBefore(c, row.cells[idx] || null);
    });
    placeCaret(cell.parentNode.cells[Math.min(idx, colCount(table) - 1)]);
  }

  function deleteRow(table, cell) {
    const row = cell.parentNode;
    if (row.parentNode.tagName === "THEAD") return; // keep the header (Markdown needs one)
    const idx = cell.cellIndex;
    const near = row.nextElementSibling || row.previousElementSibling;
    row.remove();
    const target = (near && near.cells[Math.min(idx, near.cells.length - 1)]) ||
      (table.tHead && table.tHead.rows[0].cells[Math.min(idx, colCount(table) - 1)]);
    if (target) placeCaret(target); else hide();
  }

  function deleteCol(table, cell) {
    if (colCount(table) <= 1) return; // never remove the last column
    const idx = cell.cellIndex;
    Array.prototype.slice.call(table.rows).forEach(function (row) {
      if (row.cells[idx]) row.cells[idx].remove();
    });
    const hr = table.tHead && table.tHead.rows[0];
    if (hr) placeCaret(hr.cells[Math.min(idx, hr.cells.length - 1)]); else hide();
  }

  function placeCaret(node) {
    if (!node) return;
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  window.TableEdit = { init: init };
})();
