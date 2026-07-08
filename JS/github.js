/*
 * github.js
 * Optional "Publish to GitHub" support — 100% client-side, no backend.
 *
 * Uses a user-supplied Personal Access Token (PAT) to talk to the GitHub REST
 * API directly from the browser (fetch). The token authorises a real commit via
 * the "Contents" endpoint:
 *     PUT /repos/{owner}/{repo}/contents/{path}
 *
 * Why a PAT and not a "Login with GitHub" button?
 *   GitHub's OAuth web flow needs a client *secret* to exchange the code for a
 *   token, and a secret can't live in front-end JS. The device flow is blocked
 *   by CORS from browsers. So for a no-backend app a PAT is the only path — we
 *   keep it opt-in and let the user choose whether it's remembered on the device.
 *
 * Exposed as window.GitHubPublish.
 */
(function () {
  "use strict";

  const API = "https://api.github.com";
  const TOKEN_KEY = "readme-editor-gh-token"; // localStorage key (only if "remember" is on)

  // In-memory token for the session. Populated from localStorage on load if the
  // user previously chose to remember it.
  let token = null;
  let user = null; // { login, avatar_url } once validated

  function loadStoredToken() {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t) token = t;
    } catch (e) { /* localStorage unavailable */ }
    return token;
  }

  // Set the active token. `remember` persists it to localStorage (plaintext);
  // otherwise it lives only in memory for this tab session.
  function setToken(t, remember) {
    token = t || null;
    user = null;
    try {
      if (remember && t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* ignore */ }
  }

  function clearToken() {
    token = null;
    user = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  }

  function hasToken() { return !!token; }
  function isRemembered() {
    try { return !!localStorage.getItem(TOKEN_KEY); } catch (e) { return false; }
  }
  function currentUser() { return user; }

  // ---- Low-level request helper ----------------------------------------
  async function api(method, path, body) {
    if (!token) throw ghError("no-token", "No GitHub token set.");
    let res;
    try {
      res = await fetch(API + path, {
        method: method,
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (netErr) {
      // Network failure / CORS / offline.
      throw ghError("network", "Couldn't reach GitHub. Check your connection and try again.");
    }

    if (res.status === 401) throw ghError("auth", "GitHub rejected the token. It may be wrong, expired, or lacking access.");
    if (res.status === 403) {
      const msg = res.headers.get("x-ratelimit-remaining") === "0"
        ? "GitHub rate limit reached — wait a bit and try again."
        : "GitHub denied this action. The token may not have write access to this repo.";
      throw ghError("forbidden", msg);
    }

    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }

    if (!res.ok) {
      const detail = (data && data.message) ? data.message : "HTTP " + res.status;
      const e = ghError("http", detail);
      e.status = res.status;
      throw e;
    }
    return data;
  }

  function ghError(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
  }

  // ---- Public operations -----------------------------------------------

  // Validate the current token by fetching the authenticated user.
  async function connect() {
    const me = await api("GET", "/user");
    user = { login: me.login, avatar_url: me.avatar_url };
    return user;
  }

  // List repos the user can push to (most recently pushed first).
  // Fine-grained tokens scoped to a single repo will simply return that one.
  async function listPushableRepos() {
    const out = [];
    // A couple of pages is plenty for a picker; avoids hammering the API.
    for (let page = 1; page <= 3; page++) {
      const repos = await api("GET", "/user/repos?per_page=100&sort=pushed&page=" + page);
      if (!repos || !repos.length) break;
      repos.forEach(function (r) {
        if (r.permissions && r.permissions.push) {
          out.push({ full_name: r.full_name, default_branch: r.default_branch, private: r.private });
        }
      });
      if (repos.length < 100) break;
    }
    return out;
  }

  // Get the blob SHA of an existing file (needed to update it), or null if the
  // file doesn't exist yet (so we create it fresh).
  async function getFileSha(owner, repo, path, branch) {
    const q = branch ? "?ref=" + encodeURIComponent(branch) : "";
    try {
      const data = await api("GET", contentsUrl(owner, repo, path) + q);
      // A directory returns an array; only a file has a .sha we can update.
      return data && !Array.isArray(data) ? data.sha : null;
    } catch (err) {
      if (err.status === 404) return null; // file not there yet
      throw err;
    }
  }

  // Create or update a file. Returns the commit info from GitHub.
  async function putFile(owner, repo, path, content, message, branch) {
    const sha = await getFileSha(owner, repo, path, branch);
    const body = {
      message: message || ("Update " + path),
      content: toBase64Utf8(content),
    };
    if (branch) body.branch = branch;
    if (sha) body.sha = sha; // update in place; omit to create
    const res = await api("PUT", contentsUrl(owner, repo, path), body);
    return {
      created: !sha,
      htmlUrl: res && res.content && res.content.html_url,
      commitUrl: res && res.commit && res.commit.html_url,
    };
  }

  function contentsUrl(owner, repo, path) {
    const cleanPath = String(path).split("/").filter(Boolean).map(encodeURIComponent).join("/");
    return "/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/contents/" + cleanPath;
  }

  // Base64-encode a JS string as UTF-8 (btoa alone mishandles non-Latin1).
  function toBase64Utf8(str) {
    const bytes = new TextEncoder().encode(String(str));
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }

  // Split a "owner/repo" string. Tolerates a full URL or trailing slashes.
  function parseRepo(input) {
    let s = String(input || "").trim();
    s = s.replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/\/+$/,"");
    const parts = s.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  }

  loadStoredToken();

  window.GitHubPublish = {
    setToken: setToken,
    clearToken: clearToken,
    hasToken: hasToken,
    isRemembered: isRemembered,
    currentUser: currentUser,
    connect: connect,
    listPushableRepos: listPushableRepos,
    getFileSha: getFileSha,
    putFile: putFile,
    parseRepo: parseRepo,
  };
})();
