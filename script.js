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
const issueFormTitle = document.getElementById("issueFormTitle");
const saveIssueBtn = document.getElementById("saveIssueBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

personForm.addEventListener("submit", onCreatePerson);
projectForm.addEventListener("submit", onCreateProject);
issueForm.addEventListener("submit", onSaveIssue);
projectFilter.addEventListener("change", renderIssues);
cancelEditBtn.addEventListener("click", resetIssueForm);

bootstrap();

function bootstrap() {
  populateSelects();
  renderPeople();
  renderProjects();
  renderIssues();
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

function populateSelects() {
  const identifiedBy = document.getElementById("identifiedBy");
  const assignedTo = document.getElementById("assignedTo");
  const projectIdIssue = document.getElementById("projectIdIssue");

  identifiedBy.innerHTML = "";
  assignedTo.innerHTML = '<option value="">Unassigned</option>';
  projectIdIssue.innerHTML = "";
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
}

function renderPeople() {
  peopleList.innerHTML = data.people
    .map(
      (p) =>
        `<li>${p.name} ${p.surname} (@${p.username}) • ${p.email}</li>`
    )
    .join("");
}

function renderProjects() {
  projectList.innerHTML = data.projects
    .map((project) => `<li>${project.id}: ${project.name}</li>`)
    .join("");
}

function renderIssues() {
  const selectedProject = projectFilter.value;
  const todayIso = new Date().toISOString().slice(0, 10);

  issueTableBody.innerHTML = "";

  const filtered = data.issues.filter((issue) => {
    if (!selectedProject) return true;
    return issue.projectId === selectedProject;
  });

  if (filtered.length === 0) {
    issueTableBody.innerHTML = `<tr><td colspan="7">No issues found.</td></tr>`;
    return;
  }

  filtered.forEach((issue) => {
    const derivedStatus =
      issue.status === "resolved"
        ? "resolved"
        : issue.targetDate && issue.targetDate < todayIso
        ? "overdue"
        : issue.status;

    issueTableBody.insertAdjacentHTML(
      "beforeend",
      `<tr>
        <td>${issue.id}</td>
        <td>${issue.summary}</td>
        <td>${getProjectName(issue.projectId)}</td>
        <td>${issue.assignedTo ? getPersonLabel(issue.assignedTo) : "Unassigned"}</td>
        <td><span class="badge status-${derivedStatus}">${derivedStatus}</span></td>
        <td><span class="badge priority-${issue.priority}">${issue.priority}</span></td>
        <td>
          <div class="row-actions">
            <button type="button" onclick="viewIssue('${issue.id}')">View</button>
            <button type="button" class="secondary" onclick="editIssue('${issue.id}')">Edit</button>
          </div>
        </td>
      </tr>`
    );
  });
}

function viewIssue(issueId) {
  const issue = data.issues.find((x) => x.id === issueId);
  if (!issue) return;

  issueDetails.classList.remove("details-empty");
  issueDetails.innerHTML = `
    <div><strong>ID:</strong> ${issue.id}</div>
    <div><strong>Summary:</strong> ${issue.summary}</div>
    <div><strong>Description:</strong> ${issue.description}</div>
    <div><strong>Identified By:</strong> ${getPersonLabel(issue.identifiedBy)}</div>
    <div><strong>Identified Date:</strong> ${issue.identifiedDate}</div>
    <div><strong>Project:</strong> ${getProjectName(issue.projectId)}</div>
    <div><strong>Assigned To:</strong> ${issue.assignedTo ? getPersonLabel(issue.assignedTo) : "Unassigned"}</div>
    <div><strong>Status:</strong> ${issue.status}</div>
    <div><strong>Priority:</strong> ${issue.priority}</div>
    <div><strong>Target Resolution Date:</strong> ${issue.targetDate}</div>
    <div><strong>Actual Resolution Date:</strong> ${issue.actualDate || "N/A"}</div>
    <div><strong>Resolution Summary:</strong> ${issue.resolutionSummary || "N/A"}</div>
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
