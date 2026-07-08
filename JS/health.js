/*
 * health.js
 * Loads GitHub community-health files and license texts from their template
 * folders at runtime (see "Health Templates/" and "License Templates/"), so new
 * ones can be added by dropping a file in the folder and adding an entry to its
 * index.json — no code changes needed. Exposed as window.HealthFiles.
 *
 * The fetch + manifest + placeholder plumbing lives in window.TemplateLoader,
 * shared with JS/templates.js.
 *
 * Note: fetched over HTTP. When the app is opened via file:// the browser blocks
 * these requests; the loaders reject and the UI explains how to serve the app.
 */
(function () {
  "use strict";

  const T = window.TemplateLoader;

  const HEALTH_BASE = "Health Templates/";
  const LICENSE_BASE = "License Templates/";
  let healthCache = null;
  let licensesCache = null;

  // Community health files: [{ id, label, path, body }]
  async function loadHealth() {
    if (!healthCache) {
      healthCache = await T.loadManifest(HEALTH_BASE, "files", function (e, body) {
        return { id: e.id, label: e.label || e.id, path: e.path || e.label || e.id, body: body };
      });
    }
    return healthCache;
  }

  // Licenses: [{ id, label, path, body }]
  async function loadLicenses() {
    if (!licensesCache) {
      licensesCache = await T.loadManifest(LICENSE_BASE, "licenses", function (e, body) {
        return { id: e.id, label: e.label || e.id, path: e.path || "LICENSE", body: body };
      });
    }
    return licensesCache;
  }

  // Fill a loaded template's placeholders and return { path, label, content }.
  function build(tpl, values) {
    return { path: tpl.path, label: tpl.label, content: T.fill(tpl.body, values) };
  }

  window.HealthFiles = {
    loadHealth: loadHealth,
    loadLicenses: loadLicenses,
    build: build,
  };
})();
