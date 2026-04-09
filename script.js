const STORAGE_KEY = "bugTrackerData_v1";

const defaultData = {
  people: [
    {
      id: "p1",
      name: "Avery",
      surname: "Nguyen",
      email: "avery.nguyen@example.com",
      username: "averyn",
      avatar: ""
    },
    {
      id: "p2",
      name: "Jordan",
      surname: "Smith",
      email: "jordan.smith@example.com",
      username: "jordans",
      avatar: ""
    }
  ],
  projects: [
    { id: "proj1", name: "Website Revamp" },
    { id: "proj2", name: "Mobile App" }
  ],
  issues: []
};

const priorityRank = {
  low: 1,
  medium: 2,
  high: 3
};

let data = loadData();
let editingIssueId = null;

const personForm = document.getElementById("personForm");
const projectForm = document.getElementById("projectForm");
const issueForm = document.getElementById("issueForm");
const issueTableBody = document.getElementById("issueTableBody");
const peopleList = document.getElementById("peopleList");
const projectList = document.getElementById("projectList");
const issueDetails = document.getElementById("issueDetails");
const projectFilter = document.getElementById("projectFilter");
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const issueSearch = document.getElementById("issueSearch");
const sortBy = document.getElementById("sortBy");
const issueFormTitle = document.getElementById("issueFormTitle");
const saveIssueBtn = document.getElementById("saveIssueBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const clearDataBtn = document.getElementById("clearDataBtn");

personForm.addEventListener("submit", onCreatePerson);
projectForm.addEventListener("submit", onCreateProject);
issueForm.addEventListener("submit", onSaveIssue);
projectFilter.addEventListener("change", renderIssues);
statusFilter.addEventListener("change", renderIssues);
priorityFilter.addEventListener("change", renderIssues);
issueSearch.addEventListener("input", renderIssues);
sortBy.addEventListener("change", renderIssues);
cancelEditBtn.addEventListener("click", resetIssueForm);
clearDataBtn.addEventListener("click", resetAllData);

bootstrap();

function bootstrap() {
  populateSelects();
  renderPeople();
  renderProjects();
  renderIssues();
  renderStats();
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);

  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(defaultData);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getPersonLabel(personId) {
  const person = data.people.find((p) => p.id === personId);
  return person ? `${person.name} ${person.surname}` : "Unassigned";
}

function getProjectName(projectId) {
  const project = data.projects.find((p) => p.id === projectId);
  return project ? project.name : "Unknown Project";
}

function deriveStatus(issue) {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (issue.status === "resolved") return "resolved";
  if (issue.targetDate && issue.targetDate < todayIso) return "overdue";
  return issue.status;
}

function populateSelects() {
  const identifiedBy = document.getElementById("identifiedBy");
  const assignedTo = document.getElementById("assignedTo");
  const projectIdIssue = document.getElementById("projectIdIssue");

  identifiedBy.innerHTML = "";
  assignedTo.innerHTML = '<option value="">Unassigned</option>';
  projectIdIssue.innerHTML = "";

  const activeProjectFilter = projectFilter.value;
  projectFilter.innerHTML = '<option value="">All Projects</option>';

  data.people.forEach((person) => {
    const option = `<option value="${person.id}">${person.name} ${person.surname} (@${person.username})</option>`;
    identifiedBy.insertAdjacentHTML("beforeend", option);
    assignedTo.insertAdjacentHTML("beforeend", option);
  });

  data.projects.forEach((project) => {
    const option = `<option value="${project.id}">${project.name}</option>`;
    projectIdIssue.insertAdjacentHTML("beforeend", option);
    projectFilter.insertAdjacentHTML("beforeend", option);
  });

  if (data.projects.some((project) => project.id === activeProjectFilter)) {
    projectFilter.value = activeProjectFilter;
  }
}

function renderPeople() {
  peopleList.innerHTML = data.people
    .map((p) => `<li>${p.name} ${p.surname} (@${p.username}) • ${p.email}</li>`)
    .join("");
}

function renderProjects() {
  projectList.innerHTML = data.projects.map((project) => `<li>${project.id}: ${project.name}</li>`).join("");
}

function getFilteredAndSortedIssues() {
  const selectedProject = projectFilter.value;
  const selectedStatus = statusFilter.value;
  const selectedPriority = priorityFilter.value;
  const search = issueSearch.value.trim().toLowerCase();

  const filtered = data.issues.filter((issue) => {
    const derived = deriveStatus(issue);
    const matchesProject = !selectedProject || issue.projectId === selectedProject;
    const matchesStatus = !selectedStatus || derived === selectedStatus;
    const matchesPriority = !selectedPriority || issue.priority === selectedPriority;
    const searchBlob = [
      issue.id,
      issue.summary,
      issue.description,
      getProjectName(issue.projectId),
      getPersonLabel(issue.identifiedBy),
      getPersonLabel(issue.assignedTo)
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || searchBlob.includes(search);

    return matchesProject && matchesStatus && matchesPriority && matchesSearch;
  });

  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case "target-desc":
        return (b.targetDate || "").localeCompare(a.targetDate || "");
      case "priority-desc":
        return priorityRank[b.priority] - priorityRank[a.priority];
      case "priority-asc":
        return priorityRank[a.priority] - priorityRank[b.priority];
      case "target-asc":
      default:
        return (a.targetDate || "").localeCompare(b.targetDate || "");
    }
  });

  return filtered;
}

function renderIssues() {
  issueTableBody.innerHTML = "";

  const filtered = getFilteredAndSortedIssues();

  if (filtered.length === 0) {
    issueTableBody.innerHTML = `<tr><td colspan="8">No issues found for the current filters.</td></tr>`;
    renderStats();
    return;
  }

  filtered.forEach((issue) => {
    const derivedStatus = deriveStatus(issue);

    issueTableBody.insertAdjacentHTML(
      "beforeend",
      `<tr>
        <td>${issue.id}</td>
        <td>${issue.summary}</td>
        <td>${getProjectName(issue.projectId)}</td>
        <td>${issue.assignedTo ? getPersonLabel(issue.assignedTo) : "Unassigned"}</td>
        <td><span class="badge status-${derivedStatus}">${derivedStatus}</span></td>
        <td><span class="badge priority-${issue.priority}">${issue.priority}</span></td>
        <td>${issue.targetDate || "N/A"}</td>
        <td>
          <div class="row-actions">
            <button type="button" onclick="viewIssue('${issue.id}')">View</button>
            <button type="button" class="secondary" onclick="editIssue('${issue.id}')">Edit</button>
          </div>
        </td>
      </tr>`
    );
  });

  renderStats();
}

function renderStats() {
  const totals = data.issues.reduce(
    (acc, issue) => {
      const derivedStatus = deriveStatus(issue);
      acc.total += 1;
      if (derivedStatus === "open") acc.open += 1;
      if (derivedStatus === "overdue") acc.overdue += 1;
      if (derivedStatus === "resolved") acc.resolved += 1;
      return acc;
    },
    { total: 0, open: 0, overdue: 0, resolved: 0 }
  );

  document.getElementById("statTotal").textContent = totals.total;
  document.getElementById("statOpen").textContent = totals.open;
  document.getElementById("statOverdue").textContent = totals.overdue;
  document.getElementById("statResolved").textContent = totals.resolved;
}

function viewIssue(issueId) {
  const issue = data.issues.find((x) => x.id === issueId);
  if (!issue) return;

  const derivedStatus = deriveStatus(issue);

  issueDetails.classList.remove("details-empty");
  issueDetails.innerHTML = `
    <div class="issue-detail-row"><strong>ID:</strong> ${issue.id}</div>
    <div class="issue-detail-row"><strong>Summary:</strong> ${issue.summary}</div>
    <div class="issue-detail-row"><strong>Description:</strong> ${issue.description}</div>
    <div class="issue-detail-row"><strong>Identified By:</strong> ${getPersonLabel(issue.identifiedBy)}</div>
    <div class="issue-detail-row"><strong>Identified Date:</strong> ${issue.identifiedDate}</div>
    <div class="issue-detail-row"><strong>Project:</strong> ${getProjectName(issue.projectId)}</div>
    <div class="issue-detail-row"><strong>Assigned To:</strong> ${issue.assignedTo ? getPersonLabel(issue.assignedTo) : "Unassigned"}</div>
    <div class="issue-detail-row"><strong>Status:</strong> ${derivedStatus}</div>
    <div class="issue-detail-row"><strong>Priority:</strong> ${issue.priority}</div>
    <div class="issue-detail-row"><strong>Target Resolution Date:</strong> ${issue.targetDate}</div>
    <div class="issue-detail-row"><strong>Actual Resolution Date:</strong> ${issue.actualDate || "N/A"}</div>
    <div class="issue-detail-row"><strong>Resolution Summary:</strong> ${issue.resolutionSummary || "N/A"}</div>
  `;
}

window.viewIssue = viewIssue;

function editIssue(issueId) {
  const issue = data.issues.find((x) => x.id === issueId);
  if (!issue) return;

  editingIssueId = issueId;

  document.getElementById("issueId").value = issue.id;
  document.getElementById("summary").value = issue.summary;
  document.getElementById("description").value = issue.description;
  document.getElementById("identifiedBy").value = issue.identifiedBy;
  document.getElementById("identifiedDate").value = issue.identifiedDate;
  document.getElementById("projectIdIssue").value = issue.projectId;
  document.getElementById("assignedTo").value = issue.assignedTo;
  document.getElementById("status").value = issue.status;
  document.getElementById("priority").value = issue.priority;
  document.getElementById("targetDate").value = issue.targetDate;
  document.getElementById("actualDate").value = issue.actualDate;
  document.getElementById("resolutionSummary").value = issue.resolutionSummary;

  issueFormTitle.textContent = `Edit Issue (${issue.id})`;
  saveIssueBtn.textContent = "Save Changes";
  cancelEditBtn.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.editIssue = editIssue;

function resetIssueForm() {
  editingIssueId = null;
  issueForm.reset();
  document.getElementById("issueId").value = "";
  issueFormTitle.textContent = "Create Issue";
  saveIssueBtn.textContent = "Create Issue";
  cancelEditBtn.classList.add("hidden");
}

function onCreatePerson(event) {
  event.preventDefault();

  const person = {
    id: document.getElementById("personId").value.trim(),
    name: document.getElementById("personName").value.trim(),
    surname: document.getElementById("personSurname").value.trim(),
    email: document.getElementById("personEmail").value.trim(),
    username: document.getElementById("personUsername").value.trim(),
    avatar: document.getElementById("personAvatar").value.trim()
  };

  const idTaken = data.people.some((p) => p.id === person.id);
  const usernameTaken = data.people.some((p) => p.username === person.username);

  if (idTaken) {
    alert("Person ID must be unique.");
    return;
  }

  if (usernameTaken) {
    alert("Username must be unique.");
    return;
  }

  data.people.push(person);
  persist();

  personForm.reset();
  populateSelects();
  renderPeople();
  renderIssues();
}

function onCreateProject(event) {
  event.preventDefault();

  const project = {
    id: document.getElementById("projectId").value.trim(),
    name: document.getElementById("projectName").value.trim()
  };

  const idTaken = data.projects.some((p) => p.id === project.id);
  if (idTaken) {
    alert("Project ID must be unique.");
    return;
  }

  data.projects.push(project);
  persist();

  projectForm.reset();
  populateSelects();
  renderProjects();
  renderIssues();
}

function onSaveIssue(event) {
  event.preventDefault();

  const issue = {
    id: document.getElementById("issueId").value.trim() || `BUG-${Date.now()}`,
    summary: document.getElementById("summary").value.trim(),
    description: document.getElementById("description").value.trim(),
    identifiedBy: document.getElementById("identifiedBy").value,
    identifiedDate: document.getElementById("identifiedDate").value,
    projectId: document.getElementById("projectIdIssue").value,
    assignedTo: document.getElementById("assignedTo").value,
    status: document.getElementById("status").value,
    priority: document.getElementById("priority").value,
    targetDate: document.getElementById("targetDate").value,
    actualDate: document.getElementById("actualDate").value,
    resolutionSummary: document.getElementById("resolutionSummary").value.trim()
  };

  if (!editingIssueId) {
    data.issues.push(issue);
  } else {
    const idx = data.issues.findIndex((x) => x.id === editingIssueId);
    if (idx !== -1) data.issues[idx] = issue;
  }

  persist();
  resetIssueForm();
  renderIssues();
  viewIssue(issue.id);
}

function resetAllData() {
  if (!confirm("Reset all data and restore defaults?")) return;

  data = structuredClone(defaultData);
  persist();

  editingIssueId = null;
  personForm.reset();
  projectForm.reset();
  issueForm.reset();
  issueDetails.classList.add("details-empty");
  issueDetails.textContent = "Select an issue to view full details.";

  projectFilter.value = "";
  statusFilter.value = "";
  priorityFilter.value = "";
  issueSearch.value = "";
  sortBy.value = "target-asc";

  populateSelects();
  renderPeople();
  renderProjects();
  renderIssues();
  resetIssueForm();
}
