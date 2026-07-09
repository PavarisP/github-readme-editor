/*
 * app.js
 * Wires the UI together: theme, folder picking, project persistence,
 * file tree, toolbar, preview and saving.
 * Depends on Store, Workspace, Editor, HtmlToMarkdown, MarkdownToHtml.
 */
(function () {
  "use strict";

  // ---- Element handles --------------------------------------------------
  const el = {
    welcomeScreen: document.getElementById("welcomeScreen"),
    editorScreen: document.getElementById("editorScreen"),
    browseBtn: document.getElementById("browseBtn"),
    browseHint: document.getElementById("browseHint"),
    fallbackInput: document.getElementById("fallbackInput"),
    refreshFilesBtn: document.getElementById("refreshFilesBtn"),
    newProjectBtn: document.getElementById("newProjectBtn"),

    aboutBtn: document.getElementById("aboutBtn"),
    themeToggle: document.getElementById("themeToggle"),
    workspaceLabel: document.getElementById("workspaceLabel"),
    workspaceName: document.getElementById("workspaceName"),
    importBtn: document.getElementById("importBtn"),
    importInput: document.getElementById("importInput"),
    previewBtn: document.getElementById("previewBtn"),
    saveBtn: document.getElementById("saveBtn"),
    saveHtmlBtn: document.getElementById("saveHtmlBtn"),

    projectList: document.getElementById("projectList"),
    recentProjectsWrap: document.getElementById("recentProjectsWrap"),
    recentProjectsList: document.getElementById("recentProjectsList"),

    fileTree: document.getElementById("fileTree"),
    fileSearch: document.getElementById("fileSearch"),

    editor: document.getElementById("editor"),
    rawEditor: document.getElementById("rawEditor"),
    tabWysiwyg: document.getElementById("tabWysiwyg"),
    tabRaw: document.getElementById("tabRaw"),
    editorBody: document.querySelector(".editor-body"),
    livePreviewPane: document.getElementById("livePreviewPane"),
    splitPreviewBtn: document.getElementById("splitPreviewBtn"),
    toolbar: document.getElementById("toolbar"),
    blockFormat: document.getElementById("blockFormat"),

    previewRendered: document.getElementById("previewRendered"),
    previewSource: document.getElementById("previewSource").querySelector("code"),
    copyMdBtn: document.getElementById("copyMdBtn"),
    saveFromPreviewBtn: document.getElementById("saveFromPreviewBtn"),

    insertUrl: document.getElementById("insertUrl"),
    insertText: document.getElementById("insertText"),
    insertConfirmBtn: document.getElementById("insertConfirmBtn"),
    insertModalTitle: document.getElementById("insertModalTitle"),
    insertUrlLabel: document.getElementById("insertUrlLabel"),
    insertTextLabel: document.getElementById("insertTextLabel"),
    srcRepo: document.getElementById("srcRepo"),
    srcUrl: document.getElementById("srcUrl"),
    srcUrlLabelText: document.getElementById("srcUrlLabelText"),
    insertRepoPane: document.getElementById("insertRepoPane"),
    insertUrlPane: document.getElementById("insertUrlPane"),
    insertRepoSearch: document.getElementById("insertRepoSearch"),
    insertRepoList: document.getElementById("insertRepoList"),
    insertRepoSelected: document.getElementById("insertRepoSelected"),

    loadingOverlay: document.getElementById("loadingOverlay"),
    loadingText: document.getElementById("loadingText"),

    toast: document.getElementById("appToast"),
    toastBody: document.getElementById("toastBody"),

    // GitHub widgets / tools
    insertToolMenu: document.getElementById("insertToolMenu"),
    toolsMenuWrap: document.getElementById("toolsMenuWrap"),
    toolForm: document.getElementById("toolForm"),
    toolPreview: document.getElementById("toolPreview"),
    toolModalTitle: document.getElementById("toolModalTitle"),
    tableModal: document.getElementById("tableModal"),
    tableRows: document.getElementById("tableRows"),
    tableCols: document.getElementById("tableCols"),
    tablePreview: document.getElementById("tablePreview"),
    tableInsertBtn: document.getElementById("tableInsertBtn"),
    toolInsertBtn: document.getElementById("toolInsertBtn"),

    emojiSearch: document.getElementById("emojiSearch"),
    emojiGrid: document.getElementById("emojiGrid"),

    templatesBtn: document.getElementById("templatesBtn"),
    templateList: document.getElementById("templateList"),
    templatePreview: document.getElementById("templatePreview"),
    templateUseBtn: document.getElementById("templateUseBtn"),

    linkCheckBtn: document.getElementById("linkCheckBtn"),
    healthBtn: document.getElementById("healthBtn"),
    licenseBtn: document.getElementById("licenseBtn"),
    loadReadmeBtn: document.getElementById("loadReadmeBtn"),
    clearEditorBtn: document.getElementById("clearEditorBtn"),
    clearEditorBarBtn: document.getElementById("clearEditorBarBtn"),
    linkCheckReport: document.getElementById("linkCheckReport"),

    healthList: document.getElementById("healthList"),
    hfProject: document.getElementById("hfProject"),
    hfAuthor: document.getElementById("hfAuthor"),
    hfYear: document.getElementById("hfYear"),
    hfEmail: document.getElementById("hfEmail"),
    hfGithub: document.getElementById("hfGithub"),
    healthCreateBtn: document.getElementById("healthCreateBtn"),

    licenseSelect: document.getElementById("licenseSelect"),
    licenseAuthor: document.getElementById("licenseAuthor"),
    licenseYear: document.getElementById("licenseYear"),
    licenseCreateBtn: document.getElementById("licenseCreateBtn"),

    publishBtn: document.getElementById("publishBtn"),
    ghHelpBtn: document.getElementById("ghHelpBtn"),
    ghConnectPane: document.getElementById("ghConnectPane"),
    ghPublishPane: document.getElementById("ghPublishPane"),
    ghToken: document.getElementById("ghToken"),
    ghRemember: document.getElementById("ghRemember"),
    ghConnectBtn: document.getElementById("ghConnectBtn"),
    ghDisconnectBtn: document.getElementById("ghDisconnectBtn"),
    ghUserLogin: document.getElementById("ghUserLogin"),
    ghRepo: document.getElementById("ghRepo"),
    ghRepoList: document.getElementById("ghRepoList"),
    ghRepoHint: document.getElementById("ghRepoHint"),
    ghFileList: document.getElementById("ghFileList"),
    ghdProject: document.getElementById("ghdProject"),
    ghdAuthor: document.getElementById("ghdAuthor"),
    ghdYear: document.getElementById("ghdYear"),
    ghdEmail: document.getElementById("ghdEmail"),
    ghdGithub: document.getElementById("ghdGithub"),
    ghBranch: document.getElementById("ghBranch"),
    ghMessage: document.getElementById("ghMessage"),
    ghPublishStatus: document.getElementById("ghPublishStatus"),
    ghPublishBtn: document.getElementById("ghPublishBtn"),
  };

  const escapeHtml = window.Util.escapeHtml;

  const previewModal = new bootstrap.Modal(document.getElementById("previewModal"));
  const insertModal = new bootstrap.Modal(document.getElementById("insertModal"));
  const toolModal = new bootstrap.Modal(document.getElementById("toolModal"));
  const emojiModal = new bootstrap.Modal(document.getElementById("emojiModal"));
  const templatesModal = new bootstrap.Modal(document.getElementById("templatesModal"));
  const healthModal = new bootstrap.Modal(document.getElementById("healthModal"));
  const licenseModal = new bootstrap.Modal(document.getElementById("licenseModal"));
  const linkCheckModal = new bootstrap.Modal(document.getElementById("linkCheckModal"));
  const publishModal = new bootstrap.Modal(document.getElementById("publishModal"));
  const ghHelpModal = new bootstrap.Modal(document.getElementById("ghHelpModal"));
  const aboutModal = new bootstrap.Modal(document.getElementById("aboutModal"));

  // Starter content used for brand-new projects.
  const DEFAULT_CONTENT = el.editor.innerHTML;

  let insertMode = "link"; // 'link' | 'image'
  let selectedRepoPath = null; // path chosen in the in-modal repo browser
  let currentProjectId = null;
  let activeTab = "wysiwyg";   // "wysiwyg" (Word Processor) | "raw" (Raw Markdown)
  let livePreviewOn = false;   // live side-by-side rendered preview
  const projectStatus = {}; // id -> 'ok' | 'missing' | 'reconnect'  (transient, not persisted)

  // ---- Toast / loading helpers -----------------------------------------
  function toast(msg, delay) {
    el.toastBody.innerHTML = msg;
    bootstrap.Toast.getOrCreateInstance(el.toast, { delay: delay || 3500 }).show();
  }
  function showLoading(text) {
    el.loadingText.textContent = text || "Loading…";
    el.loadingOverlay.classList.remove("d-none");
  }
  function hideLoading() {
    el.loadingOverlay.classList.add("d-none");
  }

  // ---- Theme ------------------------------------------------------------
  function initTheme() {
    let theme = Store.getTheme();
    if (!theme) {
      theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark" : "light";
    }
    applyTheme(theme);
    el.themeToggle.addEventListener("click", function () {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      Store.setTheme(next);
    });
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const icon = el.themeToggle.querySelector("i");
    icon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
  }

  // ---- Folder picking / project creation --------------------------------
  el.browseBtn.addEventListener("click", pickNewWorkspace);
  el.newProjectBtn.addEventListener("click", pickNewWorkspace);
  el.refreshFilesBtn.addEventListener("click", pickNewWorkspace);

  // ---- About ------------------------------------------------------------
  el.aboutBtn.addEventListener("click", function () { aboutModal.show(); });

  async function pickNewWorkspace() {
    if (Workspace.state.supportsFS) {
      try {
        const res = await Workspace.pickDirectory();
        await onFolderChosen(res.handle, res.name, res.tree, "fs");
      } catch (err) {
        if (err && err.name === "AbortError") return; // user cancelled
        console.error(err);
        toast("Could not open folder.");
      }
    } else {
      el.fallbackInput.click();
    }
  }

  el.fallbackInput.addEventListener("change", async function () {
    if (!this.files || !this.files.length) return;
    const tree = Workspace.buildTreeFromFileList(this.files);
    await onFolderChosen(null, Workspace.state.name, tree, "fallback");
    this.value = "";
  });

  // A folder was chosen: reuse an existing project record if it's the same
  // folder, otherwise create a new one.
  async function onFolderChosen(handle, name, tree, kind) {
    let record = await Store.findByHandle(handle, name);
    if (!record) {
      record = {
        id: Store.newId(),
        name: name,
        kind: kind,
        handle: handle || null,
        contentHtml: DEFAULT_CONTENT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await Store.putProject(record);
    } else {
      // Refresh the (possibly re-picked) handle.
      record.handle = handle || record.handle;
      record.updatedAt = Date.now();
      await Store.putProject(record);
    }
    projectStatus[record.id] = "ok";
    enterEditor(record, tree);
  }

  // ---- Opening an existing (stored) project -----------------------------
  async function openProject(id) {
    const record = await Store.getProject(id);
    if (!record) { toast("Project not found."); return; }

    // Fallback-mode project (no handle): we can only restore content.
    if (!record.handle) {
      enterEditor(record, Workspace.state.tree || null);
      if (record.kind === "fallback") {
        renderTree(null);
        toast("Content restored. Click <i class='bi bi-arrow-repeat'></i> to re-open the folder and list its files.", 5000);
      }
      return;
    }

    showLoading("Opening “" + record.name + "”…");
    try {
      const res = await Workspace.openFromHandle(record.handle);
      projectStatus[id] = "ok";
      record.updatedAt = Date.now();
      await Store.putProject(record);
      enterEditor(record, res.tree);
    } catch (err) {
      projectStatus[id] = err.code === "missing" ? "missing" : "reconnect";
      await refreshProjectLists();
      notifyPathProblem(record, err);
    } finally {
      hideLoading();
    }
  }

  // ---- Enter editor with a project --------------------------------------
  function enterEditor(record, tree) {
    currentProjectId = record.id;
    el.welcomeScreen.classList.add("d-none");
    el.editorScreen.classList.remove("d-none");
    el.workspaceLabel.classList.remove("d-none");
    el.importBtn.classList.remove("d-none");
    el.toolsMenuWrap.classList.remove("d-none");
    el.previewBtn.classList.remove("d-none");
    el.saveBtn.classList.remove("d-none");
    el.workspaceName.textContent = record.name || "workspace";

    Editor.init(el.editor);
    loadDocumentHtml(record.contentHtml || DEFAULT_CONTENT);
    if (tree) renderTree(tree); else renderTree(Workspace.state.tree);
    el.editor.focus();
    refreshProjectLists();
    toast("Opened <strong>" + escapeHtml(record.name) + "</strong>");

    // If the repo already has a README, let the user pull it in.
    if (findReadme(tree || Workspace.state.tree)) {
      setTimeout(function () {
        toast("Found a <strong>README.md</strong> here — use <em>Tools → Load existing README.md</em> to edit it.", 6000);
      }, 900);
    }
  }

  // ---- Autosave editor content into the current project -----------------
  async function saveCurrentContent() {
    if (!currentProjectId) return;
    const record = await Store.getProject(currentProjectId);
    if (!record) return;
    record.contentHtml = currentEditorHtml();
    record.updatedAt = Date.now();
    await Store.putProject(record);
  }

  // The editor's content as HTML, accounting for the active tab.
  function currentEditorHtml() {
    return activeTab === "raw"
      ? Editor.sanitizeHtml(MarkdownToHtml.render(el.rawEditor.value))
      : Editor.getHtml();
  }

  // ---- Editor mode tabs (Word Processor / Raw Markdown) ----------------
  // Toggle which pane is visible; does NOT convert content.
  function showTab(tab) {
    activeTab = tab;
    const raw = tab === "raw";
    el.editor.classList.toggle("d-none", raw);
    el.rawEditor.classList.toggle("d-none", !raw);
    el.toolbar.classList.toggle("toolbar-disabled", raw);
    el.tabWysiwyg.classList.toggle("active", !raw);
    el.tabRaw.classList.toggle("active", raw);
    el.tabWysiwyg.setAttribute("aria-selected", String(!raw));
    el.tabRaw.setAttribute("aria-selected", String(raw));
  }

  // Switch tabs, converting the current content so both views stay in sync.
  function switchTab(tab) {
    if (tab === activeTab) return;
    if (tab === "raw") {
      el.rawEditor.value = HtmlToMarkdown.convert(el.editor);
    } else {
      Editor.setHtml(Editor.sanitizeHtml(MarkdownToHtml.render(el.rawEditor.value)));
      resolveWorkspaceImages(el.editor);
    }
    showTab(tab);
    saveCurrentContent();
    if (livePreviewOn) renderLivePreview();
    (tab === "raw" ? el.rawEditor : el.editor).focus();
  }

  // Replace the whole document (import / template / project open / README).
  // Always lands in the Word Processor tab so the loaded content is visible.
  function loadDocumentHtml(html) {
    showTab("wysiwyg");
    Editor.setHtml(html);
    resolveWorkspaceImages(el.editor);
    if (livePreviewOn) renderLivePreview();
  }

  // ---- Live side-by-side preview ---------------------------------------
  // Render the current document (from whichever editor mode is active) into the
  // preview pane, then run the highlight.js / Mermaid / KaTeX enhancers on it.
  function renderLivePreview() {
    el.livePreviewPane.innerHTML = MarkdownToHtml.render(currentMarkdown());
    resolveWorkspaceImages(el.livePreviewPane);
    enhancePreview(el.livePreviewPane);
  }
  const updateLivePreview = Util.debounce(function () {
    if (livePreviewOn) renderLivePreview();
  }, 300);

  el.splitPreviewBtn.addEventListener("click", function () {
    livePreviewOn = !livePreviewOn;
    el.livePreviewPane.classList.toggle("d-none", !livePreviewOn);
    el.editorBody.classList.toggle("split", livePreviewOn);
    el.splitPreviewBtn.classList.toggle("active", livePreviewOn);
    el.splitPreviewBtn.setAttribute("aria-pressed", String(livePreviewOn));
    if (livePreviewOn) renderLivePreview();
  });

  // execCommand + typing both fire "input" on the contenteditable, so this one
  // listener covers toolbar formatting, inserts and typing; the textarea covers
  // Raw-mode typing. Programmatic loads call renderLivePreview() directly above.
  el.editor.addEventListener("input", updateLivePreview);
  el.rawEditor.addEventListener("input", updateLivePreview);

  // Repo-relative <img> sources (e.g. images/logo.png) can't be loaded by the
  // browser — those files aren't served over HTTP — so images embedded from the
  // workspace would show as broken. Swap each such src for a blob: URL read from
  // the folder, keeping the real path in data-md-src so Markdown output/saving
  // still uses the path, never the blob URL. External/data/blob URLs are left be.
  async function resolveWorkspaceImages(container) {
    if (!container || !Workspace.objectUrlForPath) return;
    const imgs = container.querySelectorAll("img");
    for (const img of imgs) {
      const raw = img.getAttribute("data-md-src") || img.getAttribute("src") || "";
      if (!raw || /^(https?:|data:|blob:|\/\/|#)/i.test(raw)) continue;
      // Markdown rendering percent-encodes paths (spaces -> %20); decode so the
      // path matches the workspace tree / blob-cache keys, which use raw paths.
      let canonical = raw;
      try { canonical = decodeURI(raw); } catch (e) { /* malformed %; keep raw */ }
      img.setAttribute("data-md-src", canonical);
      try {
        const url = await Workspace.objectUrlForPath(canonical);
        if (url) img.src = url;
      } catch (e) { /* file may be outside the workspace; leave as-is */ }
    }
  }

  el.tabWysiwyg.addEventListener("click", function () { switchTab("wysiwyg"); });
  el.tabRaw.addEventListener("click", function () { switchTab("raw"); });

  // ---- Content insertion at the cursor (Word Processor only) -----------
  function insertGenerated(html) {
    if (!html || activeTab === "raw") return;
    Editor.restoreSelection();
    Editor.insert(html);
    if (/<img\b/i.test(html)) resolveWorkspaceImages(el.editor);
    scheduleAutosave();
  }
  function linkHtml(url, text) {
    return '<a href="' + escapeHtml(url) + '">' + escapeHtml(text || url) + "</a>";
  }
  function imageHtml(src, alt) {
    return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt || "") + '">';
  }
  function buildTableHtml(rows, cols) {
    let html = "<table><thead><tr>";
    for (let c = 0; c < cols; c++) html += "<th>Header " + (c + 1) + "</th>";
    html += "</tr></thead><tbody>";
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) html += "<td>Cell</td>";
      html += "</tr>";
    }
    return html + "</tbody></table><p><br></p>";
  }

  function tableDimensions() {
    const rows = Math.max(1, Math.min(20, parseInt(el.tableRows.value, 10) || 2));
    const cols = Math.max(1, Math.min(20, parseInt(el.tableCols.value, 10) || 2));
    return { rows, cols };
  }

  function updateTablePreview() {
    const { rows, cols } = tableDimensions();
    el.tableRows.value = rows;
    el.tableCols.value = cols;
    const lines = [];
    for (let r = 0; r < rows; r++) {
      const rowCells = [];
      for (let c = 0; c < cols; c++) rowCells.push("<td></td>");
      lines.push("<tr>" + rowCells.join("") + "</tr>");
    }
    el.tablePreview.innerHTML = "<table class='table table-sm table-bordered mb-0'><thead><tr>" +
      Array.from({ length: cols }, (_, i) => "<th>H" + (i + 1) + "</th>").join("") +
      "</tr></thead><tbody>" + lines.join("") + "</tbody></table>";
  }

  function openTableModal() {
    Editor.saveSelection();
    const { rows, cols } = tableDimensions();
    el.tableRows.value = rows;
    el.tableCols.value = cols;
    updateTablePreview();
    new bootstrap.Modal(el.tableModal).show();
  }

  el.tableRows.addEventListener("input", updateTablePreview);
  el.tableCols.addEventListener("input", updateTablePreview);
  el.tableInsertBtn.addEventListener("click", function () {
    const { rows, cols } = tableDimensions();
    const modal = bootstrap.Modal.getInstance(el.tableModal);
    if (modal) modal.hide();
    insertGenerated(buildTableHtml(rows, cols));
    scheduleAutosave();
  });

  // A single debounced saver shared by typing and toolbar actions.
  const scheduleAutosave = Util.debounce(saveCurrentContent, 600);
  el.editor.addEventListener("input", scheduleAutosave);
  el.rawEditor.addEventListener("input", scheduleAutosave);

  // ---- Project list rendering (sidebar + welcome) -----------------------
  async function refreshProjectLists() {
    const projects = await Store.listProjects();

    // Welcome-screen recent list
    if (projects.length) {
      el.recentProjectsWrap.classList.remove("d-none");
      el.recentProjectsList.innerHTML = "";
      projects.forEach(function (p) {
        el.recentProjectsList.appendChild(projectItem(p, "welcome"));
      });
    } else {
      el.recentProjectsWrap.classList.add("d-none");
    }

    // Sidebar list
    el.projectList.innerHTML = "";
    if (!projects.length) {
      el.projectList.innerHTML = '<div class="text-muted small p-2">No saved projects.</div>';
    } else {
      projects.forEach(function (p) {
        el.projectList.appendChild(projectItem(p, "sidebar"));
      });
    }
  }

  function projectItem(p, context) {
    const row = document.createElement("div");
    row.className = "project-item" + (p.id === currentProjectId ? " active" : "");
    const status = projectStatus[p.id];
    let badge = "";
    if (status === "missing") badge = '<span class="proj-badge missing" title="Folder moved or removed">missing</span>';
    else if (status === "reconnect") badge = '<span class="proj-badge reconnect" title="Reconnect to grant access">reconnect</span>';
    else if (!p.handle && p.kind === "fallback") badge = '<span class="proj-badge info" title="Folder path not remembered in this browser">no path</span>';

    row.innerHTML =
      '<div class="proj-main">' +
      '<i class="bi bi-folder2 me-1"></i>' +
      '<span class="proj-name" title="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + "</span>" +
      badge +
      "</div>" +
      '<button class="proj-delete" title="Remove from this browser (does not delete files)"><i class="bi bi-trash"></i></button>';

    row.querySelector(".proj-main").addEventListener("click", function () {
      if (p.id === currentProjectId && !el.editorScreen.classList.contains("d-none")) return;
      openProject(p.id);
    });
    row.querySelector(".proj-delete").addEventListener("click", function (e) {
      e.stopPropagation();
      deleteProject(p);
    });
    return row;
  }

  async function deleteProject(p) {
    const ok = window.confirm(
      'Remove "' + p.name + '" from this browser?\n\n' +
      "This only clears the saved session/content here — your actual files and folder are NOT deleted."
    );
    if (!ok) return;
    await Store.deleteProject(p.id);
    delete projectStatus[p.id];
    if (p.id === currentProjectId) {
      currentProjectId = null;
      // Return to welcome screen since the open project was removed.
      el.editorScreen.classList.add("d-none");
      el.welcomeScreen.classList.remove("d-none");
      el.workspaceLabel.classList.add("d-none");
      el.importBtn.classList.add("d-none");
      el.toolsMenuWrap.classList.add("d-none");
      el.previewBtn.classList.add("d-none");
      el.saveBtn.classList.add("d-none");
    }
    await refreshProjectLists();
    toast('Removed <strong>' + escapeHtml(p.name) + "</strong> from this browser.");
  }

  // ---- Path-problem notification ---------------------------------------
  function notifyPathProblem(record, err) {
    const msg = err && err.code === "missing"
      ? "⚠️ <strong>" + escapeHtml(record.name) + "</strong>: the folder was moved or removed. It can no longer be opened."
      : "⚠️ <strong>" + escapeHtml(record.name) + "</strong>: " + escapeHtml(err.message || "could not be opened.");
    toast(msg, 7000);
  }

  // Startup validation: for projects whose permission is already granted we can
  // silently confirm the folder still exists and flag any that are gone.
  async function validateProjectsOnStartup() {
    const projects = await Store.listProjects();
    if (!projects.length) return;
    const missing = [];
    for (const p of projects) {
      if (!p.handle) continue;
      // No prompting on startup (no user gesture) — only checks granted handles.
      const status = await Workspace.verify(p.handle, "read", false);
      if (status === "missing") { projectStatus[p.id] = "missing"; missing.push(p.name); }
      else if (status === "denied") { projectStatus[p.id] = "reconnect"; }
      else if (status === "ok") { projectStatus[p.id] = "ok"; }
    }
    if (missing.length) {
      await refreshProjectLists();
      toast("⚠️ " + missing.length + " project folder" + (missing.length > 1 ? "s were" : " was") +
        " moved or removed: <strong>" + escapeHtml(missing.join(", ")) + "</strong>", 8000);
    }
  }

  // Re-validate the current project when the user returns to the tab — catches
  // a folder that was moved/removed while the app was in the background.
  window.addEventListener("focus", async function () {
    if (!currentProjectId) return;
    const record = await Store.getProject(currentProjectId);
    if (!record || !record.handle) return;
    const status = await Workspace.verify(record.handle, "read", false);
    if (status === "missing" && projectStatus[currentProjectId] !== "missing") {
      projectStatus[currentProjectId] = "missing";
      refreshProjectLists();
      notifyPathProblem(record, { code: "missing" });
    }
  });

  // ---- File tree rendering ---------------------------------------------
  function renderTree(root) {
    el.fileTree.innerHTML = "";
    if (!root || !root.children || !root.children.length) {
      el.fileTree.innerHTML = '<div class="text-muted p-2 small">No files to show.</div>';
      return;
    }
    root.children.forEach(function (child) {
      el.fileTree.appendChild(renderNode(child));
    });
  }

  function renderNode(node) {
    if (node.kind === "dir") {
      const wrap = document.createElement("div");
      const dir = document.createElement("div");
      dir.className = "tree-dir";
      dir.innerHTML =
        '<i class="bi bi-chevron-down me-1"></i><i class="bi bi-folder-fill me-1"></i>' +
        escapeHtml(node.name);
      const children = document.createElement("div");
      children.className = "tree-children";
      node.children.forEach(function (c) {
        children.appendChild(renderNode(c));
      });
      dir.addEventListener("click", function () {
        const hidden = children.style.display === "none";
        children.style.display = hidden ? "" : "none";
        const chevron = dir.querySelector(".bi-chevron-down, .bi-chevron-right");
        if (chevron) {
          chevron.classList.toggle("bi-chevron-down");
          chevron.classList.toggle("bi-chevron-right");
        }
      });
      wrap.appendChild(dir);
      wrap.appendChild(children);
      return wrap;
    }

    // file
    const row = document.createElement("div");
    row.className = "tree-file" + (node.isImage ? " is-image" : "");
    row.dataset.path = node.path.toLowerCase();

    const importable = ["html", "htm", "md", "markdown"].indexOf(node.ext) !== -1;
    const icon = node.isImage ? "bi-file-image" : fileIcon(node.ext);
    row.innerHTML =
      '<i class="bi ' + icon + ' ficon"></i>' +
      '<span class="fname" title="' + escapeHtml(node.path) + '">' + escapeHtml(node.name) + "</span>" +
      '<span class="file-actions">' +
      (importable
        ? '<button class="act-import" title="Import this file into the editor"><i class="bi bi-box-arrow-in-down"></i></button>'
        : "") +
      '<button class="act-link" title="Insert link to this file"><i class="bi bi-link-45deg"></i></button>' +
      (node.isImage
        ? '<button class="act-img" title="Embed this image"><i class="bi bi-image"></i></button>'
        : "") +
      "</span>";

    row.querySelector(".act-link").addEventListener("click", function (e) {
      e.stopPropagation();
      insertGenerated(linkHtml(node.path, node.name));
      toast("Inserted link to <code>" + escapeHtml(node.path) + "</code>");
    });
    const imgBtn = row.querySelector(".act-img");
    if (imgBtn) {
      imgBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        insertGenerated(imageHtml(node.path, node.name.replace(/\.[^.]+$/, "")));
        toast("Embedded image <code>" + escapeHtml(node.path) + "</code>");
      });
    }
    const impBtn = row.querySelector(".act-import");
    if (impBtn) {
      impBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        importFromWorkspace(node);
      });
    }
    return row;
  }

  function fileIcon(ext) {
    const map = {
      md: "bi-markdown", js: "bi-filetype-js", ts: "bi-filetype-tsx",
      json: "bi-filetype-json", html: "bi-filetype-html", css: "bi-filetype-css",
      py: "bi-filetype-py", java: "bi-filetype-java", pdf: "bi-file-earmark-pdf",
      txt: "bi-file-text", sh: "bi-terminal", yml: "bi-file-code", yaml: "bi-file-code",
    };
    return map[ext] || "bi-file-earmark";
  }

  el.fileSearch.addEventListener("input", function () {
    const q = this.value.trim().toLowerCase();
    el.fileTree.querySelectorAll(".tree-file").forEach(function (row) {
      const match = !q || row.dataset.path.indexOf(q) !== -1;
      row.style.display = match ? "" : "none";
    });
    el.fileTree.querySelectorAll(".tree-children").forEach(function (c) {
      if (q) c.style.display = "";
    });
  });

  // ---- Toolbar ----------------------------------------------------------
  el.toolbar.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-cmd]");
    if (!btn) return;
    e.preventDefault();
    const cmd = btn.dataset.cmd;

    if (cmd === "link") return openInsertModal("link");
    if (cmd === "image") return openInsertModal("image");
    if (cmd === "table") return openTableModal();
    if (cmd === "toc") return insertToc();
    if (cmd === "emoji") return openEmoji();

    // The remaining commands are execCommand formatting.
    Editor.exec(cmd);
    updateToolbarState();
    scheduleAutosave();
  });

  el.blockFormat.addEventListener("change", function () {
    Editor.exec("formatBlock", this.value);
    el.editor.focus();
    scheduleAutosave();
  });

  function updateToolbarState() {
    const st = Editor.queryState();
    el.toolbar.querySelectorAll("[data-cmd]").forEach(function (btn) {
      const cmd = btn.dataset.cmd;
      if (st[cmd] !== undefined) btn.classList.toggle("active", !!st[cmd]);
    });
    if (st.block) {
      const opt = Array.from(el.blockFormat.options).find((o) => o.value === st.block);
      el.blockFormat.value = opt ? st.block : "p";
    }
  }

  el.editor.addEventListener("keyup", updateToolbarState);
  el.editor.addEventListener("mouseup", updateToolbarState);

  el.editor.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); Editor.exec("bold"); scheduleAutosave(); }
      else if (k === "i") { e.preventDefault(); Editor.exec("italic"); scheduleAutosave(); }
      else if (k === "s") { e.preventDefault(); doSave(); }
    }
  });

  // ---- Insert link / image modal ---------------------------------------
  function openInsertModal(mode) {
    insertMode = mode;
    selectedRepoPath = null;
    Editor.saveSelection();
    const selected = Editor.getSelectedText();

    if (mode === "link") {
      el.insertModalTitle.textContent = "Insert Link";
      el.insertUrlLabel.textContent = "URL";
      el.insertTextLabel.textContent = "Link text";
      el.srcUrlLabelText.textContent = "Enter a URL";
      el.insertUrl.placeholder = "https://…";
      el.insertRepoSearch.placeholder = "Filter files in your repo…";
    } else {
      el.insertModalTitle.textContent = "Insert Image";
      el.insertUrlLabel.textContent = "Image URL";
      el.insertTextLabel.textContent = "Alt text";
      el.srcUrlLabelText.textContent = "Enter an image URL";
      el.insertUrl.placeholder = "https://…/image.png";
      el.insertRepoSearch.placeholder = "Filter images in your repo…";
    }

    el.insertUrl.value = "";
    el.insertText.value = selected || "";
    el.insertRepoSearch.value = "";
    el.insertRepoSelected.textContent = "";

    // Populate the in-modal repo browser (images only for image inserts).
    const files = flattenFiles(Workspace.state.tree, mode === "image");
    renderRepoList(files);

    // Default to the repo browser when files exist, otherwise fall back to URL.
    const haveFiles = files.length > 0;
    setInsertSource(haveFiles ? "repo" : "url");
    el.srcRepo.disabled = !haveFiles;

    insertModal.show();
    setTimeout(function () {
      (haveFiles ? el.insertRepoSearch : el.insertUrl).focus();
    }, 200);
  }

  function setInsertSource(source) {
    const repo = source === "repo";
    el.srcRepo.checked = repo;
    el.srcUrl.checked = !repo;
    el.insertRepoPane.classList.toggle("d-none", !repo);
    el.insertUrlPane.classList.toggle("d-none", repo);
  }

  el.srcRepo.addEventListener("change", function () { if (this.checked) setInsertSource("repo"); });
  el.srcUrl.addEventListener("change", function () { if (this.checked) setInsertSource("url"); });

  // Flatten the workspace tree to a list of files (optionally images only).
  function flattenFiles(tree, imagesOnly) {
    const out = [];
    (function walk(node) {
      if (!node || !node.children) return;
      node.children.forEach(function (c) {
        if (c.kind === "dir") walk(c);
        else if (!imagesOnly || c.isImage) out.push(c);
      });
    })(tree);
    out.sort(function (a, b) { return a.path.localeCompare(b.path); });
    return out;
  }

  function renderRepoList(files) {
    el.insertRepoList.innerHTML = "";
    if (!files.length) {
      el.insertRepoList.innerHTML =
        '<div class="insert-repo-empty">No matching files in this repo.' +
        (insertMode === "image" ? " Add images to the folder, or use a URL." : " Use a URL instead.") +
        "</div>";
      return;
    }
    files.forEach(function (node) {
      const item = document.createElement("div");
      item.className = "insert-repo-item" + (node.isImage ? " is-image" : "");
      item.dataset.path = node.path;
      const icon = node.isImage ? "bi-file-image" : "bi-file-earmark";
      const dir = node.path.indexOf("/") !== -1 ? node.path.replace(/\/[^/]*$/, "") : "";
      item.innerHTML =
        '<i class="bi ' + icon + '"></i>' +
        '<span class="ir-name">' + escapeHtml(node.name) + "</span>" +
        (dir ? '<span class="ir-path">' + escapeHtml(dir) + "</span>" : "");
      item.addEventListener("click", function () {
        el.insertRepoList.querySelectorAll(".insert-repo-item.selected")
          .forEach((n) => n.classList.remove("selected"));
        item.classList.add("selected");
        selectedRepoPath = node.path;
        el.insertRepoSelected.innerHTML = "Selected: <code>" + escapeHtml(node.path) + "</code>";
        if (!el.insertText.value.trim()) {
          el.insertText.value = insertMode === "image" ? node.name.replace(/\.[^.]+$/, "") : node.name;
        }
      });
      item.addEventListener("dblclick", function () { el.insertConfirmBtn.click(); });
      el.insertRepoList.appendChild(item);
    });
  }

  el.insertRepoSearch.addEventListener("input", function () {
    const q = this.value.trim().toLowerCase();
    el.insertRepoList.querySelectorAll(".insert-repo-item").forEach(function (item) {
      item.style.display = !q || item.dataset.path.toLowerCase().indexOf(q) !== -1 ? "" : "none";
    });
  });

  el.insertConfirmBtn.addEventListener("click", function () {
    const useRepo = el.srcRepo.checked;
    const url = useRepo ? selectedRepoPath : el.insertUrl.value.trim();
    const text = el.insertText.value.trim();

    if (!url) {
      if (useRepo) { el.insertRepoSelected.innerHTML = '<span class="text-danger">Pick a file from the list first.</span>'; }
      else { el.insertUrl.focus(); }
      return;
    }

    insertModal.hide();
    insertGenerated(insertMode === "link" ? linkHtml(url, text || url) : imageHtml(url, text));
  });

  el.insertUrl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); el.insertConfirmBtn.click(); }
  });

  // ---- Import (.html / .md) from local PC or from the repo --------------
  // Both sources funnel through here.
  function importContent(text, filename) {
    const ext = (filename.split(".").pop() || "").toLowerCase();
    let html;
    if (ext === "md" || ext === "markdown") {
      html = MarkdownToHtml.render(text); // convert markdown → HTML first
    } else {
      html = text; // .html / .htm — the sanitizer extracts the <body>
    }
    const clean = Editor.sanitizeHtml(html);
    if (!clean.trim()) { toast("Nothing importable was found in that file."); return; }

    const hasContent = Editor.getHtml().replace(/<[^>]+>|\s|&nbsp;/g, "").length > 0;
    if (hasContent && !window.confirm(
      'Replace the current document with "' + filename + '"?\n\nYour current content will be overwritten.'
    )) return;

    loadDocumentHtml(clean);
    saveCurrentContent();
    el.editor.focus();
    toast("Imported <strong>" + escapeHtml(filename) + "</strong>");
  }

  // Source 1: a file from the user's PC.
  el.importBtn.addEventListener("click", function () { el.importInput.click(); });
  el.importInput.addEventListener("change", async function () {
    const file = this.files && this.files[0];
    if (!file) return;
    try {
      importContent(await file.text(), file.name);
    } catch (err) {
      console.error(err);
      toast("Could not read that file.");
    }
    this.value = ""; // allow re-importing the same file later
  });

  // Source 2: a file from the opened repo (wired in the file tree — see renderNode).
  async function importFromWorkspace(node) {
    try {
      const text = await Workspace.readFileText(node);
      importContent(text, node.name);
    } catch (err) {
      console.error(err);
      toast("Could not read <code>" + escapeHtml(node.name) + "</code> from the folder.");
    }
  }

  // ---- Preview ----------------------------------------------------------
  function currentMarkdown() {
    return activeTab === "raw" ? el.rawEditor.value : HtmlToMarkdown.convert(el.editor);
  }

  // Run optional preview libraries (highlight.js, Mermaid, KaTeX) over a
  // rendered container. All are feature-detected — the app works without them.
  function enhancePreview(container) {
    if (window.hljs) {
      container.querySelectorAll("pre code").forEach(function (block) {
        try { window.hljs.highlightElement(block); } catch (e) { /* ignore */ }
      });
    }
    if (window.mermaid) {
      try {
        window.mermaid.initialize({ startOnLoad: false, theme: isDarkTheme() ? "dark" : "default" });
        const nodes = container.querySelectorAll(".mermaid");
        if (nodes.length) window.mermaid.run({ nodes: nodes });
      } catch (e) { /* ignore */ }
    }
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(container, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
          throwOnError: false,
        });
      } catch (e) { /* ignore */ }
    }
  }
  function isDarkTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  el.previewBtn.addEventListener("click", function () {
    const md = currentMarkdown();
    el.previewRendered.innerHTML = MarkdownToHtml.render(md);
    resolveWorkspaceImages(el.previewRendered);
    enhancePreview(el.previewRendered);
    el.previewSource.textContent = md;
    previewModal.show();
  });

  document.querySelectorAll("#previewModal .nav-link").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll("#previewModal .nav-link").forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      const view = this.dataset.view;
      el.previewRendered.classList.toggle("d-none", view !== "rendered");
      document.getElementById("previewSource").classList.toggle("d-none", view !== "source");
    });
  });

  el.copyMdBtn.addEventListener("click", async function () {
    const md = currentMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      toast("Markdown copied to clipboard.");
    } catch (e) {
      toast("Copy failed — select the source and copy manually.");
    }
  });

  // ---- Saving -----------------------------------------------------------
  async function doSave() {
    await saveCurrentContent(); // keep the session copy fresh too
    const md = currentMarkdown();
    try {
      const result = await Workspace.save(md, "README.md");
      if (result.method === "workspace") {
        if (currentProjectId) projectStatus[currentProjectId] = "ok";
        toast('Saved to <strong>' + escapeHtml(result.path) + "</strong>");
      } else {
        toast("README.md downloaded — move it into your repo.");
      }
    } catch (err) {
      console.error(err);
      if (err && err.code) {
        // Path moved/removed or access denied — notify immediately and flag it.
        if (currentProjectId) {
          projectStatus[currentProjectId] = err.code === "missing" ? "missing" : "reconnect";
          refreshProjectLists();
        }
        toast("⚠️ " + escapeHtml(err.message), 7000);
      } else {
        toast("Save failed: " + escapeHtml(err.message || String(err)));
      }
    }
  }

  el.saveBtn.addEventListener("click", doSave);
  el.saveFromPreviewBtn.addEventListener("click", function () {
    previewModal.hide();
    doSave();
  });

  // Export the document as a standalone .html file.
  el.saveHtmlBtn.addEventListener("click", async function () {
    const md = currentMarkdown();
    const bodyHtml = MarkdownToHtml.render(md);
    const title = (md.match(/^#\s+(.+)$/m) || [])[1] || (Workspace.state.name || "README");
    const doc = buildStandaloneHtml(bodyHtml, title.trim());
    try {
      const result = await Workspace.save(doc, "README.html");
      if (result.method === "workspace") toast("Saved <strong>" + escapeHtml(result.path) + "</strong>");
      else toast("README.html downloaded.");
    } catch (err) {
      if (err && err.code) toast("⚠️ " + escapeHtml(err.message), 7000);
      else Workspace.downloadFile(doc, "README.html"), toast("README.html downloaded.");
    }
  });

  // Minimal self-contained HTML wrapper with GitHub-ish styling.
  function buildStandaloneHtml(bodyHtml, title) {
    return [
      "<!DOCTYPE html>",
      '<html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      "<title>" + escapeHtml(title) + "</title>",
      "<style>",
      "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
      "line-height:1.6;color:#24292f;max-width:820px;margin:2rem auto;padding:0 1rem;}",
      "h1,h2{border-bottom:1px solid #eaecef;padding-bottom:.3em;}",
      "code{background:rgba(175,184,193,.2);padding:.2em .4em;border-radius:6px;font-size:85%;}",
      "pre{background:#f6f8fa;padding:1rem;border-radius:6px;overflow:auto;}pre code{background:none;padding:0;}",
      "blockquote{border-left:4px solid #dfe2e5;color:#6a737d;padding:0 1em;margin-left:0;}",
      "table{border-collapse:collapse;}th,td{border:1px solid #d0d7de;padding:6px 13px;}th{background:#f6f8fa;}",
      "img{max-width:100%;}a{color:#0969da;}hr{border:0;border-top:1px solid #d0d7de;}",
      "</style></head><body>",
      bodyHtml,
      "</body></html>",
      "",
    ].join("\n");
  }

  // ======================================================================
  //  GitHub widgets, tools, raw mode, live preview, drag-drop
  // ======================================================================

  // ---- Insert-tool dropdown + generic tool modal -----------------------
  Snippets.tools.forEach(function (tool) {
    const li = document.createElement("li");
    li.innerHTML = '<button class="dropdown-item" type="button"><i class="bi ' + tool.icon +
      ' me-2"></i>' + escapeHtml(tool.title) + "</button>";
    li.querySelector("button").addEventListener("click", function () { openToolModal(tool.id); });
    el.insertToolMenu.appendChild(li);
  });

  function openToolModal(toolId) {
    const tool = Snippets.byId[toolId];
    if (!tool) return;
    Editor.saveSelection();
    el.toolModalTitle.textContent = tool.title;
    el.toolForm.dataset.tool = toolId;
    el.toolForm.innerHTML = tool.fields.map(fieldHtml).join("");
    updateToolPreview();
    toolModal.show();
  }

  function fieldHtml(f) {
    let input;
    if (f.type === "select") {
      input = '<select class="form-select form-select-sm" name="' + f.name + '">' +
        f.options.map((o) => '<option' + (o === f.default ? " selected" : "") + ">" + escapeHtml(o) + "</option>").join("") +
        "</select>";
    } else if (f.type === "textarea") {
      input = '<textarea class="form-control form-control-sm" name="' + f.name + '" rows="3" placeholder="' +
        escapeHtml(f.placeholder || "") + '">' + escapeHtml(f.default || "") + "</textarea>";
    } else {
      input = '<input class="form-control form-control-sm" name="' + f.name + '" placeholder="' +
        escapeHtml(f.placeholder || "") + '" value="' + escapeHtml(f.default || "") + '">';
    }
    return '<div class="mb-2"><label class="form-label small mb-0">' + escapeHtml(f.label) + "</label>" + input + "</div>";
  }

  function toolValues() {
    const tool = Snippets.byId[el.toolForm.dataset.tool];
    const v = {};
    tool.fields.forEach(function (f) {
      const node = el.toolForm.querySelector('[name="' + f.name + '"]');
      v[f.name] = node ? node.value : "";
    });
    return { tool: tool, v: v };
  }

  function updateToolPreview() {
    const tv = toolValues();
    let html = "";
    try { html = tv.tool.generate(tv.v); } catch (e) { html = ""; }
    el.toolPreview.innerHTML = html || '<span class="text-muted small">Fill in the fields…</span>';
    enhancePreview(el.toolPreview);
  }
  el.toolForm.addEventListener("input", updateToolPreview);
  el.toolForm.addEventListener("change", updateToolPreview);

  el.toolInsertBtn.addEventListener("click", function () {
    const tv = toolValues();
    toolModal.hide();
    insertGenerated(tv.tool.generate(tv.v));
  });

  // ---- Table of contents -----------------------------------------------
  function insertToc() {
    const headings = [];
    el.editor.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(function (h) {
      const text = h.textContent.trim();
      if (text) headings.push({ level: parseInt(h.tagName.charAt(1), 10), text: text });
    });
    if (!headings.length) { toast("Add some headings first, then insert a Table of Contents."); return; }
    insertGenerated("<h2>Table of Contents</h2>" + Snippets.tocHtml(headings));
  }

  // ---- Emoji picker -----------------------------------------------------
  function openEmoji() {
    Editor.saveSelection();
    renderEmoji("");
    emojiModal.show();
    setTimeout(() => el.emojiSearch.focus(), 200);
  }
  function renderEmoji(q) {
    q = q.trim().toLowerCase();
    el.emojiGrid.innerHTML = "";
    EmojiData.filter((e) => !q || e.keywords.indexOf(q) !== -1).forEach(function (e) {
      const b = document.createElement("button");
      b.className = "emoji-btn";
      b.type = "button";
      b.title = ":" + e.code + ":";
      b.textContent = e.char;
      b.addEventListener("click", function () {
        emojiModal.hide();
        insertGenerated(e.char + " ");
      });
      el.emojiGrid.appendChild(b);
    });
  }
  el.emojiSearch.addEventListener("input", function () { renderEmoji(this.value); });

  // ---- Templates (full-document starting points) -----------------------

  // Loaded on demand from the /templates folder (see JS/templates.js).
  let templatesData = null;      // { list, byId } once loaded
  let selectedTemplateId = null;

  el.templatesBtn.addEventListener("click", openTemplates);

  async function openTemplates() {
    templatesModal.show();
    if (!templatesData) {
      el.templateUseBtn.disabled = true;
      el.templatePreview.innerHTML = "";
      el.templateList.innerHTML =
        '<div class="text-muted small p-2"><span class="spinner-border spinner-border-sm me-2"></span>Loading templates…</div>';
      try {
        templatesData = await Templates.load();
      } catch (err) {
        console.error(err);
        el.templateList.innerHTML =
          '<div class="template-load-error small">' +
          '<i class="bi bi-exclamation-triangle me-1"></i>Couldn\'t load templates from the <code>Markdown Templates/</code> folder.' +
          '<div class="mt-2 text-muted">If you opened this app by double-clicking the file, your browser blocks reading these files. ' +
          'Run <code>start-server.bat</code> or open the hosted version, then try again.</div></div>';
        return;
      }
    }
    if (!templatesData.list.length) {
      el.templateUseBtn.disabled = true;
      el.templatePreview.innerHTML = "";
      el.templateList.innerHTML =
        '<div class="text-muted small p-2">No templates found in the <code>Markdown Templates/</code> folder.</div>';
      return;
    }
    renderTemplateList();
    // Default to the first template so the preview is never empty.
    selectTemplate(templatesData.list[0].id);
  }

  function renderTemplateList() {
    el.templateList.innerHTML = "";
    templatesData.list.forEach(function (tpl) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "template-card";
      card.dataset.id = tpl.id;
      card.innerHTML =
        '<i class="bi ' + tpl.icon + ' template-card-icon"></i>' +
        '<span class="template-card-body">' +
        '<span class="template-card-name">' + escapeHtml(tpl.name) + "</span>" +
        '<span class="template-card-desc">' + escapeHtml(tpl.description) + "</span>" +
        "</span>";
      card.addEventListener("click", function () { selectTemplate(tpl.id); });
      card.addEventListener("dblclick", function () { el.templateUseBtn.click(); });
      el.templateList.appendChild(card);
    });
  }

  function selectTemplate(id) {
    selectedTemplateId = id;
    el.templateList.querySelectorAll(".template-card").forEach(function (c) {
      c.classList.toggle("selected", c.dataset.id === id);
    });
    const tpl = templatesData.byId[id];
    el.templatePreview.innerHTML = MarkdownToHtml.render(tpl.markdown);
    enhancePreview(el.templatePreview);
    el.templateUseBtn.disabled = false;
  }

  el.templateUseBtn.addEventListener("click", function () {
    const tpl = templatesData && templatesData.byId[selectedTemplateId];
    if (!tpl) return;
    if (editorHasRealContent() && !window.confirm(
      'Start from the "' + tpl.name + '" template?\n\nYour current content will be replaced.'
    )) return;

    loadDocumentHtml(Editor.sanitizeHtml(MarkdownToHtml.render(tpl.markdown)));
    templatesModal.hide();
    saveCurrentContent();
    el.editor.focus();
    toast("Loaded the <strong>" + escapeHtml(tpl.name) + "</strong> template.");
  });

  // True only when the document holds real content beyond the fresh-project
  // placeholder — used to decide whether replacing needs a confirmation.
  function editorHasRealContent() {
    if (activeTab === "raw") return el.rawEditor.value.trim().length > 0;
    const cur = el.editor.innerHTML.trim();
    if (cur === DEFAULT_CONTENT.trim()) return false;
    return cur.replace(/<[^>]+>|\s|&nbsp;/g, "").length > 0;
  }

  // ---- Link & lint check -----------------------------------------------
  el.linkCheckBtn.addEventListener("click", function () {
    const report = LinkCheck.check(currentMarkdown(), Workspace.state.tree);
    el.linkCheckReport.innerHTML = renderLinkReport(report);
    linkCheckModal.show();
  });
  function renderLinkReport(r) {
    let h = '<div class="mb-3 d-flex gap-2 flex-wrap">' +
      '<span class="badge text-bg-success">' + r.ok + " OK</span>" +
      '<span class="badge text-bg-danger">' + r.broken.length + " broken</span>" +
      '<span class="badge text-bg-secondary">' + r.external + " external</span>" +
      '<span class="badge text-bg-secondary">' + r.anchors + " anchors</span></div>";
    if (!r.canValidate) {
      h += '<p class="text-muted small">No workspace file list is available, so relative links can\'t be verified. Re-open the folder to enable this.</p>';
    } else if (r.broken.length) {
      h += '<h6 class="text-danger">Broken relative links / images</h6><ul class="small">';
      r.broken.forEach(function (b) {
        h += "<li>Line " + b.line + ": <code>" + escapeHtml(b.url) + "</code> (" + b.kind + ") — not found in repo</li>";
      });
      h += "</ul>";
    } else {
      h += '<p class="text-success small">✓ All relative links and images point to existing files.</p>';
    }
    if (r.lint.length) {
      h += '<h6 class="mt-3">Lint suggestions</h6><ul class="small">';
      r.lint.forEach(function (w) { h += "<li>Line " + w.line + ": " + escapeHtml(w.msg) + "</li>"; });
      h += "</ul>";
    } else {
      h += '<p class="text-success small mt-2">✓ No lint warnings.</p>';
    }
    return h;
  }

  // ---- Community health files ------------------------------------------
  // Health templates are loaded on demand from the "Health Templates" folder
  // (see JS/health.js) and cached for the session.
  let loadedHealth = null;

  async function ensureHealth() {
    if (!loadedHealth) loadedHealth = await HealthFiles.loadHealth();
    return loadedHealth;
  }
  function healthLoadError(err) {
    console.error(err);
    toast("⚠️ Couldn't load health files from the <strong>Health Templates/</strong> folder. " +
      "If you opened this file directly, run <code>start-server.bat</code> or use the hosted app.", 7000);
  }

  el.healthBtn.addEventListener("click", async function () {
    let health;
    try { health = await ensureHealth(); }
    catch (err) { return healthLoadError(err); }
    el.hfProject.value = Workspace.state.name || "My Project";
    el.hfYear.value = String(new Date().getFullYear());
    renderHealthList(health);
    healthModal.show();
  });
  function renderHealthList(health) {
    el.healthList.innerHTML = "";
    health.forEach(function (t) {
      const id = "hf_" + t.id;
      const row = document.createElement("div");
      row.className = "form-check";
      row.innerHTML =
        '<input class="form-check-input" type="checkbox" id="' + id + '" value="' + t.id + '" checked>' +
        '<label class="form-check-label" for="' + id + '">' + escapeHtml(t.label) + "</label>";
      el.healthList.appendChild(row);
    });
  }
  el.healthCreateBtn.addEventListener("click", async function () {
    const values = {
      project: el.hfProject.value || "Project", author: el.hfAuthor.value || "",
      email: el.hfEmail.value || "", github: el.hfGithub.value || "", year: el.hfYear.value || "",
    };
    const selected = Array.prototype.slice.call(el.healthList.querySelectorAll("input:checked")).map((i) => i.value);
    if (!selected.length) { toast("Select at least one file."); return; }
    healthModal.hide();
    showLoading("Creating files…");
    let created = 0, downloaded = 0, failed = 0;
    for (const id of selected) {
      const tpl = (loadedHealth || []).find((h) => h.id === id);
      if (!tpl) { failed++; continue; }
      const built = HealthFiles.build(tpl, values);
      try {
        const res = await Workspace.saveFile(built.path, built.content);
        if (res.method === "workspace") created++; else downloaded++;
      } catch (err) { failed++; console.error(err); }
    }
    hideLoading();
    let msg = created ? "Created " + created + " file(s) in your repo. " : "";
    if (downloaded) msg += downloaded + " downloaded. ";
    if (failed) msg += "⚠️ " + failed + " failed.";
    toast(msg || "Done.");
  });

  // ---- License generator -----------------------------------------------
  // Licenses are loaded on demand from the "License Templates" folder
  // (see JS/health.js) and cached for the session.
  let loadedLicenses = null;

  async function ensureLicenses() {
    if (!loadedLicenses) loadedLicenses = await HealthFiles.loadLicenses();
    return loadedLicenses;
  }
  function licenseLoadError(err) {
    console.error(err);
    toast("⚠️ Couldn't load licenses from the <strong>License Templates/</strong> folder. " +
      "If you opened this file directly, run <code>start-server.bat</code> or use the hosted app.", 7000);
  }

  el.licenseBtn.addEventListener("click", async function () {
    let licenses;
    try { licenses = await ensureLicenses(); }
    catch (err) { return licenseLoadError(err); }
    el.licenseSelect.innerHTML = licenses
      .map((l) => '<option value="' + l.id + '">' + escapeHtml(l.label) + "</option>").join("");
    el.licenseYear.value = String(new Date().getFullYear());
    licenseModal.show();
  });
  el.licenseCreateBtn.addEventListener("click", async function () {
    const lic = (loadedLicenses || []).find((l) => l.id === el.licenseSelect.value);
    if (!lic) { toast("Pick a license first."); return; }
    const built = HealthFiles.build(lic, { author: el.licenseAuthor.value || "", year: el.licenseYear.value || "" });
    licenseModal.hide();
    try {
      const res = await Workspace.saveFile("LICENSE", built.content);
      toast(res.method === "workspace" ? "Created <strong>" + escapeHtml(res.path) + "</strong>" : "LICENSE downloaded.");
    } catch (err) {
      toast("⚠️ " + escapeHtml(err.message || "Failed to create LICENSE"));
    }
  });

  // ---- Publish to GitHub (optional PAT flow) ---------------------------
  el.publishBtn.addEventListener("click", openPublish);

  // "How to get a token" opens a help modal stacked over the publish modal.
  el.ghHelpBtn.addEventListener("click", function () { ghHelpModal.show(); });
  // Closing the stacked help modal can strip Bootstrap's body scroll-lock while
  // the publish modal is still open — restore it so the page doesn't scroll.
  document.getElementById("ghHelpModal").addEventListener("hidden.bs.modal", function () {
    if (document.getElementById("publishModal").classList.contains("show")) {
      document.body.classList.add("modal-open");
    }
  });

  async function openPublish() {
    el.ghPublishStatus.innerHTML = "";
    publishModal.show();
    if (GitHubPublish.hasToken()) {
      // A remembered / in-session token exists — validate it before publishing.
      showPublishPane();
      el.ghUserLogin.textContent = "…";
      el.ghRepoHint.textContent = "Connecting…";
      try {
        onConnected(await GitHubPublish.connect());
      } catch (err) {
        GitHubPublish.clearToken();
        showConnectPane();
        toast("⚠️ Saved GitHub token is no longer valid — reconnect. (" + escapeHtml(err.message || "") + ")", 6000);
      }
    } else {
      showConnectPane();
      setTimeout(function () { el.ghToken.focus(); }, 250);
    }
  }

  function showConnectPane() {
    el.ghConnectPane.classList.remove("d-none");
    el.ghPublishPane.classList.add("d-none");
    el.ghPublishBtn.classList.add("d-none");
    el.ghRemember.checked = GitHubPublish.isRemembered();
  }
  function showPublishPane() {
    el.ghConnectPane.classList.add("d-none");
    el.ghPublishPane.classList.remove("d-none");
    el.ghPublishBtn.classList.remove("d-none");
  }

  el.ghConnectBtn.addEventListener("click", connectGitHub);
  el.ghToken.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); connectGitHub(); }
  });

  async function connectGitHub() {
    const t = el.ghToken.value.trim();
    if (!t) { el.ghToken.focus(); return; }
    const prev = el.ghConnectBtn.innerHTML;
    el.ghConnectBtn.disabled = true;
    el.ghConnectBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Connecting…';
    GitHubPublish.setToken(t, el.ghRemember.checked);
    try {
      onConnected(await GitHubPublish.connect());
    } catch (err) {
      GitHubPublish.clearToken(); // never keep a rejected token around
      toast("⚠️ " + escapeHtml(err.message || "Could not connect to GitHub."), 6000);
      el.ghToken.focus();
    } finally {
      el.ghConnectBtn.disabled = false;
      el.ghConnectBtn.innerHTML = prev;
    }
  }

  el.ghDisconnectBtn.addEventListener("click", function () {
    GitHubPublish.clearToken();
    el.ghToken.value = "";
    el.ghRemember.checked = false;
    showConnectPane();
    toast("GitHub token forgotten.");
  });

  function onConnected(u) {
    el.ghUserLogin.textContent = u.login;
    el.ghPublishStatus.innerHTML = "";
    showPublishPane();
    buildPublishFileList();
    loadRepos();
    setTimeout(function () { el.ghRepo.focus(); }, 100);
  }

  // Insert one publish row for LICENSE, wired to the licenses loaded from the
  // "License Templates" folder. Falls back to a disabled row if they can't load
  // (e.g. the app was opened via file://) so the rest of the list still works.
  function addLicensePublishRow(licenses) {
    if (licenses && licenses.length) {
      const licSelect = document.createElement("select");
      licSelect.className = "form-select form-select-sm gh-file-path mt-1";
      licSelect.title = "License type";
      licenses.forEach(function (l) {
        const o = document.createElement("option");
        o.value = l.id; o.textContent = l.label;
        licSelect.appendChild(o);
      });
      const lic = addPublishRow({ label: "LICENSE", note: "generated", defaultPath: "LICENSE", checked: false, extra: licSelect });
      lic.getContent = function () {
        const tpl = licenses.find(function (l) { return l.id === licSelect.value; }) || licenses[0];
        return HealthFiles.build(tpl, detailValues()).content;
      };
    } else {
      const note = document.createElement("div");
      note.className = "text-muted small gh-file-path-static";
      note.innerHTML = "<code>License Templates/</code> couldn't be loaded — serve the app to include a LICENSE.";
      const lic = addPublishRow({ label: "LICENSE", note: "unavailable", defaultPath: "LICENSE", checked: false, extra: note });
      lic.checkbox.disabled = true;
      lic.getContent = function () { return ""; };
    }
  }

  let publishItems = []; // [{ checkbox, pathInput?, path, getContent() }]

  // The values used to fill {{project}}/{{author}}/… in LICENSE & health files.
  function detailValues() {
    return {
      project: el.ghdProject.value.trim() || Workspace.state.name || "Project",
      author: el.ghdAuthor.value.trim(),
      email: el.ghdEmail.value.trim(),
      github: el.ghdGithub.value.trim(),
      year: el.ghdYear.value.trim() || String(new Date().getFullYear()),
    };
  }

  // Build the checklist of everything the app can produce: the README (from the
  // live editor), a LICENSE (generated, with a type picker), and every community
  // health file (generated). Nothing here depends on files existing on disk.
  async function buildPublishFileList() {
    el.ghFileList.innerHTML = "";
    publishItems = [];

    if (!el.ghdProject.value) el.ghdProject.value = Workspace.state.name || "";
    if (!el.ghdYear.value) el.ghdYear.value = String(new Date().getFullYear());

    // README — from the current document, path editable.
    const readme = addPublishRow({ label: "README.md", note: "the document you're editing", defaultPath: "README.md", checked: true, editablePath: true });
    readme.getContent = function () { return currentMarkdown(); };

    // LICENSE — options come from the "License Templates" folder.
    let licenses = null;
    try { licenses = await ensureLicenses(); } catch (err) { console.error(err); }
    addLicensePublishRow(licenses);

    // Community health files — loaded from the "Health Templates" folder, each
    // generated from the details above.
    let health = [];
    try { health = await ensureHealth(); } catch (err) { console.error(err); }
    health.forEach(function (tpl) {
      const row = addPublishRow({ label: tpl.label, note: "generated", defaultPath: tpl.path, checked: false });
      row.getContent = function () { return HealthFiles.build(tpl, detailValues()).content; };
    });
  }

  // Append one row and return its item object (caller attaches getContent()).
  function addPublishRow(opts) {
    const id = "ghf_" + publishItems.length;
    const row = document.createElement("div");
    row.className = "form-check gh-file-row";

    const cb = document.createElement("input");
    cb.className = "form-check-input";
    cb.type = "checkbox";
    cb.id = id;
    cb.checked = !!opts.checked;

    const label = document.createElement("label");
    label.className = "form-check-label";
    label.setAttribute("for", id);
    label.innerHTML = "<strong>" + escapeHtml(opts.label) + "</strong>" +
      (opts.note ? ' <span class="text-muted small">— ' + escapeHtml(opts.note) + "</span>" : "");

    row.appendChild(cb);
    row.appendChild(label);

    let pathInput = null;
    if (opts.editablePath) {
      pathInput = document.createElement("input");
      pathInput.className = "form-control form-control-sm gh-file-path mt-1";
      pathInput.value = opts.defaultPath;
      pathInput.spellcheck = false;
      pathInput.title = "Path in the repo";
      row.appendChild(pathInput);
    } else if (opts.extra) {
      row.appendChild(opts.extra);
    } else {
      const p = document.createElement("div");
      p.className = "text-muted small gh-file-path-static";
      p.innerHTML = "<code>" + escapeHtml(opts.defaultPath) + "</code>";
      row.appendChild(p);
    }

    el.ghFileList.appendChild(row);
    const item = { checkbox: cb, pathInput: pathInput, path: opts.defaultPath, getContent: null };
    publishItems.push(item);
    return item;
  }

  function itemPath(it) {
    const raw = it.pathInput ? it.pathInput.value : it.path;
    return String(raw || "").trim().replace(/^\/+/, "");
  }

  async function loadRepos() {
    el.ghRepoHint.textContent = "Loading your repos…";
    try {
      const repos = await GitHubPublish.listPushableRepos();
      el.ghRepoList.innerHTML = "";
      repos.forEach(function (r) {
        const opt = document.createElement("option");
        opt.value = r.full_name;
        el.ghRepoList.appendChild(opt);
      });
      el.ghRepoHint.textContent = repos.length
        ? "Pick from " + repos.length + " repo(s) you can write to, or type owner/repo."
        : "No repos listed for this token — type owner/repo manually.";
      // Best-effort: preselect a repo whose name matches the open folder.
      if (!el.ghRepo.value) {
        const folder = (Workspace.state.name || "").toLowerCase();
        const match = repos.find(function (r) { return r.full_name.split("/")[1].toLowerCase() === folder; });
        if (match) {
          el.ghRepo.value = match.full_name;
          el.ghBranch.placeholder = match.default_branch || "default";
        }
      }
    } catch (err) {
      el.ghRepoHint.textContent = "Couldn't list repos — you can still type owner/repo. (" + (err.message || "error") + ")";
    }
  }

  function setPublishStatus(html, kind) {
    const cls = kind === "success" ? "text-success" : kind === "danger" ? "text-danger" : "text-muted";
    el.ghPublishStatus.className = "small mt-2 " + cls;
    el.ghPublishStatus.innerHTML = html;
  }

  el.ghPublishBtn.addEventListener("click", doPublish);

  async function doPublish() {
    const parsed = GitHubPublish.parseRepo(el.ghRepo.value);
    if (!parsed) { setPublishStatus("Enter a repository as <code>owner/repo</code>.", "danger"); el.ghRepo.focus(); return; }

    const selected = publishItems.filter(function (it) { return it.checkbox.checked; });
    if (!selected.length) { setPublishStatus("Select at least one file to publish.", "danger"); return; }

    // Validate paths up front.
    for (const it of selected) {
      if (!itemPath(it)) { setPublishStatus("Give <strong>" + escapeHtml(it.path) + "</strong> a file path.", "danger"); return; }
    }

    const branch = el.ghBranch.value.trim(); // empty → the repo's default branch
    const message = el.ghMessage.value.trim();
    const repoLabel = parsed.owner + "/" + parsed.repo;
    const paths = selected.map(itemPath);

    // Explicit overwrite confirmation — this can replace files in the repo.
    const ok = window.confirm(
      "Publish " + selected.length + " file(s) to " + repoLabel +
      (branch ? " (branch: " + branch + ")" : "") + "?\n\n" +
      paths.map(function (p) { return "  • " + p; }).join("\n") + "\n\n" +
      "If any of these already exist in the repo, they will be REPLACED with the version from this app. " +
      "Other files in the repo are not touched."
    );
    if (!ok) return;

    await saveCurrentContent(); // keep the session copy fresh
    el.ghPublishBtn.disabled = true;

    let done = 0;
    const failures = [];
    for (const it of selected) {
      const path = itemPath(it);
      setPublishStatus('<span class="spinner-border spinner-border-sm me-1"></span>Publishing <code>' + escapeHtml(path) + "</code>…", "muted");
      try {
        const content = it.getContent();
        await GitHubPublish.putFile(parsed.owner, parsed.repo, path, content, message || ("Update " + path), branch);
        done++;
      } catch (err) {
        failures.push(path + " — " + (err.message || "failed"));
      }
    }
    el.ghPublishBtn.disabled = false;

    const repoUrl = "https://github.com/" + parsed.owner + "/" + parsed.repo + (branch ? "/tree/" + encodeURIComponent(branch) : "");
    const viewLink = ' <a href="' + escapeHtml(repoUrl) + '" target="_blank" rel="noopener">View repo <i class="bi bi-box-arrow-up-right"></i></a>';
    if (failures.length) {
      setPublishStatus("⚠️ Published " + done + " file(s); " + failures.length + " failed:<br>" +
        failures.map(escapeHtml).join("<br>") + (done ? viewLink : ""), "danger");
    } else {
      setPublishStatus("✓ Published " + done + " file(s)." + viewLink, "success");
      toast("Published " + done + " file(s) to <strong>" + escapeHtml(repoLabel) + "</strong>.");
    }
  }

  // ---- Load an existing README.md from the repo ------------------------
  el.loadReadmeBtn.addEventListener("click", function () {
    const node = findReadme(Workspace.state.tree);
    if (!node) { toast("No README.md found in this folder's root."); return; }
    importFromWorkspace(node);
  });

  // ---- Clear editor ----------------------------------------------------
  // Empties whichever editor mode is active. Confirms first when there's real
  // content so it can't wipe work by accident. Wired to both the Tools-menu
  // item and the button in the editor tab bar.
  function clearEditor() {
    if (editorHasRealContent() &&
        !window.confirm("Clear the editor?\n\nAll current content will be removed. This can't be undone.")) {
      return;
    }
    if (activeTab === "raw") {
      el.rawEditor.value = "";
    } else {
      Editor.setHtml("<p><br></p>");
    }
    saveCurrentContent();
    if (livePreviewOn) renderLivePreview();
    (activeTab === "raw" ? el.rawEditor : el.editor).focus();
    toast("Editor cleared.");
  }
  el.clearEditorBtn.addEventListener("click", clearEditor);
  if (el.clearEditorBarBtn) el.clearEditorBarBtn.addEventListener("click", clearEditor);
  function findReadme(tree) {
    if (!tree || !tree.children) return null;
    return tree.children.find((c) => c.kind === "file" && /^readme\.md$/i.test(c.name)) || null;
  }

  // ---- Drag & drop an image into the editor (writes into repo images/) --
  el.editor.addEventListener("dragover", function (e) {
    if (e.dataTransfer && Array.prototype.some.call(e.dataTransfer.items || [], (it) => it.kind === "file")) {
      e.preventDefault();
      el.editor.classList.add("drag-over");
    }
  });
  el.editor.addEventListener("dragleave", function () { el.editor.classList.remove("drag-over"); });
  el.editor.addEventListener("drop", async function (e) {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;
    const images = Array.prototype.filter.call(files, (f) => /^image\//.test(f.type));
    if (!images.length) return;
    e.preventDefault();
    el.editor.classList.remove("drag-over");
    for (const image of images) {
      const path = "images/" + image.name.replace(/[^\w.\-]+/g, "_");
      try {
        const res = await Workspace.saveFile(path, image);
        const ref = res.method === "workspace" ? path : image.name;
        // The freshly saved file isn't in the tree yet, so seed the cache with
        // the in-memory image so it displays immediately.
        Workspace.registerBlobUrl(ref, image);
        insertGenerated(imageHtml(ref, image.name.replace(/\.[^.]+$/, "")));
        toast(res.method === "workspace"
          ? "Saved &amp; embedded <code>" + escapeHtml(path) + "</code>"
          : "Image embedded (folder isn't writable here).");
      } catch (err) {
        console.error(err);
        toast("⚠️ Could not save image: " + escapeHtml(err.message || ""));
      }
    }
  });

  // In-place table editing (floating add/remove row & column toolbar).
  if (window.TableEdit) TableEdit.init(el.editor);

  // ---- Boot -------------------------------------------------------------
  async function boot() {
    initTheme();
    showLoading("Loading your projects…");
    try {
      await refreshProjectLists();
      await validateProjectsOnStartup();
    } catch (e) {
      console.warn("Startup load failed:", e);
    } finally {
      hideLoading();
    }
  }
  boot();
})();
