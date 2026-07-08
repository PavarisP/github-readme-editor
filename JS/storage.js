/*
 * storage.js
 * Persists projects across browser sessions using IndexedDB.
 *
 * Why IndexedDB and not cookies/localStorage?
 *   - Cookies are tiny (~4KB) and sent on every request — wrong tool.
 *   - A FileSystemDirectoryHandle (what lets us re-open a folder and detect a
 *     moved/removed path) is a structured-cloneable object that CAN be stored
 *     in IndexedDB but NOT in localStorage/cookies. So IndexedDB it is.
 *   - The lightweight theme preference does live in localStorage.
 *
 * Exposed as window.Store.
 */
(function () {
  "use strict";

  const DB_NAME = "readme-editor";
  const DB_VERSION = 1;
  const STORE = "projects";
  const THEME_KEY = "readme-editor-theme";

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: "id" });
          os.createIndex("updatedAt", "updatedAt");
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(mode) {
    return openDB().then(function (db) {
      return db.transaction(STORE, mode).objectStore(STORE);
    });
  }

  function reqToPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  // ---- Project CRUD -----------------------------------------------------

  // Returns all projects, most-recently-updated first.
  async function listProjects() {
    const store = await tx("readonly");
    const all = await reqToPromise(store.getAll());
    all.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    return all;
  }

  async function getProject(id) {
    const store = await tx("readonly");
    return reqToPromise(store.get(id));
  }

  async function putProject(record) {
    const store = await tx("readwrite");
    await reqToPromise(store.put(record));
    return record;
  }

  async function deleteProject(id) {
    const store = await tx("readwrite");
    return reqToPromise(store.delete(id));
  }

  // Find an existing project that points at the same folder as `handle`
  // (uses FileSystemHandle.isSameEntry). Falls back to name match for
  // fallback-mode projects with no handle.
  async function findByHandle(handle, name) {
    const all = await listProjects();
    for (const p of all) {
      if (handle && p.handle && p.handle.isSameEntry) {
        try {
          if (await p.handle.isSameEntry(handle)) return p;
        } catch (e) { /* ignore */ }
      } else if (!handle && !p.handle && p.name === name) {
        return p;
      }
    }
    return null;
  }

  // ---- Theme ------------------------------------------------------------
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || null; } catch (e) { return null; }
  }
  function setTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
  }

  // Simple id generator (no Date/random dependency issues in the browser).
  function newId() {
    return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  window.Store = {
    listProjects: listProjects,
    getProject: getProject,
    putProject: putProject,
    deleteProject: deleteProject,
    findByHandle: findByHandle,
    getTheme: getTheme,
    setTheme: setTheme,
    newId: newId,
  };
})();
