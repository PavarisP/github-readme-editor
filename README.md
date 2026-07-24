# 😄 📝 GitHub README Editor

**A free, browser-based WYSIWYG editor for crafting beautiful GitHub README files.**

[![License](https://img.shields.io/badge/license-MIT%20%2B%20Additional%20Restrictions-blue.svg)](LICENSE) [![GitHub](https://img.shields.io/badge/GitHub-PavarisP%2FGitHub--README--Editor-181717?logo=github)](https://github.com/PavarisP/GitHub-README-Editor)

---

## ✨ Features

- **WYSIWYG Editor** — Write your README like a word processor. Bold, italic, headings, lists, tables, code blocks, and more — all with toolbar buttons.
- **Live Preview** — Toggle a live, GitHub-accurate rendered preview side by side with either the Word Processor or Raw Markdown editor.
- **Raw Markdown Mode** — Switch to plain Markdown editing when you need fine-grained control.
- **Templates Gallery** — Start from a ready-made template (Standard Project, Library, CLI Tool, Web App, Profile, Minimal).
- **GitHub Widgets** — Insert badges (shields.io), GitHub stats cards, social links, typing SVGs, visitor counters, star history charts, contributor images, and more.
- **Emoji Picker** — Browse and insert 170+ GitHub emojis with search.
- **Community Health Files** — Generate CONTRIBUTING.md, CODE\_OF\_CONDUCT.md, SECURITY.md, SUPPORT.md, issue/PR templates, and more.
- **License Generator** — Add a LICENSE file (MIT, Apache 2.0, GPL v3, BSD, ISC, Unlicense).
- **Link Checker & Linter** — Validate relative links and get lint suggestions for your Markdown.
- **One-Click Publish to GitHub** — Push your README (and other files) straight to a repo using a Personal Access Token — no backend needed.
- **Drag & Drop Images** — Drop images into the editor; they're saved to your workspace and embedded automatically.
- **Import** — Import `.html` or `.md` files (including Word exports saved as Web Page).
- **Dark / Light Theme** — Automatic system preference detection with manual toggle.
- **100% Client-Side** — No server, no accounts, no uploads. Your files never leave your computer.

## 🚀 Getting Started

### Option 1: Use the hosted version (GitHub Pages)

Open the app directly in your browser:

👉 **[https://pavarisp.github.io/GitHub-README-Editor](https://pavarisp.github.io/GitHub-README-Editor)**

### Option 2: Run locally

#### Prerequisites

- **Node.js** or **Python** (for the local server)
- **Chrome** or **Edge** (for full File System Access API support)

#### Quick start

1. **Double-click** `start-server.bat` — it will:

- Start a local web server on `http://localhost:3000`
- Wait for the server to come online
- Auto-launch the app in your default browser

1. Click **"Browse Workspace Folder"** and pick your project folder.

2. Start writing your README!

> ⚠️ **Keep the terminal window open** — the server needs to run for the app to work.

#### Manual start

```
# Using Node.js
npx serve -l 3000 .

# Using Python
python -m http.server 3000
```

Then open `http://localhost:3000` in your browser.

## 🧩 Project Structure

```
├── index.html                  # Main application page
├── CSS/
│   └── styles.css              # Full theme system (light/dark) + layout
├── JS/
│   ├── util.js                 # Shared helpers (escapeHtml, debounce)
│   ├── converter.js            # HTML → Markdown converter (built on Turndown + GFM)
│   ├── converter.legacy.js     # Original hand-written HTML → Markdown (graceful fallback)
│   ├── markdown.js             # Markdown → HTML renderer (built on markdown-it)
│   ├── markdown.legacy.js      # Original hand-written Markdown → HTML (graceful fallback)
│   ├── snippets.js             # GitHub widget generators
│   ├── templates.js            # Template loader
│   ├── emoji.js                # Emoji data
│   ├── health.js               # Community health file + license generators
│   ├── linkcheck.js            # Link checker & linter
│   ├── github.js               # GitHub API client (PAT-based)
│   ├── storage.js              # IndexedDB project persistence
│   ├── filesystem.js           # File System Access API wrapper
│   ├── editor.js               # WYSIWYG editor engine
│   ├── app.js                  # Main application logic
│   └── vendor/                 # Vendored third-party libraries (see Acknowledgments)
├── Markdown Templates/         # Extensible README templates
│   ├── index.json              # Template manifest
│   ├── standard.md
│   ├── library.md
│   ├── cli.md
│   ├── webapp.md
│   ├── profile.md
│   └── minimal.md
├── License Templates/          # Extensible license texts
│   ├── index.json              # License manifest
│   ├── mit.txt
│   ├── apache-2.0.txt
│   ├── gpl-3.0.txt
│   ├── bsd-3-clause.txt
│   ├── bsd-2-clause.txt
│   ├── isc.txt
│   └── unlicense.txt
├── start-server.bat            # Local server launcher
└── LICENSE
```

## 🧰 How It Works

This app is **entirely client-side JavaScript**. There is no backend server, no database, and no user accounts.

| Feature | How it works |
| --- | --- |
| **File access** | Uses the [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) (Chrome/Edge) or a `<input webkitdirectory>` fallback (Firefox/Safari) |
| **Saving** | Writes directly back to your folder via the File System Access API, or downloads the file as a fallback |
| **Project persistence** | Stores project metadata + folder handles in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) |
| **GitHub publishing** | Uses a user-supplied Personal Access Token to call the [GitHub Contents API](https://docs.github.com/en/rest/repos/contents) directly from the browser |
| **Templates & Licenses** | Loaded at runtime from local JSON manifests — add new ones without touching code |

## ➕ Adding Templates & Licenses

### Add a README template

1. Create a `.md` file in `Markdown Templates/`
2. Add an entry to `Markdown Templates/index.json`
3. Reload the app — it appears in the Templates picker

### Add a license

1. Create a `.txt` file in `License Templates/` with `{{author}}` and `{{year}}` placeholders
2. Add an entry to `License Templates/index.json`
3. Reload the app — it appears in the License picker

## 🙏 Built With & Acknowledgments

This project is 100% client-side and stands on the shoulders of these excellent open-source libraries. Each is **vendored locally** in `CSS/vendor/` and `JS/vendor/` (loaded from a CDN with an automatic local fallback, so the app works fully offline). All are the property of their respective authors and used under their own licenses (predominantly MIT).

**Markdown engine**

| Library | Role |
| --- | --- |
| [markdown-it](https://github.com/markdown-it/markdown-it) | Markdown → HTML rendering (live preview) |
| [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote) | Footnote support |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML → Markdown conversion (Word Processor → Markdown) |
| [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) | GitHub-Flavored Markdown (tables, strikethrough, task lists) |

> Custom conventions (GitHub `> [!NOTE]` alerts, `$…$` math, Mermaid, task lists, `data-md-src` image paths) are layered on top of these libraries via small in-house plugins/rules, so nothing is lost in either direction.

**Rendering & preview**

| Library | Role |
| --- | --- |
| [highlight.js](https://github.com/highlightjs/highlight.js) | Syntax highlighting for code blocks (with its GitHub theme, `CSS/vendor/github.min.css`) |
| [KaTeX](https://github.com/KaTeX/KaTeX) | LaTeX math rendering |
| [Mermaid](https://github.com/mermaid-js/mermaid) | Diagrams & flowcharts |

**UI**

| Library | Role |
| --- | --- |
| [Bootstrap](https://github.com/twbs/bootstrap) | Layout & components |
| [Bootstrap Icons](https://github.com/twbs/icons) | Icon set |

## 📄 License

**MIT License + Additional Restrictions** — © 2026 Pavaris Pobhirun

- ✅ Free for personal use
- ✅ May be used as a component in commercial projects
- ❌ May not be sold as a standalone product
- ℹ️ Credit/attribution required

See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request. If you like this project, please consider buy me a coffee on kofi.

# 📝 GitHub README Editor

**A free, browser-based WYSIWYG editor for crafting beautiful GitHub README files.**

[![License](https://img.shields.io/badge/license-MIT%20%2B%20Additional%20Restrictions-blue.svg)](LICENSE) [![GitHub](https://img.shields.io/badge/GitHub-PavarisP%2FGitHub--README--Editor-181717?logo=github)](https://github.com/PavarisP/GitHub-README-Editor)

---

## ✨ Features

- **WYSIWYG Editor** — Write your README like a word processor. Bold, italic, headings, lists, tables, code blocks, and more — all with toolbar buttons.
- **Live Preview** — Toggle a live, GitHub-accurate rendered preview side by side with either the Word Processor or Raw Markdown editor.
- **Raw Markdown Mode** — Switch to plain Markdown editing when you need fine-grained control.
- **Templates Gallery** — Start from a ready-made template (Standard Project, Library, CLI Tool, Web App, Profile, Minimal).
- **GitHub Widgets** — Insert badges (shields.io), GitHub stats cards, social links, typing SVGs, visitor counters, star history charts, contributor images, and more.
- **Emoji Picker** — Browse and insert 170+ GitHub emojis with search.
- **Community Health Files** — Generate CONTRIBUTING.md, CODE\_OF\_CONDUCT.md, SECURITY.md, SUPPORT.md, issue/PR templates, and more.
- **License Generator** — Add a LICENSE file (MIT, Apache 2.0, GPL v3, BSD, ISC, Unlicense).
- **Link Checker & Linter** — Validate relative links and get lint suggestions for your Markdown.
- **One-Click Publish to GitHub** — Push your README (and other files) straight to a repo using a Personal Access Token — no backend needed.
- **Drag & Drop Images** — Drop images into the editor; they're saved to your workspace and embedded automatically.
- **Import** — Import `.html` or `.md` files (including Word exports saved as Web Page).
- **Dark / Light Theme** — Automatic system preference detection with manual toggle.
- **100% Client-Side** — No server, no accounts, no uploads. Your files never leave your computer.

## 🚀 Getting Started

### Option 1: Use the hosted version (GitHub Pages)

Open the app directly in your browser:

👉 **[https://pavarisp.github.io/GitHub-README-Editor](https://pavarisp.github.io/GitHub-README-Editor)**

### Option 2: Run locally

#### Prerequisites

- **Node.js** or **Python** (for the local server)
- **Chrome** or **Edge** (for full File System Access API support)

#### Quick start

1. **Double-click** `start-server.bat` — it will:

- Start a local web server on `http://localhost:3000`
- Wait for the server to come online
- Auto-launch the app in your default browser

1. Click **"Browse Workspace Folder"** and pick your project folder.

2. Start writing your README!

> ⚠️ **Keep the terminal window open** — the server needs to run for the app to work.

#### Manual start

```
# Using Node.js
npx serve -l 3000 .

# Using Python
python -m http.server 3000
```

Then open `http://localhost:3000` in your browser.

## 🧩 Project Structure

```
├── index.html                  # Main application page
├── CSS/
│   └── styles.css              # Full theme system (light/dark) + layout
├── JS/
│   ├── util.js                 # Shared helpers (escapeHtml, debounce)
│   ├── converter.js            # HTML → Markdown converter (built on Turndown + GFM)
│   ├── converter.legacy.js     # Original hand-written HTML → Markdown (graceful fallback)
│   ├── markdown.js             # Markdown → HTML renderer (built on markdown-it)
│   ├── markdown.legacy.js      # Original hand-written Markdown → HTML (graceful fallback)
│   ├── snippets.js             # GitHub widget generators
│   ├── templates.js            # Template loader
│   ├── emoji.js                # Emoji data
│   ├── health.js               # Community health file + license generators
│   ├── linkcheck.js            # Link checker & linter
│   ├── github.js               # GitHub API client (PAT-based)
│   ├── storage.js              # IndexedDB project persistence
│   ├── filesystem.js           # File System Access API wrapper
│   ├── editor.js               # WYSIWYG editor engine
│   ├── app.js                  # Main application logic
│   └── vendor/                 # Vendored third-party libraries (see Acknowledgments)
├── Markdown Templates/         # Extensible README templates
│   ├── index.json              # Template manifest
│   ├── standard.md
│   ├── library.md
│   ├── cli.md
│   ├── webapp.md
│   ├── profile.md
│   └── minimal.md
├── License Templates/          # Extensible license texts
│   ├── index.json              # License manifest
│   ├── mit.txt
│   ├── apache-2.0.txt
│   ├── gpl-3.0.txt
│   ├── bsd-3-clause.txt
│   ├── bsd-2-clause.txt
│   ├── isc.txt
│   └── unlicense.txt
├── start-server.bat            # Local server launcher
└── LICENSE
```

## 🧰 How It Works

This app is **entirely client-side JavaScript**. There is no backend server, no database, and no user accounts.

| Feature | How it works |
| --- | --- |
| **File access** | Uses the [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) (Chrome/Edge) or a `<input webkitdirectory>` fallback (Firefox/Safari) |
| **Saving** | Writes directly back to your folder via the File System Access API, or downloads the file as a fallback |
| **Project persistence** | Stores project metadata + folder handles in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) |
| **GitHub publishing** | Uses a user-supplied Personal Access Token to call the [GitHub Contents API](https://docs.github.com/en/rest/repos/contents) directly from the browser |
| **Templates & Licenses** | Loaded at runtime from local JSON manifests — add new ones without touching code |

## ➕ Adding Templates & Licenses

### Add a README template

1. Create a `.md` file in `Markdown Templates/`
2. Add an entry to `Markdown Templates/index.json`
3. Reload the app — it appears in the Templates picker

### Add a license

1. Create a `.txt` file in `License Templates/` with `{{author}}` and `{{year}}` placeholders
2. Add an entry to `License Templates/index.json`
3. Reload the app — it appears in the License picker

## 🙏 Built With & Acknowledgments

This project is 100% client-side and stands on the shoulders of these excellent open-source libraries. Each is **vendored locally** in `CSS/vendor/` and `JS/vendor/` (loaded from a CDN with an automatic local fallback, so the app works fully offline). All are the property of their respective authors and used under their own licenses (predominantly MIT).

**Markdown engine**

| Library | Role |
| --- | --- |
| [markdown-it](https://github.com/markdown-it/markdown-it) | Markdown → HTML rendering (live preview) |
| [markdown-it-footnote](https://github.com/markdown-it/markdown-it-footnote) | Footnote support |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML → Markdown conversion (Word Processor → Markdown) |
| [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) | GitHub-Flavored Markdown (tables, strikethrough, task lists) |

> Custom conventions (GitHub `> [!NOTE]` alerts, `$…$` math, Mermaid, task lists, `data-md-src` image paths) are layered on top of these libraries via small in-house plugins/rules, so nothing is lost in either direction.

**Rendering & preview**

| Library | Role |
| --- | --- |
| [highlight.js](https://github.com/highlightjs/highlight.js) | Syntax highlighting for code blocks (with its GitHub theme, `CSS/vendor/github.min.css`) |
| [KaTeX](https://github.com/KaTeX/KaTeX) | LaTeX math rendering |
| [Mermaid](https://github.com/mermaid-js/mermaid) | Diagrams & flowcharts |

**UI**

| Library | Role |
| --- | --- |
| [Bootstrap](https://github.com/twbs/bootstrap) | Layout & components |
| [Bootstrap Icons](https://github.com/twbs/icons) | Icon set |

## 📄 License

**MIT License + Additional Restrictions** — © 2026 Pavaris Pobhirun

- ✅ Free for personal use
- ✅ May be used as a component in commercial projects
- ❌ May not be sold as a standalone product
- ℹ️ Credit/attribution required

See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

If you find this project useful, please consider support me!

 [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/V7V01VU58T)

---

Built with ❤️ by [Pavaris Pobhirun](https://github.com/PavarisP)
