/*
 * filesystem.js
 * Handles browsing a workspace folder and (when supported) saving README.md
 * back into it. Uses the File System Access API where available, with a
 * <input webkitdirectory> + download fallback for other browsers.
 * Exposed as window.Workspace.
 */
(function () {
  "use strict";

  const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"];

  const state = {
    dirHandle: null, // FileSystemDirectoryHandle (API mode)
    name: "",
    tree: null, // nested tree of { name, path, kind, children, ext }
    supportsFS: typeof window.showDirectoryPicker === "function",
  };

  function extOf(name) {
    const dot = name.lastIndexOf(".");
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  }
  function isImage(name) {
    return IMAGE_EXT.indexOf(extOf(name)) !== -1;
  }

  // Directories we don't want to walk into.
  const IGNORE_DIRS = new Set([".git", "node_modules", ".vscode", ".idea", "dist", "build", ".next"]);

  // ---- File System Access API mode -------------------------------------
  async function pickDirectory() {
    const handle = await window.showDirectoryPicker();
    clearBlobCache();
    state.dirHandle = handle;
    state.name = handle.name;
    state.tree = await readDirHandle(handle, "");
    return { handle: handle, tree: state.tree, name: state.name };
  }

  // Re-open a previously stored directory handle. Ensures permission and that
  // the folder still exists. Throws a typed error otherwise so callers can
  // notify the user that the path was moved / removed / access was denied.
  async function openFromHandle(handle) {
    clearBlobCache();
    const status = await verify(handle, "read");
    if (status === "missing") throw pathError("missing", "The folder no longer exists at its original location.");
    if (status === "denied") throw pathError("denied", "Permission to read this folder was denied.");
    if (status !== "ok") throw pathError("error", "This folder could not be opened.");
    state.dirHandle = handle;
    state.name = handle.name;
    state.tree = await readDirHandle(handle, "");
    return { handle: handle, tree: state.tree, name: state.name };
  }

  function pathError(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
  }

  // Verify a handle is still usable. Returns 'ok' | 'missing' | 'denied' | 'error'.
  // `promptIfNeeded` controls whether we may show the browser permission prompt
  // (only allowed from a user gesture).
  async function verify(handle, mode, promptIfNeeded) {
    if (!handle) return "no-handle";
    if (promptIfNeeded === undefined) promptIfNeeded = true;
    const opts = { mode: mode || "read" };
    try {
      let perm = "granted";
      if (handle.queryPermission) perm = await handle.queryPermission(opts);
      if (perm === "prompt" && promptIfNeeded && handle.requestPermission) {
        perm = await handle.requestPermission(opts);
      }
      if (perm === "denied") return "denied";
      if (perm === "prompt") return "denied"; // couldn't obtain without gesture
      // Confirm the folder actually still exists by touching it.
      // eslint-disable-next-line no-unused-vars
      for await (const _entry of handle.values()) break;
      return "ok";
    } catch (err) {
      if (err && err.name === "NotFoundError") return "missing";
      if (err && err.name === "NotAllowedError") return "denied";
      return "error";
    }
  }

  async function readDirHandle(dirHandle, prefix) {
    const node = { name: dirHandle.name || prefix || "/", path: prefix, kind: "dir", children: [] };
    const entries = [];
    for await (const entry of dirHandle.values()) {
      entries.push(entry);
    }
    // Sort: dirs first, then files, alphabetically.
    entries.sort(function (a, b) {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const childPath = prefix ? prefix + "/" + entry.name : entry.name;
      if (entry.kind === "directory") {
        if (IGNORE_DIRS.has(entry.name)) continue;
        node.children.push(await readDirHandle(entry, childPath));
      } else {
        node.children.push({
          name: entry.name,
          path: childPath,
          kind: "file",
          ext: extOf(entry.name),
          isImage: isImage(entry.name),
          _handle: entry, // FileSystemFileHandle — lets us read the file later
        });
      }
    }
    return node;
  }

  // ---- Fallback (webkitdirectory) mode ---------------------------------
  function buildTreeFromFileList(fileList) {
    clearBlobCache();
    const files = Array.from(fileList);
    if (!files.length) return null;

    // webkitRelativePath looks like "MyProject/src/app.js"
    const rootName = files[0].webkitRelativePath.split("/")[0] || "workspace";
    state.name = rootName;

    const root = { name: rootName, path: "", kind: "dir", children: [] };
    const dirMap = { "": root };

    function ensureDir(pathParts) {
      let cur = "";
      let parent = root;
      for (const part of pathParts) {
        const next = cur ? cur + "/" + part : part;
        if (!dirMap[next]) {
          const dirNode = { name: part, path: next, kind: "dir", children: [] };
          dirMap[next] = dirNode;
          parent.children.push(dirNode);
        }
        parent = dirMap[next];
        cur = next;
      }
      return parent;
    }

    files.forEach(function (file) {
      const rel = file.webkitRelativePath.split("/").slice(1); // drop root name
      if (!rel.length) return;
      const fileName = rel.pop();
      // Skip ignored directories anywhere in the path.
      if (rel.some((p) => IGNORE_DIRS.has(p))) return;
      const parent = ensureDir(rel);
      const relPath = file.webkitRelativePath.split("/").slice(1).join("/");
      parent.children.push({
        name: fileName,
        path: relPath,
        kind: "file",
        ext: extOf(fileName),
        isImage: isImage(fileName),
        _file: file,
      });
    });

    // Sort recursively.
    (function sortNode(node) {
      node.children.sort(function (a, b) {
        if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(function (c) {
        if (c.kind === "dir") sortNode(c);
      });
    })(root);

    state.tree = root;
    return root;
  }

  // Read a workspace file node's text. Works in both modes: the fallback
  // stores the File object (_file); the API mode stores a handle (_handle).
  async function readFileText(node) {
    if (node._file) return node._file.text();
    if (node._handle) {
      const file = await node._handle.getFile();
      return file.text();
    }
    throw new Error("This file can't be read (re-open the folder and try again).");
  }

  // Read a workspace file node as a File/Blob (for binary files like images).
  async function readFileBlob(node) {
    if (node._file) return node._file;
    if (node._handle) return node._handle.getFile();
    throw new Error("This file can't be read (re-open the folder and try again).");
  }

  // Find a file node in the current tree by its repo-relative path.
  function findFileByPath(path) {
    if (!path) return null;
    const target = path.replace(/^\.?\//, "").toLowerCase();
    let found = null;
    (function walk(node) {
      if (!node || found) return;
      if (node.kind === "file" && node.path && node.path.toLowerCase() === target) {
        found = node;
        return;
      }
      if (node.children) node.children.forEach(walk);
    })(state.tree);
    return found;
  }

  // Object-URL cache so each embedded image is read from disk only once.
  // Repo-relative image paths (e.g. images/logo.png) can't be loaded by the
  // browser directly (the files aren't served over HTTP), so we turn them into
  // blob: URLs for display only. Markdown output always keeps the real path.
  const blobUrlCache = {};

  function registerBlobUrl(path, blob) {
    if (blobUrlCache[path]) return blobUrlCache[path];
    const url = URL.createObjectURL(blob);
    blobUrlCache[path] = url;
    return url;
  }

  async function objectUrlForPath(path) {
    if (blobUrlCache[path]) return blobUrlCache[path];
    const node = findFileByPath(path);
    if (!node) return null;
    const blob = await readFileBlob(node);
    return registerBlobUrl(path, blob);
  }

  function clearBlobCache() {
    Object.keys(blobUrlCache).forEach(function (k) {
      try { URL.revokeObjectURL(blobUrlCache[k]); } catch (e) { /* ignore */ }
      delete blobUrlCache[k];
    });
  }

  // ---- Saving ----------------------------------------------------------
  async function save(markdown, filename) {
    filename = filename || "README.md";

    // Preferred: write straight back into the picked folder.
    if (state.supportsFS && state.dirHandle) {
      try {
        // Make sure we still have write access and the folder exists.
        const status = await verify(state.dirHandle, "readwrite");
        if (status === "missing") throw pathError("missing", "The workspace folder was moved or removed, so README.md could not be saved there.");
        if (status !== "ok") throw pathError("denied", "Write access to the workspace folder was denied.");

        const fileHandle = await state.dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(markdown);
        await writable.close();
        return { method: "workspace", path: state.name + "/" + filename };
      } catch (err) {
        // A path/permission problem must be surfaced, not silently downloaded.
        if (err && err.code) throw err;
        if (err && err.name === "NotFoundError") throw pathError("missing", "The workspace folder was moved or removed, so README.md could not be saved there.");
        // Any other unexpected error: fall through to download so work isn't lost.
        console.warn("Direct save failed, falling back to download:", err);
      }
    }

    // Fallback: trigger a download.
    downloadFile(markdown, filename);
    return { method: "download", path: filename };
  }

  // Write an arbitrary file at a (possibly nested) path relative to the
  // workspace root, creating directories as needed. Falls back to a download
  // of just the file when no writable handle is available.
  // `content` may be a string or a Blob/ArrayBuffer (for images).
  async function saveFile(path, content) {
    const parts = path.split("/").filter(Boolean);
    const filename = parts.pop();

    if (state.supportsFS && state.dirHandle) {
      const status = await verify(state.dirHandle, "readwrite");
      if (status === "missing") throw pathError("missing", "The workspace folder was moved or removed.");
      if (status !== "ok") throw pathError("denied", "Write access to the workspace folder was denied.");
      let dir = state.dirHandle;
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part, { create: true });
      }
      const fileHandle = await dir.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return { method: "workspace", path: state.name + "/" + path };
    }

    // Fallback: download just the file (folders can't be created).
    downloadFile(content, filename);
    return { method: "download", path: filename };
  }

  // Does a file exist at the given root-relative path? (FS API only.)
  async function fileExists(path) {
    if (!(state.supportsFS && state.dirHandle)) return false;
    const parts = path.split("/").filter(Boolean);
    const filename = parts.pop();
    try {
      let dir = state.dirHandle;
      for (const part of parts) dir = await dir.getDirectoryHandle(part);
      await dir.getFileHandle(filename);
      return true;
    } catch (e) {
      return false;
    }
  }

  function downloadFile(text, filename) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.Workspace = {
    state: state,
    isImage: isImage,
    pickDirectory: pickDirectory,
    openFromHandle: openFromHandle,
    verify: verify,
    readFileText: readFileText,
    readFileBlob: readFileBlob,
    findFileByPath: findFileByPath,
    objectUrlForPath: objectUrlForPath,
    registerBlobUrl: registerBlobUrl,
    buildTreeFromFileList: buildTreeFromFileList,
    save: save,
    saveFile: saveFile,
    fileExists: fileExists,
    downloadFile: downloadFile,
  };
})();
