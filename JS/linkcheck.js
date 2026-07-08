/*
 * linkcheck.js
 * Scans README markdown for links/images and validates the relative ones
 * against the set of files in the opened workspace. Also runs a few
 * GitHub-flavored lint checks. Exposed as window.LinkCheck.
 */
(function () {
  "use strict";

  // Collect every file path in the workspace tree into a lowercased Set.
  function collectPaths(tree) {
    const set = new Set();
    (function walk(node) {
      if (!node || !node.children) return;
      node.children.forEach(function (c) {
        if (c.kind === "dir") walk(c);
        else set.add(c.path.toLowerCase());
      });
    })(tree);
    return set;
  }

  function isExternal(url) {
    return /^([a-z]+:)?\/\//i.test(url) || /^(mailto:|tel:|data:)/i.test(url);
  }
  function isAnchor(url) {
    return url.charAt(0) === "#";
  }

  // Normalize a repo-relative link to compare against the file set.
  function normalize(url) {
    let u = url.split("#")[0].split("?")[0].trim();
    u = u.replace(/^\.\//, "").replace(/^\//, "");
    return u.toLowerCase();
  }

  // Extract link/image references from markdown.
  // Returns [{ raw, url, kind: 'image'|'link', line }]
  function extractRefs(md) {
    const refs = [];
    const lines = md.split("\n");
    // inline images ![alt](url) and links [text](url)
    const re = /(!?)\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
    lines.forEach(function (line, i) {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(line))) {
        refs.push({ raw: m[0], url: m[2], kind: m[1] === "!" ? "image" : "link", line: i + 1 });
      }
    });
    // HTML <img src> and <a href>
    const htmlRe = /<(?:img[^>]*\bsrc|a[^>]*\bhref|source[^>]*\bsrcset)\s*=\s*["']([^"']+)["']/gi;
    lines.forEach(function (line, i) {
      let m;
      htmlRe.lastIndex = 0;
      while ((m = htmlRe.exec(line))) {
        refs.push({ raw: m[0], url: m[1], kind: /img|source/i.test(m[0]) ? "image" : "link", line: i + 1 });
      }
    });
    return refs;
  }

  // Main: check markdown against a workspace tree. Returns a report.
  function check(md, tree) {
    const paths = collectPaths(tree);
    const refs = extractRefs(md);
    const broken = [];
    let external = 0, anchors = 0, ok = 0;

    refs.forEach(function (ref) {
      if (isExternal(ref.url)) { external++; return; }
      if (isAnchor(ref.url)) { anchors++; return; }
      const norm = normalize(ref.url);
      if (!norm) return;
      if (paths.has(norm)) { ok++; }
      else { broken.push(ref); }
    });

    return {
      total: refs.length,
      ok: ok,
      external: external,
      anchors: anchors,
      broken: broken,
      lint: lint(md),
      canValidate: paths.size > 0,
    };
  }

  // Lightweight GitHub-flavored lint warnings.
  function lint(md) {
    const warnings = [];
    const lines = md.split("\n");

    // Images without alt text
    let m;
    const imgRe = /!\[\s*\]\(/g;
    lines.forEach(function (line, i) {
      imgRe.lastIndex = 0;
      if (imgRe.test(line)) warnings.push({ line: i + 1, msg: "Image is missing alt text (accessibility)." });
    });

    // Heading level jumps (e.g. # then ###)
    let prev = 0;
    lines.forEach(function (line, i) {
      const h = line.match(/^(#{1,6})\s/);
      if (h) {
        const level = h[1].length;
        if (prev && level > prev + 1) {
          warnings.push({ line: i + 1, msg: "Heading jumps from H" + prev + " to H" + level + " (skips a level)." });
        }
        prev = level;
      }
    });

    // No top-level H1
    if (!/^#\s/m.test(md)) {
      warnings.push({ line: 1, msg: "No top-level H1 (# Title) found — most READMEs start with one." });
    }

    // Bare URLs (not in a link or image)
    lines.forEach(function (line, i) {
      const stripped = line.replace(/\]\([^)]*\)/g, "").replace(/<[^>]+>/g, "");
      if (/(^|\s)https?:\/\/\S+/.test(stripped)) {
        warnings.push({ line: i + 1, msg: "Bare URL — consider using [text](url) for a nicer link." });
      }
    });

    return warnings;
  }

  window.LinkCheck = { check: check, extractRefs: extractRefs };
})();
