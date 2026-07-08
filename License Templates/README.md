# License Templates

Each file in this **License Templates** folder is a license the app offers in
its **Add a LICENSE** dialog and in the **Publish to GitHub** file list. They're
loaded at runtime from this folder, so you can add your own without touching any
code.

Two placeholders are filled in automatically when a license is generated:

- `{{author}}` — the copyright holder
- `{{year}}` — the copyright year

## Add a license

1. Create a new text file in this folder, e.g. `mpl-2.0.txt`, containing the
   full license text. Use `{{author}}` and `{{year}}` where the holder and year
   should go.
2. Add an entry to [`index.json`](index.json):

   ```json
   { "id": "mpl2", "label": "Mozilla Public License 2.0", "file": "mpl-2.0.txt" }
   ```

   - **id** — a unique short slug.
   - **label** — shown in the license picker.
   - **file** — the text file name in this folder.
   - **path** — optional; the file name written to the repo. Defaults to `LICENSE`.

3. Reload the app — your license appears in the picker. The order of the picker
   matches the order of entries in `index.json`.

## Note on opening the app

Licenses are fetched over HTTP, so the app must be **served** (run
`start-server.bat`, or use a hosted copy such as GitHub Pages). If you open
`index.html` directly from disk (`file://`), the browser blocks reading these
files and the dialog will show a message asking you to serve the app instead.
