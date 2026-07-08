/*
 * templateloader.js
 * Shared helpers for the runtime template folders (License Templates,
 * Markdown Templates, Health Templates). Centralises the fetch + manifest +
 * placeholder logic so each template type doesn't re-implement it.
 * Exposed as window.TemplateLoader.
 *
 * Note: templates are fetched over HTTP. When the app is opened via file://
 * the browser blocks these requests; loads reject and the UI explains how to
 * serve the app (start-server.bat / hosted copy).
 */
(function () {
  "use strict";

  // Fetch a text file. encodeURI keeps "/" but escapes spaces in folder names.
  async function fetchText(url) {
    const res = await fetch(encodeURI(url), { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
    return res.text();
  }

  // Replace {{placeholder}} tokens from a values object (missing -> "").
  function fill(tpl, values) {
    return String(tpl).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return values && values[k] != null ? values[k] : "";
    });
  }

  // Load a folder's index.json manifest, then each listed entry's file.
  //   base   – folder path ending in "/", e.g. "License Templates/"
  //   key    – array property in the manifest, e.g. "licenses"
  //   map    – (entry, body) => object stored in the returned list
  // Returns a Promise<Array>. Callers cache the result if they want to.
  async function loadManifest(base, key, map) {
    const manifestText = await fetchText(base + "index.json");
    let manifest;
    try {
      manifest = JSON.parse(manifestText);
    } catch (e) {
      throw new Error(base + "index.json is not valid JSON: " + e.message);
    }
    const entries = (manifest && manifest[key]) || [];
    return Promise.all(
      entries.map(async function (entry) {
        const body = await fetchText(base + entry.file);
        return map(entry, body);
      })
    );
  }

  window.TemplateLoader = {
    fetchText: fetchText,
    fill: fill,
    loadManifest: loadManifest,
  };
})();
