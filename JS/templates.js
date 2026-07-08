/*
 * templates.js
 * Loads full-document README starting points from the "Markdown Templates"
 * folder at runtime, so new templates can be added by dropping a Markdown file
 * in that folder and adding an entry to its index.json — no code changes needed.
 * Exposed as window.Templates with an async load().
 *
 * Fetch + manifest plumbing is shared via window.TemplateLoader.
 *
 * Note: templates are fetched over HTTP. When the app is opened via file://
 * the browser blocks these requests; load() rejects and the UI explains how
 * to serve the app (start-server.bat / hosted copy).
 */
(function () {
  "use strict";

  const BASE = "Markdown Templates/";
  let cache = null; // { list, byId } once successfully loaded

  async function load() {
    if (cache) return cache;

    const list = await window.TemplateLoader.loadManifest(BASE, "templates", function (t, markdown) {
      return {
        id: t.id,
        name: t.name || t.id,
        description: t.description || "",
        icon: t.icon || "bi-file-text",
        markdown: markdown,
      };
    });

    const byId = {};
    list.forEach(function (t) { byId[t.id] = t; });
    cache = { list: list, byId: byId };
    return cache;
  }

  window.Templates = { load: load };
})();
