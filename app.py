from __future__ import annotations

import sqlite3
from contextlib import closing
from datetime import date
from pathlib import Path
from typing import Any

from flask import Flask, abort, g, redirect, render_template, request, url_for

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "bug_tracker.db"

STATUS_OPTIONS = ["open", "resolved", "overdue"]
PRIORITY_OPTIONS = ["low", "medium", "high"]


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "dev"

    @app.before_request
    def before_request() -> None:
        g.db = get_db_connection()

    @app.teardown_request
    def teardown_request(_: BaseException | None) -> None:
        db = g.pop("db", None)
        if db is not None:
            db.close()

    @app.route("/")
    def index() -> str:
        issues = g.db.execute(
            """
            SELECT b.*, p.name AS project_name,
                   pe.name || ' ' || pe.surname AS assignee_name
            FROM bugs b
            LEFT JOIN projects p ON p.id = b.project_id
            LEFT JOIN people pe ON pe.id = b.assignee_id
            ORDER BY CASE b.priority
                        WHEN 'high' THEN 1
                        WHEN 'medium' THEN 2
                        ELSE 3
                     END,
                     b.target_resolution_date
            """
        ).fetchall()

        grouped: dict[str, list[sqlite3.Row]] = {status: [] for status in STATUS_OPTIONS}
        for issue in issues:
            grouped[issue["status"]].append(issue)

        return render_template("index.html", grouped=grouped)

    @app.route("/issues")
    def issues() -> str:
        issues_list = g.db.execute(
            """
            SELECT b.id, b.summary, b.status, b.priority, b.identified_date,
                   p.name AS project_name,
                   pe.name || ' ' || pe.surname AS assignee_name
            FROM bugs b
            LEFT JOIN projects p ON p.id = b.project_id
            LEFT JOIN people pe ON pe.id = b.assignee_id
            ORDER BY b.identified_date DESC
            """
        ).fetchall()
        return render_template("issues.html", issues=issues_list)

    @app.route("/issues/new", methods=["GET", "POST"])
    def create_issue() -> str:
        projects = g.db.execute("SELECT id, name FROM projects ORDER BY name").fetchall()
        people = g.db.execute(
            "SELECT id, name, surname FROM people ORDER BY surname, name"
        ).fetchall()

        if request.method == "POST":
            form = request.form
            summary = form.get("summary", "").strip()
            description = form.get("description", "").strip()
            identified_by = int(form["identified_by"])
            project_id = int(form["project_id"])
            assignee_value = form.get("assignee_id")
            assignee_id = int(assignee_value) if assignee_value else None
            status = form.get("status", "open")
            priority = form.get("priority", "medium")

            if status not in STATUS_OPTIONS or priority not in PRIORITY_OPTIONS or not summary:
                abort(400, "Invalid issue data")

            g.db.execute(
                """
                INSERT INTO bugs (
                    summary,
                    description,
                    identified_by,
                    identified_date,
                    project_id,
                    assignee_id,
                    status,
                    priority,
                    target_resolution_date,
                    actual_resolution_date,
                    resolution_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    summary,
                    description,
                    identified_by,
                    form["identified_date"],
                    project_id,
                    assignee_id,
                    status,
                    priority,
                    form.get("target_resolution_date") or None,
                    form.get("actual_resolution_date") or None,
                    form.get("resolution_summary") or None,
                ),
            )
            g.db.commit()
            return redirect(url_for("issues"))

        return render_template(
            "issue_form.html",
            issue=None,
            people=people,
            projects=projects,
            statuses=STATUS_OPTIONS,
            priorities=PRIORITY_OPTIONS,
            today=date.today().isoformat(),
        )

    @app.route("/issues/<int:issue_id>")
    def issue_detail(issue_id: int) -> str:
        issue = get_issue(issue_id)
        return render_template("issue_detail.html", issue=issue)

    @app.route("/issues/<int:issue_id>/edit", methods=["GET", "POST"])
    def edit_issue(issue_id: int) -> str:
        issue = get_issue(issue_id)
        projects = g.db.execute("SELECT id, name FROM projects ORDER BY name").fetchall()
        people = g.db.execute(
            "SELECT id, name, surname FROM people ORDER BY surname, name"
        ).fetchall()

        if request.method == "POST":
            form = request.form
            assignee_value = form.get("assignee_id")
            assignee_id = int(assignee_value) if assignee_value else None

            g.db.execute(
                """
                UPDATE bugs
                SET summary = ?,
                    description = ?,
                    identified_by = ?,
                    identified_date = ?,
                    project_id = ?,
                    assignee_id = ?,
                    status = ?,
                    priority = ?,
                    target_resolution_date = ?,
                    actual_resolution_date = ?,
                    resolution_summary = ?
                WHERE id = ?
                """,
                (
                    form["summary"],
                    form.get("description"),
                    int(form["identified_by"]),
                    form["identified_date"],
                    int(form["project_id"]),
                    assignee_id,
                    form["status"],
                    form["priority"],
                    form.get("target_resolution_date") or None,
                    form.get("actual_resolution_date") or None,
                    form.get("resolution_summary") or None,
                    issue_id,
                ),
            )
            g.db.commit()
            return redirect(url_for("issue_detail", issue_id=issue_id))

        return render_template(
            "issue_form.html",
            issue=issue,
            people=people,
            projects=projects,
            statuses=STATUS_OPTIONS,
            priorities=PRIORITY_OPTIONS,
            today=date.today().isoformat(),
        )

    @app.route("/people", methods=["GET", "POST"])
    def people() -> str:
        if request.method == "POST":
            form = request.form
            g.db.execute(
                """
                INSERT INTO people (name, surname, email, username, profile_picture_url)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    form["name"],
                    form["surname"],
                    form["email"],
                    form["username"],
                    form.get("profile_picture_url") or None,
                ),
            )
            g.db.commit()
            return redirect(url_for("people"))

        people_list = g.db.execute("SELECT * FROM people ORDER BY surname, name").fetchall()
        return render_template("people.html", people=people_list)

    @app.route("/projects", methods=["GET", "POST"])
    def projects() -> str:
        if request.method == "POST":
            name = request.form.get("name", "").strip()
            if not name:
                abort(400, "Project name required")
            g.db.execute("INSERT INTO projects (name) VALUES (?)", (name,))
            g.db.commit()
            return redirect(url_for("projects"))

        projects_list = g.db.execute("SELECT * FROM projects ORDER BY name").fetchall()
        return render_template("projects.html", projects=projects_list)

    @app.route("/reports/project")
    def issues_by_project() -> str:
        rows = g.db.execute(
            """
            SELECT p.name AS project_name, COUNT(b.id) AS issue_count
            FROM projects p
            LEFT JOIN bugs b ON b.project_id = p.id
            GROUP BY p.id
            ORDER BY issue_count DESC, p.name
            """
        ).fetchall()
        return render_template("report_project.html", rows=rows)

    return app



def get_issue(issue_id: int) -> sqlite3.Row:
    issue = g.db.execute(
        """
        SELECT b.*,
               p.name AS project_name,
               ib.name || ' ' || ib.surname AS identified_by_name,
               ab.name || ' ' || ab.surname AS assignee_name
        FROM bugs b
        LEFT JOIN projects p ON p.id = b.project_id
        LEFT JOIN people ib ON ib.id = b.identified_by
        LEFT JOIN people ab ON ab.id = b.assignee_id
        WHERE b.id = ?
        """,
        (issue_id,),
    ).fetchone()

    if issue is None:
        abort(404, f"Issue {issue_id} not found")
    return issue

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    schema_path = BASE_DIR / "schema.sql"
    with closing(get_db_connection()) as conn, schema_path.open("r", encoding="utf-8") as f:
        conn.executescript(f.read())
        conn.commit()


def seed_data() -> None:
    with closing(get_db_connection()) as conn:
        project_count = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
        people_count = conn.execute("SELECT COUNT(*) FROM people").fetchone()[0]

        if project_count == 0:
            conn.executemany(
                "INSERT INTO projects (name) VALUES (?)",
                [("Web Platform",), ("Mobile App",), ("API Gateway",)],
            )

        if people_count == 0:
            conn.executemany(
                """
                INSERT INTO people (name, surname, email, username, profile_picture_url)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    ("Maya", "Stone", "maya.stone@example.com", "mstone", "https://i.pravatar.cc/80?img=11"),
                    ("Liam", "Nguyen", "liam.nguyen@example.com", "lnguyen", "https://i.pravatar.cc/80?img=12"),
                    ("Ava", "Patel", "ava.patel@example.com", "apatel", "https://i.pravatar.cc/80?img=13"),
                ],
            )

        conn.commit()


app = create_app()
init_db()
seed_data()

if __name__ == "__main__":
    app.run(debug=True)
