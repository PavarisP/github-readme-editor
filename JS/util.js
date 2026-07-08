/*
 * util.js
 * Small shared helpers used across modules. Loaded first so window.Util is
 * available to every other script. Keeps HTML-escaping logic in one place
 * instead of duplicated in each file.
 */
(function () {
  "use strict";

  // Escape text for safe insertion into HTML (also safe inside attributes,
  // since quotes are escaped too).
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Debounce a function by `wait` ms. Returns a wrapped function plus a
  // `.cancel()` to clear a pending call.
  function debounce(fn, wait) {
    let t = null;
    function wrapped() {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    }
    wrapped.cancel = function () { clearTimeout(t); };
    return wrapped;
  }

  window.Util = {
    escapeHtml: escapeHtml,
    escapeAttr: escapeHtml, // same rules; alias for call-site clarity
    debounce: debounce,
  };
})();
