const STORAGE_KEY = "kanban_bug_tracker_data_v1";
const STATUSES = ["open", "resolved", "overdue"];
const PRIORITIES = ["low", "medium", "high"];
const TAB_COPY = {
  dashboard: {
    title: "Dashboard",
    description: "All bug details including reporter, assignee, priority, and status.",
  },
  project: {
    title: "Project",
    description: "View project status, existing projects, and issue volume by project.",
  },
  issues: {
    title: "Issues",
    description: "View and analyze bugs, ownership, and lifecycle status.",
  },
  people: {
    title: "People",
    description: "Create accounts and view people grouped by their corresponding projects.",
  },
};

const appState = loadState();
let currentIssueId = null;

init();

function init() {
  bindTabs();
  bindPeopleForm();
  bindProjectForm();
  renderAll();
  updateTopbar("dashboard");
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!parsed.nextIds) parsed.nextIds = { issue: 1, person: 1, project: 1 };
    parsed.people = (parsed.people || []).map(person => ({
      ...person,
      projectId: person.projectId || null,
    }));
    return parsed;
  }

  const seed = {
    nextIds: { issue: 1, person: 4, project: 4 },
    people: [
      { id: 1, name: "Maya", surname: "Stone", email: "maya.stone@example.com", username: "mstone", projectId: 1, profilePictureUrl: "https://i.pravatar.cc/80?img=11" },
      { id: 2, name: "Liam", surname: "Nguyen", email: "liam.nguyen@example.com", username: "lnguyen", projectId: 2, profilePictureUrl: "https://i.pravatar.cc/80?img=12" },
      { id: 3, name: "Ava", surname: "Patel", email: "ava.patel@example.com", username: "apatel", projectId: 3, profilePictureUrl: "https://i.pravatar.cc/80?img=13" },
    ],
    projects: [
      { id: 1, name: "Web Platform" },
      { id: 2, name: "Mobile App" },
      { id: 3, name: "API Gateway" },
    ],
    issues: [],
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab.id === tabId));
  updateTopbar(tabId);
}

function bindPeopleForm() {
  document.getElementById("personForm").addEventListener("submit", e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const username = form.get("username").trim();

    if (appState.people.some(person => person.username.toLowerCase() === username.toLowerCase())) {
      alert("Username must be unique.");
      return;
    }

    appState.people.push({
      id: appState.nextIds.person++,
      name: form.get("name").trim(),
      surname: form.get("surname").trim(),
      email: form.get("email").trim(),
      username,
      projectId: Number(form.get("projectId")),
      profilePictureUrl: form.get("profilePictureUrl").trim(),
    });

    e.target.reset();
    saveState();
    renderAll();
  });
}

function bindProjectForm() {
  document.getElementById("projectForm").addEventListener("submit", e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const name = form.get("name").trim();
    if (!name) return;

    appState.projects.push({ id: appState.nextIds.project++, name });
    e.target.reset();
    saveState();
    renderAll();
  });
}

function renderAll() {
  renderPeopleProjectOptions();
  renderBoardSummary();
  renderBoard();
  renderDashboardIssueOverview();
  renderIssueAnalytics();
  renderIssueTable();
  renderPeople();
  renderProjects();
  renderProjectReport();
  renderIssueDetail(appState.issues.find(issue => issue.id === currentIssueId) || {
    id: "-",
    summary: "No issue selected",
    description: "Select any issue from the dashboard board or issues table to inspect its details.",
    identifiedById: null,
    identifiedDate: "-",
    projectId: null,
    assigneeId: null,
    status: "-",
    priority: "-",
    targetResolutionDate: "-",
    actualResolutionDate: "-",
    resolutionSummary: "-",
  });

}

function updateTopbar(tabId) {
  const copy = TAB_COPY[tabId] || { title: "Kanban Bug Tracker", description: "" };
  document.getElementById("topbarTitle").textContent = copy.title;
  document.getElementById("topbarDescription").textContent = copy.description;
}

function renderBoardSummary() {
  const summary = document.getElementById("boardSummary");
  const totalIssues = appState.issues.length;
  const unassignedCount = appState.issues.filter(issue => !issue.assigneeId).length;
  const peopleWithIssues = appState.people
    .map(person => ({
      person,
      assignedCount: appState.issues.filter(issue => issue.assigneeId === person.id).length,
      openCount: appState.issues.filter(issue => issue.assigneeId === person.id && issue.status === "open").length,
    }))
    .sort((a, b) => b.assignedCount - a.assignedCount || a.person.name.localeCompare(b.person.name));

  summary.innerHTML = `
    <article class="dashboard-card">
      <h3>Issue Totals</h3>
      <p><strong>${totalIssues}</strong> total issue(s)</p>
      <p>${appState.issues.filter(issue => issue.status === "open").length} open · ${appState.issues.filter(issue => issue.status === "resolved").length} resolved · ${appState.issues.filter(issue => issue.status === "overdue").length} overdue</p>
      <p>${unassignedCount} unassigned issue(s)</p>
    </article>
    <article class="dashboard-card">
      <h3>Priority Mix</h3>
      <p>High: <strong>${appState.issues.filter(issue => issue.priority === "high").length}</strong></p>
      <p>Medium: <strong>${appState.issues.filter(issue => issue.priority === "medium").length}</strong></p>
      <p>Low: <strong>${appState.issues.filter(issue => issue.priority === "low").length}</strong></p>
    </article>
    <article class="dashboard-card">
      <h3>People Workload</h3>
      <ul class="dashboard-list">
        ${peopleWithIssues.map(row => `<li>${escapeHtml(fullName(row.person))}: ${row.assignedCount} assigned (${row.openCount} open)</li>`).join("") || "<li>No people found.</li>"}
      </ul>
    </article>
  `;
}

function renderBoard() {
  const board = document.getElementById("boardColumns");
  board.innerHTML = "";

  STATUSES.forEach(status => {
    const issues = appState.issues
      .filter(issue => issue.status === status)
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

    const cards = issues.length
      ? issues.map(issue => {
          const project = getProject(issue.projectId)?.name || "No project";
          const assignee = getPerson(issue.assigneeId) ? fullName(getPerson(issue.assigneeId)) : "Unassigned";

          return `
            <article class="card">
              <p class="priority ${issue.priority}">${issue.priority.toUpperCase()}</p>
              <h4>${escapeHtml(issue.summary)}</h4>
              <p>${escapeHtml(project)}</p>
              <small>Assigned: ${escapeHtml(assignee)}</small>
              <div class="table-actions" style="margin-top: .5rem;">
                <button onclick="viewIssue(${issue.id})">View</button>
              </div>
            </article>
          `;
        }).join("")
      : `<p style="color:#9ca3af">No issues in this column.</p>`;

    board.innerHTML += `
      <section class="column">
        <h3>${capitalize(status)}</h3>
        <small style="color:#9ca3af">${issues.length} issue(s)</small>
        <div class="cards">${cards}</div>
      </section>
    `;
  });
}

function renderIssueTable() {
  const body = document.getElementById("issuesTableBody");
  body.innerHTML = appState.issues.map(issue => {
    const reporter = fullName(getPerson(issue.identifiedById));
    const project = getProject(issue.projectId)?.name || "-";
    const assignee = getPerson(issue.assigneeId) ? fullName(getPerson(issue.assigneeId)) : "Unassigned";

    return `
      <tr>
        <td>#${issue.id}</td>
        <td>${escapeHtml(issue.summary)}</td>
        <td>${escapeHtml(reporter)}</td>
        <td>${escapeHtml(project)}</td>
        <td>${escapeHtml(assignee)}</td>
        <td>${escapeHtml(issue.status)}</td>
        <td>${escapeHtml(issue.priority)}</td>
        <td>${escapeHtml(issue.identifiedDate)}</td>
        <td>
          <div class="table-actions">
            <button onclick="viewIssue(${issue.id})">View</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderDashboardIssueOverview() {
  const body = document.getElementById("dashboardIssueBody");
  body.innerHTML = appState.issues.map(issue => {
    const reporter = fullName(getPerson(issue.identifiedById));
    const assignee = getPerson(issue.assigneeId) ? fullName(getPerson(issue.assigneeId)) : "Unassigned";
    const project = getProject(issue.projectId)?.name || "-";
    return `
      <tr>
        <td>#${issue.id}</td>
        <td>${escapeHtml(issue.summary)}</td>
        <td>${escapeHtml(reporter)}</td>
        <td>${escapeHtml(assignee)}</td>
        <td>${escapeHtml(project)}</td>
        <td>${escapeHtml(issue.status)}</td>
        <td>${escapeHtml(issue.priority)}</td>
      </tr>
    `;
  }).join("");
}

function renderIssueAnalytics() {
  document.getElementById("issueAnalytics").innerHTML = `
    <article class="dashboard-card">
      <h3>Status Breakdown</h3>
      <p>Open: <strong>${appState.issues.filter(issue => issue.status === "open").length}</strong></p>
      <p>Resolved: <strong>${appState.issues.filter(issue => issue.status === "resolved").length}</strong></p>
      <p>Overdue: <strong>${appState.issues.filter(issue => issue.status === "overdue").length}</strong></p>
    </article>
    <article class="dashboard-card">
      <h3>Priority Breakdown</h3>
      <p>High: <strong>${appState.issues.filter(issue => issue.priority === "high").length}</strong></p>
      <p>Medium: <strong>${appState.issues.filter(issue => issue.priority === "medium").length}</strong></p>
      <p>Low: <strong>${appState.issues.filter(issue => issue.priority === "low").length}</strong></p>
    </article>
  `;
}

function renderIssueDetail(issue) {
  const identifiedBy = fullName(getPerson(issue.identifiedById)) || "-";
  const assignee = getPerson(issue.assigneeId) ? fullName(getPerson(issue.assigneeId)) : "Unassigned";
  const project = getProject(issue.projectId)?.name || "-";

  const detail = document.getElementById("issueDetail");
  detail.innerHTML = `
    <dt>ID</dt><dd>#${issue.id}</dd>
    <dt>Summary</dt><dd>${escapeHtml(issue.summary)}</dd>
    <dt>Description</dt><dd>${escapeHtml(issue.description)}</dd>
    <dt>Identified by</dt><dd>${escapeHtml(identifiedBy)}</dd>
    <dt>Identified date</dt><dd>${escapeHtml(issue.identifiedDate)}</dd>
    <dt>Project</dt><dd>${escapeHtml(project)}</dd>
    <dt>Assignee</dt><dd>${escapeHtml(assignee)}</dd>
    <dt>Status</dt><dd>${escapeHtml(issue.status)}</dd>
    <dt>Priority</dt><dd>${escapeHtml(issue.priority)}</dd>
    <dt>Target resolution date</dt><dd>${escapeHtml(issue.targetResolutionDate || "-")}</dd>
    <dt>Actual resolution date</dt><dd>${escapeHtml(issue.actualResolutionDate || "-")}</dd>
    <dt>Resolution summary</dt><dd>${escapeHtml(issue.resolutionSummary || "-")}</dd>
  `;
}

function renderPeople() {
  const peopleList = document.getElementById("peopleList");
  peopleList.innerHTML = appState.people.map(person => `
    <li>
      <img src="${person.profilePictureUrl || "https://via.placeholder.com/40"}" alt="${escapeHtml(fullName(person))}" />
      <div>
        <strong>${escapeHtml(fullName(person))}</strong>
        <p>${escapeHtml(person.email)} · @${escapeHtml(person.username)}</p>
        <small>Project: ${escapeHtml(getProject(person.projectId)?.name || "Unassigned")}</small>
      </div>
    </li>
  `).join("");
}

function renderProjects() {
  document.getElementById("projectList").innerHTML = appState.projects
    .map(project => {
      const total = appState.issues.filter(issue => issue.projectId === project.id).length;
      return `<li>${project.id} - ${escapeHtml(project.name)} <small>(${total} issue(s))</small></li>`;
    })
    .join("");
}

function renderProjectReport() {
  const rows = appState.projects
    .map(project => ({
      name: project.name,
      count: appState.issues.filter(issue => issue.projectId === project.id).length,
      open: appState.issues.filter(issue => issue.projectId === project.id && issue.status === "open").length,
      resolved: appState.issues.filter(issue => issue.projectId === project.id && issue.status === "resolved").length,
      overdue: appState.issues.filter(issue => issue.projectId === project.id && issue.status === "overdue").length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  document.getElementById("projectReportBody").innerHTML = rows
    .map(row => `<tr><td>${escapeHtml(row.name)}</td><td>${row.count}</td><td>${row.open}</td><td>${row.resolved}</td><td>${row.overdue}</td></tr>`)
    .join("");
}

function viewIssue(id) {
  const issue = appState.issues.find(it => it.id === id);
  if (!issue) return;
  currentIssueId = id;
  renderIssueDetail(issue);
  switchTab("issues");
}

function renderPeopleProjectOptions() {
  const select = document.getElementById("personProjectSelect");
  if (!select) return;
  select.innerHTML = appState.projects
    .map(project => `<option value="${project.id}">${escapeHtml(project.name)}</option>`)
    .join("");
}

function getPerson(id) {
  return appState.people.find(person => person.id === id) || null;
}

function getProject(id) {
  return appState.projects.find(project => project.id === id) || null;
}

function fullName(person) {
  if (!person) return "";
  return `${person.name} ${person.surname}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function priorityRank(priority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

window.viewIssue = viewIssue;
