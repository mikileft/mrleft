const TASK_STATUSES = new Set([
  "draft",
  "in_progress",
  "review",
  "completed",
  "archived",
]);

export async function handleTaskRequest(request, env, url, cors) {
  if (!env.DB) return json({ error: "Task database is not configured" }, 503, cors);

  const segments = url.pathname.split("/").filter(Boolean);
  const taskId = segments[2];
  const resource = segments[3];
  const revisionNumber = segments[4];
  const action = segments[5];

  try {
    if (segments.length === 2 && request.method === "GET") {
      return listTasks(env, cors);
    }
    if (segments.length === 2 && request.method === "POST") {
      return createTask(request, env, cors);
    }
    if (!taskId) return json({ error: "Task ID is required" }, 400, cors);

    if (segments.length === 3 && request.method === "GET") {
      return getTask(taskId, env, cors);
    }
    if (segments.length === 3 && request.method === "PUT") {
      return updateTask(taskId, request, env, cors);
    }
    if (segments.length === 3 && request.method === "DELETE") {
      return archiveTask(taskId, env, cors);
    }
    if (resource === "revisions" && !revisionNumber && request.method === "GET") {
      return listRevisions(taskId, env, cors);
    }
    if (resource === "revisions" && !revisionNumber && request.method === "POST") {
      return createRevision(taskId, request, env, cors);
    }
    if (
      resource === "revisions" &&
      revisionNumber &&
      !action &&
      request.method === "GET"
    ) {
      return getRevision(taskId, revisionNumber, env, cors);
    }
    if (
      resource === "revisions" &&
      revisionNumber &&
      action === "restore" &&
      request.method === "POST"
    ) {
      return restoreRevision(taskId, revisionNumber, env, cors);
    }
    return json({ error: "Task route not found" }, 404, cors);
  } catch (error) {
    console.error("Task API failure", error);
    return json({ error: "Task operation failed" }, 500, cors);
  }
}

async function listTasks(env, cors) {
  const result = await env.DB.prepare(
    `SELECT id, title, status, owner, current_revision, created_at, updated_at
       FROM tasks
      WHERE status != 'archived'
      ORDER BY updated_at DESC`,
  ).all();
  return json({ tasks: result.results || [] }, 200, cors);
}

async function createTask(request, env, cors) {
  const input = await readJson(request);
  const title = cleanText(input.title, 160);
  if (!title) return json({ error: "Task title is required" }, 400, cors);

  const status = validStatus(input.status);
  if (!status) return json({ error: "Invalid task status" }, 400, cors);

  const id = crypto.randomUUID();
  const owner = cleanText(input.owner, 120);
  const prd = validPrd(input.prd);
  const now = new Date().toISOString();
  const prdJson = JSON.stringify(prd);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO tasks
        (id, title, status, owner, prd_json, current_revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    ).bind(id, title, status, owner, prdJson, now, now),
    env.DB.prepare(
      `INSERT INTO task_revisions
        (task_id, revision, prd_json, change_note, created_at)
       VALUES (?, 1, ?, ?, ?)`,
    ).bind(id, prdJson, "任务创建", now),
  ]);

  return getTask(id, env, cors, 201);
}

async function getTask(taskId, env, cors, status = 200) {
  const row = await env.DB.prepare(
    `SELECT id, title, status, owner, prd_json, current_revision, created_at, updated_at
       FROM tasks
      WHERE id = ?`,
  )
    .bind(taskId)
    .first();
  if (!row) return json({ error: "Task not found" }, 404, cors);
  return json({ task: hydrateTask(row) }, status, cors);
}

async function updateTask(taskId, request, env, cors) {
  const current = await env.DB.prepare(
    "SELECT title, status, owner, prd_json FROM tasks WHERE id = ?",
  )
    .bind(taskId)
    .first();
  if (!current) return json({ error: "Task not found" }, 404, cors);

  const input = await readJson(request);
  const title =
    input.title === undefined ? current.title : cleanText(input.title, 160);
  const status =
    input.status === undefined ? current.status : validStatus(input.status);
  const owner =
    input.owner === undefined ? current.owner : cleanText(input.owner, 120);
  const prdJson =
    input.prd === undefined ? current.prd_json : JSON.stringify(validPrd(input.prd));

  if (!title) return json({ error: "Task title is required" }, 400, cors);
  if (!status) return json({ error: "Invalid task status" }, 400, cors);

  await env.DB.prepare(
    `UPDATE tasks
        SET title = ?, status = ?, owner = ?, prd_json = ?, updated_at = ?
      WHERE id = ?`,
  )
    .bind(title, status, owner, prdJson, new Date().toISOString(), taskId)
    .run();
  return getTask(taskId, env, cors);
}

async function archiveTask(taskId, env, cors) {
  const result = await env.DB.prepare(
    "UPDATE tasks SET status = 'archived', updated_at = ? WHERE id = ?",
  )
    .bind(new Date().toISOString(), taskId)
    .run();
  if (!result.meta?.changes) return json({ error: "Task not found" }, 404, cors);
  return json({ archived: true }, 200, cors);
}

async function listRevisions(taskId, env, cors) {
  const task = await env.DB.prepare("SELECT id FROM tasks WHERE id = ?")
    .bind(taskId)
    .first();
  if (!task) return json({ error: "Task not found" }, 404, cors);

  const result = await env.DB.prepare(
    `SELECT revision, change_note, created_at
       FROM task_revisions
      WHERE task_id = ?
      ORDER BY revision DESC`,
  )
    .bind(taskId)
    .all();
  return json({ revisions: result.results || [] }, 200, cors);
}

async function createRevision(taskId, request, env, cors) {
  const task = await env.DB.prepare(
    "SELECT prd_json, current_revision FROM tasks WHERE id = ?",
  )
    .bind(taskId)
    .first();
  if (!task) return json({ error: "Task not found" }, 404, cors);

  const input = await readJson(request);
  const note = cleanText(input.note, 240) || "手动保存";
  const revision = Number(task.current_revision) + 1;
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO task_revisions
        (task_id, revision, prd_json, change_note, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(taskId, revision, task.prd_json, note, now),
    env.DB.prepare(
      `UPDATE tasks
          SET current_revision = ?, updated_at = ?
        WHERE id = ?`,
    ).bind(revision, now, taskId),
  ]);
  return json(
    { revision: { revision, change_note: note, created_at: now } },
    201,
    cors,
  );
}

async function getRevision(taskId, revisionNumber, env, cors) {
  const revision = parseRevision(revisionNumber);
  if (!revision) return json({ error: "Invalid revision" }, 400, cors);

  const row = await env.DB.prepare(
    `SELECT revision, prd_json, change_note, created_at
       FROM task_revisions
      WHERE task_id = ? AND revision = ?`,
  )
    .bind(taskId, revision)
    .first();
  if (!row) return json({ error: "Revision not found" }, 404, cors);
  return json(
    {
      revision: {
        revision: row.revision,
        prd: parsePrd(row.prd_json),
        change_note: row.change_note,
        created_at: row.created_at,
      },
    },
    200,
    cors,
  );
}

async function restoreRevision(taskId, revisionNumber, env, cors) {
  const revision = parseRevision(revisionNumber);
  if (!revision) return json({ error: "Invalid revision" }, 400, cors);

  const [task, source] = await Promise.all([
    env.DB.prepare("SELECT current_revision FROM tasks WHERE id = ?")
      .bind(taskId)
      .first(),
    env.DB.prepare(
      "SELECT prd_json FROM task_revisions WHERE task_id = ? AND revision = ?",
    )
      .bind(taskId, revision)
      .first(),
  ]);
  if (!task) return json({ error: "Task not found" }, 404, cors);
  if (!source) return json({ error: "Revision not found" }, 404, cors);

  const nextRevision = Number(task.current_revision) + 1;
  const note = `恢复自版本 ${revision}`;
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO task_revisions
        (task_id, revision, prd_json, change_note, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(taskId, nextRevision, source.prd_json, note, now),
    env.DB.prepare(
      `UPDATE tasks
          SET prd_json = ?, current_revision = ?, updated_at = ?
        WHERE id = ?`,
    ).bind(source.prd_json, nextRevision, now, taskId),
  ]);
  return getTask(taskId, env, cors);
}

function hydrateTask(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    owner: row.owner,
    prd: parsePrd(row.prd_json),
    current_revision: row.current_revision,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validPrd(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const serialized = JSON.stringify(value);
  if (serialized.length > 96_000) throw new Error("PRD payload is too large");
  return value;
}

function parsePrd(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function validStatus(value = "draft") {
  const status = String(value);
  return TASK_STATUSES.has(status) ? status : null;
}

function parseRevision(value) {
  const revision = Number(value);
  return Number.isInteger(revision) && revision > 0 ? revision : null;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function json(body, status = 200, cors = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(cors || {}),
    },
  });
}
