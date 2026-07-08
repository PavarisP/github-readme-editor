# Health Templates

Each file in this **Health Templates** folder is a GitHub *community health
file* the app offers in its **Community health files** dialog and in the
**Publish to GitHub** file list. They're loaded at runtime from this folder, so
you can add your own without touching any code.

Placeholders are filled in from the dialog's fields when a file is generated:

- `{{project}}` — the project name
- `{{author}}` — the author / maintainer
- `{{email}}` — a contact email
- `{{github}}` — a GitHub username (used by `FUNDING.yml`)
- `{{year}}` — the current year

## Add a health file

1. Create a new file in this folder, e.g. `roadmap.md`, containing the content.
   Use the placeholders above where values should go.
2. Add an entry to [`index.json`](index.json):

   ```json
   { "id": "roadmap", "label": "ROADMAP.md", "path": "ROADMAP.md", "file": "roadmap.md" }
   ```

   - **id** — a unique short slug.
   - **label** — shown in the checklist.
   - **path** — where the file is written in the repo (supports subfolders, e.g.
     `.github/ISSUE_TEMPLATE/bug_report.md`).
   - **file** — the file name in this folder.

3. Reload the app — your file appears in the checklist. The order matches the
   order of entries in `index.json`.

## Note on opening the app

Health files are fetched over HTTP, so the app must be **served** (run
`start-server.bat`, or use a hosted copy such as GitHub Pages). If you open
`index.html` directly from disk (`file://`), the browser blocks reading these
files and the dialog will show a message asking you to serve the app instead.
