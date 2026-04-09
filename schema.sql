CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    email TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    profile_picture_url TEXT
);

CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    identified_by INTEGER NOT NULL,
    identified_date TEXT NOT NULL,
    project_id INTEGER NOT NULL,
    assignee_id INTEGER,
    status TEXT NOT NULL CHECK (status IN ('open', 'resolved', 'overdue')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    target_resolution_date TEXT,
    actual_resolution_date TEXT,
    resolution_summary TEXT,
    FOREIGN KEY (identified_by) REFERENCES people(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (assignee_id) REFERENCES people(id)
);
