PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'review', 'completed', 'archived')),
  owner TEXT NOT NULL DEFAULT '',
  prd_json TEXT NOT NULL,
  current_revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  prd_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE (task_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_tasks_updated_at
  ON tasks(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_revisions_task_revision
  ON task_revisions(task_id, revision DESC);
