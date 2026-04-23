z# Kanban Bug Tracker — Presentation Notes

A walk-through of how the project is built, how it behaves at runtime, and the talking points you can use on stage.

---

## 1. What the project is

A **Kanban-style Bug Tracker** built with nothing but **HTML, CSS, and vanilla JavaScript**. No frameworks (no React, no Vue), no backend server, no database, no `npm install`. You open `index.html` in a browser and it runs.

The app is made up of:

| File | Purpose |
|---|---|
| `login.html` | Login screen (entry point when not signed in) |
| `index.html` | Dashboard + Issues tabs |
| `manage.html` | Create Projects and People |
| `app.js` | Main app logic: issues, dashboard, rendering |
| `manage.js` | Logic for the Manage page (projects/people) |
| `Auth.js` | Login, logout, and session checks |
| `styles.css` | All styling |

---

## 2. How the program works (architecture overview)

### 2a. It is a "Single-Page-ish" client-side app

Everything happens **in the browser**. There is no server that holds data — the user's own browser is the database, the UI engine, and the logic host all at once.

The lifecycle of a page is:

1. Browser loads the HTML file (e.g. `index.html`).
2. The HTML includes `<script>` tags that pull in `app.js` and `Auth.js`.
3. Those scripts run an `init()` function that:
   - Checks if the user is logged in (redirect to `login.html` if not).
   - Loads saved data from `localStorage`.
   - Attaches event listeners to buttons/forms ("bind" functions).
   - Renders the UI from the in-memory data.

### 2b. How data is stored — `localStorage`

All data lives in the browser's built-in **`localStorage`** API. `localStorage` is a key/value store that browsers keep on disk, scoped to the website's origin.

There are **two keys** the app uses:

```js
const STORAGE_KEY = "kanban_bug_tracker_data_v1";  // app data
const AUTH_KEY    = "kanban_auth_session";         // login session
```

The full application state is a single JavaScript object that looks like this:

```js
{
  nextIds: { issue: 1, person: 4, project: 4 },
  projects: [ { id: 1, name: "Web Platform" }, ... ],
  people:   [ { id: 1, name: "Maya", surname: "Stone", email: "...", projectId: 1, ... } ],
  issues:   [ { id: 1, summary: "...", status: "open", priority: "high", ... } ]
}
```

Whenever the user creates or edits something:

1. JavaScript updates the in-memory `appState` object.
2. `saveState()` runs `JSON.stringify(appState)` and writes it to `localStorage`.
3. `renderAll()` redraws the UI from the updated state.

When the page is refreshed, `loadState()` reads the string back with `JSON.parse(...)` and we're right where we left off. If no data exists yet (first visit), the app writes a **seed dataset** (three demo people, three demo projects) so the UI isn't empty.

> **Key point for the presentation:** the data persists across refreshes and even across browser restarts — but **only on that same browser profile on that same computer**. Nothing is shared between users.

### 2c. How HTML components are "injected" — and what that process is called

The app does **not** write static HTML for every card, table row, or form. Instead, JavaScript **builds HTML as strings** and writes them into the DOM using `innerHTML`.

This technique has a few names you can use interchangeably:

- **Dynamic DOM manipulation**
- **Client-side rendering (CSR)**
- **Template-literal rendering / string templating**
- **Imperative DOM injection**

Example from `app.js` (the dashboard "Workspace Size" card):

```js
document.getElementById("dashboardOverview").innerHTML = `
  <article class="dashboard-card">
    <h3>Workspace Size</h3>
    <p><strong>${totalProjects}</strong> project(s)</p>
    <p><strong>${totalPeople}</strong> people</p>
    <p><strong>${totalIssues}</strong> issues</p>
  </article>
  ...
`;
```

Step-by-step, what's happening:

1. A JavaScript **template literal** (the backtick string) interpolates live values like `${totalProjects}`.
2. The resulting string is assigned to `.innerHTML` of an existing container element.
3. The browser **parses that string into real DOM nodes** and replaces whatever was inside the container.

So the HTML for the dashboard cards, the issue table rows, the form fields, and the people list are all **generated on the fly** every time the state changes. The static HTML files are just empty "shells" with `id`s like `#dashboardOverview`, `#issuesTableBody`, `#peopleList` waiting to be filled.

To prevent HTML/script injection from user input (e.g. someone typing `<script>` into a summary field), the app runs everything user-entered through an `escapeHtml()` helper that turns `<`, `>`, `&`, `"`, `'` into safe HTML entities before injection.

---

## 3. Authentication — yes, it's hard-coded (and why)

Open `Auth.js` and you'll see the credentials sitting right at the top of the file:

```js
const ADMIN_CREDENTIALS = {
    username: "Admin",
    password: "Admin1234",
    email: "admin@bugtracker.com"
};
```

This is a **hard-coded** single-user login. The `login()` function simply checks:

```js
if (username === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password) { ... success ... }
```

### Why hard-coded?

Because there is **no backend**. A real login system needs a server to:

- Store a user table in a database.
- Hash and verify passwords.
- Issue signed tokens or session cookies.

This project is pure HTML/CSS/JS running in the browser, so there is nowhere safe to put a real user database — any JavaScript running in the browser is fully visible to the user. Hard-coding is a **demo convenience**: it proves the login flow, route protection, and session logic work, without needing infrastructure.

> **Honesty disclaimer to include if asked:** a hard-coded password in client-side JavaScript is **not secure**. Anyone can open DevTools and read it. For real production, this would move behind a server with hashed passwords.

### How the session is "remembered"

After a successful login:

```js
const session = {
  username: username,
  expires: Date.now() + (24 * 60 * 60 * 1000),  // 24 hours from now
  loginTime: new Date().toISOString()
};
localStorage.setItem(AUTH_KEY, JSON.stringify(session));
```

So the session is just another JSON object stored in `localStorage` with a **24-hour expiry timestamp**. Every protected page runs an `isAuthenticated()` check on load:

1. Read `kanban_auth_session` from `localStorage`.
2. If missing → not logged in.
3. If `Date.now() > expires` → expired, wipe it, not logged in.
4. Otherwise → logged in.

If the check fails, the page saves where the user wanted to go (`redirectAfterLogin`) and sends them to `login.html`. After login, the app reads that key and redirects them back — so if you tried to visit `manage.html` while logged out, you'll land there after signing in.

`logout()` simply removes the `AUTH_KEY` from `localStorage` and sends the user to the login page.

> **Heads-up for your live demo:** `login.html` has a small copy mismatch — the demo-credentials hint shows `admin / admin123`, but the real check in `Auth.js` is case-sensitive and requires `Admin / Admin1234`. Use `Admin / Admin1234` when you demo the login.

---

## 4. Every function the app performs (and how each one works)

### A) Authentication features (`Auth.js`)

| Function | What it does |
|---|---|
| `login(username, password)` | Validates against hard-coded admin creds; on success, writes a 24-hour session to `localStorage`. |
| `logout()` | Removes the session key and redirects to `login.html`. |
| `isAuthenticated()` | Returns `true` only if a non-expired session exists in `localStorage`. |
| `getCurrentUser()` | Reads the session and returns `{ username, loginTime }` to display in the header badge. |
| `requireAuth()` | Page-guard helper: if not authenticated, saves the current page name and redirects to login. |
| `redirectIfAuthenticated()` | Used on the login page — if you're already signed in, bounces you straight to the dashboard. |

### B) Issue management (`app.js`)

- **Create an issue** — "Create New Issue" button clears any selected issue, shows an empty form (summary, description, reporter, date, project, assignee, status, priority, target/actual dates, resolution summary). Submit pushes it into `appState.issues` with the next auto-incremented id, saves, and re-renders.
- **View an issue** — Clicking "View" on a row calls `viewIssue(id)`, which looks up the issue, sets it as `currentIssueId`, fills in the "Issue Detail" panel (`<dl>` tags) and loads the form pre-populated with that issue's values.
- **Edit an issue** — "Edit Issue" sets `editingIssueId`. The same form is reused; on submit, the existing issue in the array is replaced with the new field values instead of a new one being created.
- **Filter / search issues** — The toolbar has a text search, a status filter, and a priority filter. `getFilteredIssues()` runs on every `input`/`change` event and filters the array in memory before re-rendering just the table body. A live summary line says things like *"Showing 3 of 12 issue(s)."*

### C) Projects & people (`manage.js`, on `manage.html`)

- **Create a project** — Submits the project form, pushes `{ id, name }` onto `appState.projects`, re-renders the list.
- **Create a person** — Submits the person form. Checks the username isn't already taken (case-insensitive), then pushes a new person with name, surname, email, username, chosen project, and optional profile picture URL.
- **Assign a person to a project** — Done at creation time via the project `<select>` dropdown (populated from existing projects). Reassignment happens by editing the underlying data (the UI lists the current assignment).
- **Render people & projects** — After any change, the two lists on the Manage page are redrawn from the updated state.

### D) Dashboard (the summary views on `index.html`)

All three dashboard sections are recomputed from `appState` every render:

- **Workspace Overview** — counts of projects, people, issues; resolution rate; assigned vs. unassigned count.
- **Issue Status Health** — open issues, overdue issues, high-priority load.
- **Distribution Snapshot** — busiest project, busiest assignee, and how many projects have at least one person on them.

### E) Navigation / UX plumbing

- **Tab switching** (`switchTab`) — Toggles the `.active` class and the `hidden` attribute to show/hide Dashboard vs. Issues without reloading the page.
- **Topbar copy** (`updateTopbar`) — Changes the header title and subtitle as you switch tabs.
- **Route protection** — Small `<script>` blocks at the bottom of `index.html` and `manage.html` call `isAuthenticated()` before anything else; unauthenticated users get kicked to `login.html`.

---

## 5. How the app remembers data (recap)

Yes — it remembers data, and here is exactly how:

1. **In-memory state**: `appState` is a JavaScript object holding projects, people, issues, and the next id counters.
2. **Write path**: Every create/edit action updates `appState` and immediately calls `saveState()`, which runs `localStorage.setItem(STORAGE_KEY, JSON.stringify(appState))`.
3. **Read path**: On every page load, `loadState()` runs `JSON.parse(localStorage.getItem(STORAGE_KEY))` to rebuild `appState` from disk. If nothing is stored, it writes a seed dataset so the app isn't empty for first-time users.
4. **Session memory**: The login state lives in a separate `localStorage` key (`kanban_auth_session`) with a 24-hour expiry timestamp.

**Limitations to be honest about on stage:**

- Data only exists on that one browser on that one machine — clearing browser data wipes it.
- It is not shared between users, not synced, not backed up.
- `localStorage` is limited to ~5–10 MB per origin, which is plenty for a demo but not for real scale.
- Anyone who inspects the page can see the admin password; this is a teaching/demo project, not a production system.

---

## 6. Suggested talking track (2–3 minutes)

1. *"This is a bug tracker built with pure HTML, CSS, and JavaScript — no frameworks, no server."*
2. *"The whole app runs in the browser. Data lives in `localStorage`, which is the browser's built-in key/value store, so everything I create persists across refreshes."*
3. *"The UI is rendered dynamically — JavaScript builds HTML strings with template literals and injects them into the page using `innerHTML`. This is called client-side rendering or dynamic DOM manipulation."*
4. *"Authentication is intentionally hard-coded in `Auth.js` because there's no backend — it's a demo of the login flow, not a real security system. A successful login writes a 24-hour session into `localStorage`, and every protected page checks for it before it renders."*
5. *"The app supports: creating/editing/filtering issues, creating projects, creating and assigning people, and a live dashboard that summarises workspace health — all driven off that single in-memory state object that's mirrored to `localStorage`."*

---

## 7. Quick glossary (if you get asked)

- **`localStorage`** — a browser API that stores string key/value pairs on disk, scoped per-origin, persistent across sessions.
- **`innerHTML`** — a property of DOM elements; setting it parses an HTML string into real elements inside that node.
- **Template literal** — JavaScript string using backticks `` ` `` that can interpolate values with `${...}`.
- **Client-side rendering (CSR)** — building the page in the browser with JavaScript, instead of the server sending fully-formed HTML.
- **Session** — a record that the user is currently logged in; here it's a JSON object in `localStorage` with an expiry time.
- **Seed data** — default sample data loaded on first run so the app isn't empty.
