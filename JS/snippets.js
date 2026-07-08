/*
 * snippets.js
 * Pure generators for GitHub-flavored README building blocks. Each tool
 * describes its form fields and a generate(values) that returns HTML to insert
 * into the WYSIWYG editor. The converter turns that HTML back into correct
 * GitHub Markdown on save. Exposed as window.Snippets.
 */
(function () {
  "use strict";

  const esc = window.Util.escapeAttr;

  // ---- helpers ----------------------------------------------------------
  function img(src, alt, link) {
    const t = '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '">';
    return link ? '<a href="' + esc(link) + '">' + t + "</a>" : t;
  }

  // shields.io encodes '-' as '--', '_' as '__', ' ' as '_'.
  function badgeSeg(s) {
    return encodeURIComponent(String(s).replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_"));
  }

  // GitHub heading slug: lowercase, drop punctuation, spaces -> hyphens.
  function slug(text) {
    return String(text).toLowerCase().trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  // ---- Table of contents -----------------------------------------------
  // headings: [{level, text}]. Returns an HTML nested list of anchor links,
  // with sub-lists correctly nested inside their parent <li> so the converter
  // emits a proper indented Markdown list.
  function tocHtml(headings) {
    if (!headings.length) return "";
    const seen = {};
    const minLevel = headings.reduce((m, h) => Math.min(m, h.level), 6);
    const items = headings.map(function (h) {
      let s = slug(h.text);
      if (seen[s] !== undefined) { seen[s]++; s = s + "-" + seen[s]; } else { seen[s] = 0; }
      return { level: Math.max(minLevel, h.level), text: h.text, slug: s };
    });

    let idx = 0;
    function build(level) {
      let html = "<ul>";
      while (idx < items.length && items[idx].level >= level) {
        const it = items[idx];
        if (it.level > level) { html += build(it.level); continue; } // deeper w/o parent
        html += '<li><a href="#' + esc(it.slug) + '">' + esc(it.text) + "</a>";
        idx++;
        if (idx < items.length && items[idx].level > level) html += build(items[idx].level);
        html += "</li>";
      }
      return html + "</ul>";
    }
    return build(minLevel);
  }

  // ---- Tool descriptors -------------------------------------------------
  // Each: { id, title, icon, fields:[{name,label,type,options?,placeholder?,default?,help?}], generate(v)->html }
  const THEMES = ["default", "dark", "radical", "tokyonight", "merko", "gruvbox", "onedark", "cobalt", "synthwave", "dracula"];

  const tools = [
    {
      id: "badge",
      title: "Badge (shields.io)",
      icon: "bi-award",
      fields: [
        { name: "label", label: "Left text", placeholder: "build", default: "build" },
        { name: "message", label: "Right text", placeholder: "passing", default: "passing" },
        { name: "color", label: "Color", placeholder: "brightgreen", default: "brightgreen" },
        { name: "style", label: "Style", type: "select", options: ["flat", "flat-square", "plastic", "for-the-badge", "social"], default: "flat" },
        { name: "logo", label: "Logo (optional)", placeholder: "github" },
        { name: "link", label: "Link URL (optional)", placeholder: "https://…" },
      ],
      generate: function (v) {
        let url = "https://img.shields.io/badge/" + badgeSeg(v.label || "label") + "-" +
          badgeSeg(v.message || "message") + "-" + badgeSeg(v.color || "blue");
        const q = [];
        if (v.style) q.push("style=" + encodeURIComponent(v.style));
        if (v.logo) q.push("logo=" + encodeURIComponent(v.logo));
        if (q.length) url += "?" + q.join("&");
        return img(url, (v.label || "") + " " + (v.message || ""), v.link);
      },
    },
    {
      id: "stats",
      title: "GitHub stats card",
      icon: "bi-bar-chart",
      fields: [
        { name: "username", label: "GitHub username", placeholder: "octocat" },
        { name: "card", label: "Card", type: "select", options: ["stats", "top languages", "streak", "trophies"], default: "stats" },
        { name: "theme", label: "Theme", type: "select", options: THEMES, default: "default" },
      ],
      generate: function (v) {
        const u = encodeURIComponent(v.username || "octocat");
        const t = encodeURIComponent(v.theme || "default");
        let url, alt;
        switch (v.card) {
          case "top languages":
            url = "https://github-readme-stats.vercel.app/api/top-langs/?username=" + u + "&layout=compact&theme=" + t;
            alt = "Top languages"; break;
          case "streak":
            url = "https://github-readme-streak-stats.herokuapp.com/?user=" + u + "&theme=" + t;
            alt = "GitHub streak"; break;
          case "trophies":
            url = "https://github-profile-trophy.vercel.app/?username=" + u + "&theme=" + t;
            alt = "GitHub trophies"; break;
          default:
            url = "https://github-readme-stats.vercel.app/api?username=" + u + "&show_icons=true&theme=" + t;
            alt = v.username + "'s GitHub stats";
        }
        return img(url, alt, "https://github.com/" + u);
      },
    },
    {
      id: "social",
      title: "Social links row",
      icon: "bi-people",
      fields: [
        { name: "github", label: "GitHub username", placeholder: "octocat" },
        { name: "linkedin", label: "LinkedIn handle", placeholder: "your-name" },
        { name: "twitter", label: "X / Twitter handle", placeholder: "handle" },
        { name: "youtube", label: "YouTube channel URL", placeholder: "https://youtube.com/@you" },
        { name: "website", label: "Website URL", placeholder: "https://example.com" },
      ],
      generate: function (v) {
        const parts = [];
        const b = function (label, color, logo, link) {
          const url = "https://img.shields.io/badge/" + badgeSeg(label) + "-" + color +
            "?style=for-the-badge&logo=" + logo + "&logoColor=white";
          parts.push(img(url, label, link));
        };
        if (v.github) b("GitHub", "181717", "github", "https://github.com/" + v.github);
        if (v.linkedin) b("LinkedIn", "0A66C2", "linkedin", "https://www.linkedin.com/in/" + v.linkedin);
        if (v.twitter) b("Twitter", "1DA1F2", "twitter", "https://twitter.com/" + v.twitter);
        if (v.youtube) b("YouTube", "FF0000", "youtube", v.youtube);
        if (v.website) b("Website", "4c1", "googlechrome", v.website);
        return parts.length ? '<p>' + parts.join(" ") + "</p>" : "";
      },
    },
    {
      id: "typing",
      title: "Typing SVG banner",
      icon: "bi-cursor-text",
      fields: [
        { name: "lines", label: "Lines (one per line)", type: "textarea", placeholder: "Hi, I'm Octocat\nWelcome to my project" },
        { name: "color", label: "Color (hex, no #)", placeholder: "36BCF7", default: "36BCF7" },
      ],
      generate: function (v) {
        const lines = (v.lines || "Hello").split("\n").map((l) => l.trim()).filter(Boolean).join(";");
        const url = "https://readme-typing-svg.demolab.com?font=Fira+Code&size=24&duration=3000&color=" +
          encodeURIComponent(v.color || "36BCF7") + "&lines=" + encodeURIComponent(lines);
        return img(url, "Typing SVG");
      },
    },
    {
      id: "visitor",
      title: "Visitor counter",
      icon: "bi-eye",
      fields: [{ name: "username", label: "GitHub username", placeholder: "octocat" }],
      generate: function (v) {
        const u = encodeURIComponent(v.username || "octocat");
        return img("https://komarev.com/ghpvc/?username=" + u + "&label=Profile+views&color=0e75b6&style=flat", "Profile views");
      },
    },
    {
      id: "starHistory",
      title: "Star history chart",
      icon: "bi-star",
      fields: [{ name: "repo", label: "owner/repo", placeholder: "octocat/Hello-World" }],
      generate: function (v) {
        const r = (v.repo || "octocat/Hello-World").trim();
        return img("https://api.star-history.com/svg?repos=" + encodeURIComponent(r) + "&type=Date",
          "Star history", "https://star-history.com/#" + r + "&Date");
      },
    },
    {
      id: "contrib",
      title: "Contributors image",
      icon: "bi-person-hearts",
      fields: [{ name: "repo", label: "owner/repo", placeholder: "octocat/Hello-World" }],
      generate: function (v) {
        const r = (v.repo || "octocat/Hello-World").trim();
        return img("https://contrib.rocks/image?repo=" + encodeURIComponent(r),
          "Contributors", "https://github.com/" + r + "/graphs/contributors");
      },
    },
    {
      id: "picture",
      title: "Light / dark image",
      icon: "bi-circle-half",
      fields: [
        { name: "light", label: "Light-mode image URL/path", placeholder: "assets/logo-light.png" },
        { name: "dark", label: "Dark-mode image URL/path", placeholder: "assets/logo-dark.png" },
        { name: "alt", label: "Alt text", placeholder: "Logo" },
      ],
      generate: function (v) {
        return (
          "<picture>" +
          '<source media="(prefers-color-scheme: dark)" srcset="' + esc(v.dark || "") + '">' +
          '<source media="(prefers-color-scheme: light)" srcset="' + esc(v.light || "") + '">' +
          '<img alt="' + esc(v.alt || "") + '" src="' + esc(v.light || "") + '">' +
          "</picture>"
        );
      },
    },
    {
      id: "alert",
      title: "Alert / callout",
      icon: "bi-exclamation-diamond",
      fields: [
        { name: "type", label: "Type", type: "select", options: ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"], default: "NOTE" },
        { name: "text", label: "Text", type: "textarea", placeholder: "Useful information users should know." },
      ],
      generate: function (v) {
        const type = v.type || "NOTE";
        const body = (v.text || "").split("\n").map((l) => "<p>" + esc(l) + "</p>").join("") || "<p></p>";
        return '<blockquote data-alert="' + esc(type) + '">' + body + "</blockquote>";
      },
    },
    {
      id: "details",
      title: "Collapsible section",
      icon: "bi-chevron-bar-down",
      fields: [
        { name: "summary", label: "Summary (click target)", placeholder: "Click to expand" },
        { name: "content", label: "Hidden content", type: "textarea", placeholder: "Details go here…" },
      ],
      generate: function (v) {
        const body = (v.content || "").split("\n").map((l) => "<p>" + esc(l) + "</p>").join("") || "<p></p>";
        return "<details><summary>" + esc(v.summary || "Details") + "</summary>" + body + "</details>";
      },
    },
    {
      id: "math",
      title: "Math (LaTeX)",
      icon: "bi-calculator",
      fields: [
        { name: "mode", label: "Mode", type: "select", options: ["inline", "block"], default: "inline" },
        { name: "expr", label: "LaTeX expression", placeholder: "e = mc^2" },
      ],
      generate: function (v) {
        const expr = v.expr || "e = mc^2";
        if (v.mode === "block") {
          return '<pre data-math="block"><code>' + esc(expr) + "</code></pre>";
        }
        return '<code data-math="inline">' + esc(expr) + "</code>";
      },
    },
    {
      id: "code",
      title: "Code block",
      icon: "bi-code-square",
      fields: [
        { name: "lang", label: "Language", placeholder: "js, python, diff, bash…", default: "js" },
        { name: "code", label: "Code", type: "textarea", placeholder: "console.log('hi')" },
      ],
      generate: function (v) {
        return '<pre data-lang="' + esc(v.lang || "") + '"><code>' + esc(v.code || "") + "</code></pre>";
      },
    },
    {
      id: "backToTop",
      title: "Back-to-top link",
      icon: "bi-arrow-up-circle",
      fields: [
        { name: "target", label: "Anchor id to jump to", placeholder: "readme-top", default: "readme-top" },
        { name: "text", label: "Link text", placeholder: "Back to top", default: "back to top" },
      ],
      generate: function (v) {
        const target = slug(v.target || "readme-top");
        return '<p align="right"><a href="#' + esc(target) + '">↥ ' + esc(v.text || "back to top") + "</a></p>";
      },
    },
  ];

  const byId = {};
  tools.forEach((t) => (byId[t.id] = t));

  window.Snippets = {
    tools: tools,
    byId: byId,
    tocHtml: tocHtml,
    slug: slug,
  };
})();
