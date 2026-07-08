# Markdown Templates

Each file in this **Markdown Templates** folder is a ready-made starting point
shown in the app's **Templates** picker. Templates are loaded at runtime from
this folder, so you can add your own without touching any code.

## Add a template

1. Create a new Markdown file in this folder, e.g. `my-template.md`, and write
   the README content you want as the starting point. Use plain
   GitHub-Flavored Markdown (headings, lists, tables, task lists, fenced code,
   badges/images, blockquotes and `> [!NOTE]` style alerts all work).
2. Add an entry to [`index.json`](index.json) so the app knows about it:

   ```json
   {
     "id": "my-template",
     "name": "My Template",
     "description": "One line describing when to use this template.",
     "icon": "bi-stars",
     "file": "my-template.md"
   }
   ```

   - **id** — a unique short slug.
   - **name** — shown as the card title.
   - **description** — shown under the title.
   - **icon** — any [Bootstrap Icons](https://icons.getbootstrap.com/) class
     (e.g. `bi-box`, `bi-terminal`, `bi-window`). Optional; defaults to a file icon.
   - **file** — the Markdown file name in this folder.

3. Reload the app and open **Templates** — your template appears in the list.
   The order of the picker matches the order of entries in `index.json`.

## Note on opening the app

Templates are fetched over HTTP, so the app must be **served** (run
`start-server.bat`, or use a hosted copy such as GitHub Pages). If you open
`index.html` directly from disk (`file://`), the browser blocks reading these
files and the picker will show a message asking you to serve the app instead.
