const STORAGE_KEY = "kanban_bug_tracker_data_v1";

const appState = loadState();

init();

function init() {
  bindProjectForm();
  bindPeopleForm();
  renderAll();
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
    if (!parsed.projects) parsed.projects = [];
    if (!parsed.people) parsed.people = [];
    if (!parsed.issues) parsed.issues = [];
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

function renderAll() {
  renderPeopleProjectOptions();
  renderProjects();
  renderPeople();
}

function renderPeopleProjectOptions() {
  const select = document.getElementById("personProjectSelect");
  select.innerHTML = appState.projects
    .map(project => `<option value="${project.id}">${escapeHtml(project.name)}</option>`)
    .join("");
}

function renderProjects() {
  document.getElementById("projectList").innerHTML = appState.projects
    .map(project => {
      const peopleCount = appState.people.filter(person => person.projectId === project.id).length;
      return `<li>${project.id} - ${escapeHtml(project.name)} <small>(${peopleCount} team member(s))</small></li>`;
    })
    .join("");
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

function getProject(id) {
  return appState.projects.find(project => project.id === id) || null;
}

function fullName(person) {
  if (!person) return "";
  return `${person.name} ${person.surname}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
