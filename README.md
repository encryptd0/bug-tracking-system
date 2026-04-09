# Kanban Bug Tracker (HTML/CSS/JavaScript)

A modern bug tracker implemented with **only HTML, CSS, and JavaScript**.

## Unique tab structure (required)
Each tab has a single, non-duplicated responsibility:
- **Dashboard**: high-level workspace details only
- **Projects**: create and view projects only
- **People**: create people and assign them to projects only
- **Issues**: create, view, and edit issue details only

## What it supports
- Create issues
- Assign issues (or leave unassigned and assign later)
- View all issues and full issue details
- Edit issues
- Create people
- Assign people to projects
- Create projects

## Data persistence
Data is persisted in `localStorage`, so your projects, people, and bugs remain across browser sessions on the same machine/browser profile.

## Run
Just open `index.html` in a browser.

No backend and no package install required.
