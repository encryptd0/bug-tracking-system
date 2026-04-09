const STORAGE_KEY = "kanban_bug_tracker_data_v1";
const STATUSES = ["open", "resolved", "overdue"];
const PRIORITIES = ["low", "medium", "high"];
const TAB_COPY = {
  dashboard: {
    title: "Dashboard",
    description: "A unique high-level summary of projects, people, and issue health.",
  },
  issues: {
    title: "Issues",
    description: "Create, view, and edit issue details only.",
  },
};

const appState = loadState();
let currentIssueId = null;
let editingIssueId = null;

init();

function init() {
  bindTabs();
  bindIssueActions();
  bindIssueFilters();
  renderAll();
  switchTab("dashboard");
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
  document.querySelectorAll(".tab").forEach(tab => {
    const isActive = tab.id === tabId;
    tab.classList.toggle("active", isActive);
    tab.hidden = !isActive;
  });
  updateTopbar(tabId);
}

function bindPeopleForm() {
  document.getElementById("personForm").addEventListener("submit", e => {
    e.preventDefault();

    if (!isTabActive("people")) {
      alert("People can only be created from the People tab.");
      return;
    }

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

    if (!isTabActive("project")) {
      alert("Projects can only be created from the Projects tab.");
      return;
    }

    const form = new FormData(e.target);
    const name = form.get("name").trim();
    if (!name) return;

    appState.projects.push({ id: appState.nextIds.project++, name });
    e.target.reset();
    saveState();
    renderAll();
  });
}

function bindIssueActions() {
  document.getElementById("createIssueBtn").addEventListener("click", () => {
    editingIssueId = null;
    currentIssueId = null;
    renderIssueForm();
    document.getElementById("issueDetail").innerHTML = `<dt>Issue</dt><dd>Select an issue from the issues table to view details.</dd>`;
    switchTab("issues");
  });

  document.getElementById("detailEditBtn").addEventListener("click", () => {
    if (!currentIssueId) {
      alert("Select an issue first.");
      return;
    }
    startEditIssue(currentIssueId);
  });
}

function bindIssueFilters() {
  const searchInput = document.getElementById("issueSearchInput");
  const statusFilter = document.getElementById("issueStatusFilter");
  const priorityFilter = document.getElementById("issuePriorityFilter");

  [searchInput, statusFilter, priorityFilter].forEach(control => {
    if (!control) return;
    control.addEventListener("input", renderIssueTable);
    control.addEventListener("change", renderIssueTable);
  });
}

function renderIssueForm(issue = null) {
  const issueForm = document.getElementById("issueForm");

  if (!appState.people.length || !appState.projects.length) {
    document.getElementById("issueFormTitle").textContent = "Create Issue";
    issueForm.innerHTML = `<p>Add at least one project and one person on the Manage Projects & People page before creating issues.</p>`;
    issueForm.onsubmit = null;
    return;
  }
  const identifiedByOptions = appState.people
    .map(p => `<option value="${p.id}" ${issue?.identifiedById === p.id ? "selected" : ""}>${fullName(p)}</option>`)
    .join("");

  const assigneeOptions = [`<option value="">Unassigned</option>`]
    .concat(appState.people.map(p => `<option value="${p.id}" ${issue?.assigneeId === p.id ? "selected" : ""}>${fullName(p)}</option>`))
    .join("");

  const projectOptions = appState.projects
    .map(project => `<option value="${project.id}" ${issue?.projectId === project.id ? "selected" : ""}>${project.name}</option>`)
    .join("");

  const statusOptions = STATUSES
    .map(status => `<option value="${status}" ${issue ? (issue.status === status ? "selected" : "") : (status === "open" ? "selected" : "")}>${capitalize(status)}</option>`)
    .join("");

  const priorityOptions = PRIORITIES
    .map(priority => `<option value="${priority}" ${issue ? (issue.priority === priority ? "selected" : "") : (priority === "medium" ? "selected" : "")}>${capitalize(priority)}</option>`)
    .join("");

  document.getElementById("issueFormTitle").textContent = issue ? `Edit Issue #${issue.id}` : "Create Issue";

  issueForm.innerHTML = `
    <label>Summary <input name="summary" required value="${escapeHtml(issue?.summary || "")}" /></label>
    <label>Detailed Description <textarea name="description" required>${escapeHtml(issue?.description || "")}</textarea></label>
    <label>Identified By <select name="identifiedById" required>${identifiedByOptions}</select></label>
    <label>Identified Date <input type="date" name="identifiedDate" required value="${issue?.identifiedDate || today()}" /></label>
    <label>Project <select name="projectId" required>${projectOptions}</select></label>
    <label>Assigned To <select name="assigneeId">${assigneeOptions}</select></label>
    <label>Status <select name="status" required>${statusOptions}</select></label>
    <label>Priority <select name="priority" required>${priorityOptions}</select></label>
    <label>Target Resolution Date <input type="date" name="targetResolutionDate" value="${issue?.targetResolutionDate || ""}" /></label>
    <label>Actual Resolution Date <input type="date" name="actualResolutionDate" value="${issue?.actualResolutionDate || ""}" /></label>
    <label>Resolution Summary <textarea name="resolutionSummary">${escapeHtml(issue?.resolutionSummary || "")}</textarea></label>
    <button type="submit">Save Issue</button>
  `;

  issueForm.onsubmit = event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(issueForm).entries());

    const issueData = {
      summary: payload.summary.trim(),
      description: payload.description.trim(),
      identifiedById: Number(payload.identifiedById),
      identifiedDate: payload.identifiedDate,
      projectId: Number(payload.projectId),
      assigneeId: payload.assigneeId ? Number(payload.assigneeId) : null,
      status: payload.status,
      priority: payload.priority,
      targetResolutionDate: payload.targetResolutionDate || "",
      actualResolutionDate: payload.actualResolutionDate || "",
      resolutionSummary: payload.resolutionSummary.trim(),
    };

    if (!issueData.summary) {
      alert("Summary is required.");
      return;
    }

    if (editingIssueId) {
      const index = appState.issues.findIndex(it => it.id === editingIssueId);
      appState.issues[index] = { ...appState.issues[index], ...issueData };
      editingIssueId = null;
    } else {
      appState.issues.push({ id: appState.nextIds.issue++, ...issueData });
    }

    issueForm.reset();
    saveState();
    renderAll();
    switchTab("issues");
  };
}

function renderAll() {
  renderPeopleProjectOptions();
  renderDashboardOverview();
  renderDashboardStatusHealth();
  renderDashboardDistribution();
  renderIssueTable();
  renderIssueDetail(appState.issues.find(issue => issue.id === currentIssueId) || {
    id: "-",
    summary: "No issue selected",
    description: "Select any issue from the issues table to inspect its details.",
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
  renderIssueForm(appState.issues.find(issue => issue.id === currentIssueId) || null);
}

function updateTopbar(tabId) {
  const copy = TAB_COPY[tabId] || { title: "Kanban Bug Tracker", description: "" };
  document.getElementById("topbarTitle").textContent = copy.title;
  document.getElementById("topbarDescription").textContent = copy.description;
}

function renderDashboardOverview() {
  const totalPeople = appState.people.length;
  const totalProjects = appState.projects.length;
  const totalIssues = appState.issues.length;
  const completionRate = totalIssues ? Math.round((appState.issues.filter(issue => issue.status === "resolved").length / totalIssues) * 100) : 0;

  document.getElementById("dashboardOverview").innerHTML = `
    <article class="dashboard-card">
      <h3>Workspace Size</h3>
      <p><strong>${totalProjects}</strong> project(s)</p>
      <p><strong>${totalPeople}</strong> people</p>
      <p><strong>${totalIssues}</strong> issues</p>
    </article>
    <article class="dashboard-card">
      <h3>Resolution Rate</h3>
      <p><strong>${completionRate}%</strong> of issues resolved</p>
      <p>${appState.issues.filter(issue => issue.status === "resolved").length} resolved of ${totalIssues}</p>
    </article>
    <article class="dashboard-card">
      <h3>Assignment Coverage</h3>
      <p><strong>${appState.issues.filter(issue => issue.assigneeId).length}</strong> assigned issue(s)</p>
      <p>${appState.issues.filter(issue => !issue.assigneeId).length} unassigned issue(s)</p>
    </article>
  `;
}

function renderDashboardStatusHealth() {
  const openIssues = appState.issues.filter(issue => issue.status === "open").length;
  const overdueIssues = appState.issues.filter(issue => issue.status === "overdue").length;
  const highPriority = appState.issues.filter(issue => issue.priority === "high").length;

  document.getElementById("dashboardStatusHealth").innerHTML = `
    <article class="dashboard-card">
      <h3>Open Pressure</h3>
      <p><strong>${openIssues}</strong> open issue(s)</p>
    </article>
    <article class="dashboard-card">
      <h3>Overdue Risk</h3>
      <p><strong>${overdueIssues}</strong> overdue issue(s)</p>
    </article>
    <article class="dashboard-card">
      <h3>High Priority Load</h3>
      <p><strong>${highPriority}</strong> high-priority issue(s)</p>
    </article>
  `;
}

function renderDashboardDistribution() {
  const busiestProject = appState.projects
    .map(project => ({ name: project.name, count: appState.issues.filter(issue => issue.projectId === project.id).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];

  const busiestPerson = appState.people
    .map(person => ({ name: fullName(person), count: appState.issues.filter(issue => issue.assigneeId === person.id).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];

  document.getElementById("dashboardDistribution").innerHTML = `
    <article class="dashboard-card">
      <h3>Busiest Project</h3>
      <p>${busiestProject ? `${escapeHtml(busiestProject.name)} ${busiestProject.count} issue(s)` : "No projects"}</p>
    </article>
    <article class="dashboard-card">
      <h3>Busiest Assignee</h3>
      <p>${busiestPerson ? `${escapeHtml(busiestPerson.name)} ${busiestPerson.count} issue(s)` : "No people"}</p>
    </article>
    <article class="dashboard-card">
      <h3>Project Coverage</h3>
      <p>${appState.projects.filter(project => appState.people.some(person => person.projectId === project.id)).length} project(s) have people assigned</p>
    </article>
  `;
}

function renderIssueTable() {
  const body = document.getElementById("issuesTableBody");
  const filteredIssues = getFilteredIssues();
  const summary = document.getElementById("issuesSummary");
  if (summary) {
    const total = appState.issues.length;
    summary.textContent = total === filteredIssues.length
      ? `Showing all ${total} issue(s).`
      : `Showing ${filteredIssues.length} of ${total} issue(s) based on your filters.`;
  }

  if (!filteredIssues.length) {
    body.innerHTML = `
      <tr>
        <td colspan="9" data-label="Message">No issues matched your current filters. Try broadening your search.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = filteredIssues.map(issue => {
    const reporter = fullName(getPerson(issue.identifiedById));
    const project = getProject(issue.projectId)?.name || "-";
    const assignee = getPerson(issue.assigneeId) ? fullName(getPerson(issue.assigneeId)) : "Unassigned";

    return `
      <tr>
        <td data-label="ID">#${issue.id}</td>
        <td data-label="Summary">${escapeHtml(issue.summary)}</td>
        <td data-label="Reported By">${escapeHtml(reporter)}</td>
        <td data-label="Project">${escapeHtml(project)}</td>
        <td data-label="Assignee">${escapeHtml(assignee)}</td>
        <td data-label="Status"><span class="badge status-${escapeHtml(issue.status)}">${escapeHtml(issue.status)}</span></td>
        <td data-label="Priority"><span class="badge priority-${escapeHtml(issue.priority)}">${escapeHtml(issue.priority)}</span></td>
        <td data-label="Identified">${escapeHtml(issue.identifiedDate)}</td>
        <td data-label="Actions">
          <div class="table-actions">
            <button onclick="viewIssue(${issue.id})">View</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function getFilteredIssues() {
  const searchInput = document.getElementById("issueSearchInput");
  const statusFilter = document.getElementById("issueStatusFilter");
  const priorityFilter = document.getElementById("issuePriorityFilter");
  const query = (searchInput?.value || "").trim().toLowerCase();
  const status = statusFilter?.value || "all";
  const priority = priorityFilter?.value || "all";

  return appState.issues.filter(issue => {
    if (status !== "all" && issue.status !== status) return false;
    if (priority !== "all" && issue.priority !== priority) return false;
    if (!query) return true;

    const reporter = fullName(getPerson(issue.identifiedById)).toLowerCase();
    const assignee = fullName(getPerson(issue.assigneeId)).toLowerCase();
    const project = (getProject(issue.projectId)?.name || "").toLowerCase();

    return [
      issue.summary,
      issue.description,
      issue.status,
      issue.priority,
      issue.identifiedDate,
      reporter,
      assignee,
      project,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
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
        <small>Assigned Project: ${escapeHtml(getProject(person.projectId)?.name || "Unassigned")}</small>
      </div>
    </li>
  `).join("");
}

function renderProjects() {
  document.getElementById("projectList").innerHTML = appState.projects
    .map(project => {
      const peopleCount = appState.people.filter(person => person.projectId === project.id).length;
      return `<li>${project.id} - ${escapeHtml(project.name)} <small>(${peopleCount} team member(s))</small></li>`;
    })
    .join("");
}

function viewIssue(id) {
  const issue = appState.issues.find(it => it.id === id);
  if (!issue) return;
  currentIssueId = id;
  editingIssueId = null;
  renderIssueDetail(issue);
  renderIssueForm(issue);
  switchTab("issues");
}

function startEditIssue(id) {
  const issue = appState.issues.find(it => it.id === id);
  if (!issue) return;
  editingIssueId = id;
  renderIssueForm(issue);
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isTabActive(tabId) {
  return document.querySelector(`#${tabId}`)?.classList.contains("active");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

window.viewIssue = viewIssue;
