const STORAGE_KEY = "zxl-prd-workbench-v1";
const AI_SETTINGS_KEY = "zxl-prd-ai-settings-v1";
const ACTIVE_TASK_KEY = "zxl-prd-active-task-v1";
const TASK_CACHE_PREFIX = "zxl-prd-task-cache-v1:";

const workflow = window.ZXL_PRD_CONFIG;
if (!workflow) throw new Error("ZXL PRD workflow configuration is missing");

const taskStatuses = workflow.taskStatuses;
const steps = workflow.stages;
const checklistItems = workflow.checklist.items;
const defaults = workflow.stateDefaults;

let state = loadState();
let aiSettings = loadAiSettings();
let aiTarget = { key: null, label: "当前阶段" };
let tasks = [];
let activeTask = null;
let selectedEntryTaskId = null;
let saveTimer;
let remoteSaveTimer;
let toastTimer;

const elements = {
  stepNav: document.querySelector("#stepNav"),
  stepContent: document.querySelector("#stepContent"),
  phaseLabel: document.querySelector("#phaseLabel"),
  stepTitle: document.querySelector("#stepTitle"),
  stageDescription: document.querySelector("#stageDescription"),
  stepCounter: document.querySelector("#stepCounter"),
  previousButton: document.querySelector("#previousButton"),
  markTbdButton: document.querySelector("#markTbdButton"),
  nextButton: document.querySelector("#nextButton"),
  activeTaskTitle: document.querySelector("#activeTaskTitle"),
  activeTaskStatus: document.querySelector("#activeTaskStatus"),
  taskContext: document.querySelector("#taskContext"),
  saveStatus: document.querySelector("#saveStatus"),
  readinessScore: document.querySelector("#readinessScore"),
  readinessBar: document.querySelector("#readinessBar"),
  readinessHint: document.querySelector("#readinessHint"),
  journeyProgressLabel: document.querySelector("#journeyProgressLabel"),
  journeyFill: document.querySelector("#journeyFill"),
  journeyCharacter: document.querySelector("#journeyCharacter"),
  coachTip: document.querySelector("#coachTip"),
  previewDialog: document.querySelector("#previewDialog"),
  markdownPreview: document.querySelector("#markdownPreview"),
  aiDialog: document.querySelector("#aiDialog"),
  aiSettingsDialog: document.querySelector("#aiSettingsDialog"),
  aiTargetLabel: document.querySelector("#aiTargetLabel"),
  aiAction: document.querySelector("#aiAction"),
  aiResult: document.querySelector("#aiResult"),
  aiLoading: document.querySelector("#aiLoading"),
  runAiButton: document.querySelector("#runAiButton"),
  appendAiButton: document.querySelector("#appendAiButton"),
  replaceAiButton: document.querySelector("#replaceAiButton"),
  aiStatus: document.querySelector("#aiStatus"),
  aiEndpoint: document.querySelector("#aiEndpoint"),
  aiAccessToken: document.querySelector("#aiAccessToken"),
  taskDialog: document.querySelector("#taskDialog"),
  taskList: document.querySelector("#taskList"),
  taskCount: document.querySelector("#taskCount"),
  taskServiceBanner: document.querySelector("#taskServiceBanner"),
  legacyDraftBanner: document.querySelector("#legacyDraftBanner"),
  newTaskTitle: document.querySelector("#newTaskTitle"),
  newTaskOwner: document.querySelector("#newTaskOwner"),
  taskNextActions: document.querySelector("#taskNextActions"),
  selectedTaskTitle: document.querySelector("#selectedTaskTitle"),
  selectedTaskMeta: document.querySelector("#selectedTaskMeta"),
  historyDialog: document.querySelector("#historyDialog"),
  revisionList: document.querySelector("#revisionList"),
  revisionNote: document.querySelector("#revisionNote"),
  toast: document.querySelector("#toast"),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaults);
    return normalizePrd(saved);
  } catch {
    return structuredClone(defaults);
  }
}

function loadAiSettings() {
  try {
    return {
      endpoint: "",
      accessToken: "",
      ...JSON.parse(localStorage.getItem(AI_SETTINGS_KEY)),
    };
  } catch {
    return { endpoint: "", accessToken: "" };
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function field(key, label, options = {}) {
  const {
    type = "text",
    placeholder = "",
    hint = "",
    required = false,
    span = false,
    ai = type === "textarea",
  } = options;
  const labelMarkup = `${label}${required ? ' <span class="required">*</span>' : ""}`;
  const control =
    type === "textarea"
      ? `<textarea id="${key}" data-key="${key}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(state[key])}</textarea>`
      : `<input id="${key}" data-key="${key}" type="${type}" value="${escapeHtml(state[key])}" placeholder="${escapeHtml(placeholder)}" />`;
  return `
    <div class="field ${span ? "field-span" : ""}">
      <div class="field-header">
        <label for="${key}"><span>${labelMarkup}</span>${required ? "<small>必填</small>" : ""}</label>
        ${ai ? `<button class="ai-field-button" data-ai-key="${key}" data-ai-label="${escapeHtml(label)}" type="button">✦ AI 共创</button>` : ""}
      </div>
      ${control}
      ${hint ? `<p class="field-hint">${hint}</p>` : ""}
    </div>
  `;
}

function renderStep() {
  const step = steps[state.currentStep];
  const questionIndex = currentQuestionIndex();
  const question = step.questions[questionIndex];
  elements.phaseLabel.textContent = step.phase;
  elements.stepTitle.textContent = step.title;
  elements.stageDescription.textContent = step.description;
  elements.coachTip.textContent = step.tip;
  elements.stepCounter.textContent =
    `阶段 ${state.currentStep + 1}/${steps.length} · 问题 ${questionIndex + 1}/${step.questions.length}`;
  elements.previousButton.disabled = state.currentStep === 0 && questionIndex === 0;
  elements.markTbdButton.hidden =
    !workflow.navigation.allowTbd || question.kind !== "field";
  const isFinal =
    state.currentStep === steps.length - 1 &&
    questionIndex === step.questions.length - 1;
  elements.nextButton.textContent = isFinal ? "导出文档 ↓" : "下一题 →";
  elements.stepContent.innerHTML = renderLinearQuestion(
    step,
    question,
    questionIndex,
  );
  renderNavigation();
  bindStepEvents();
  updateDashboard();
  updateTaskUi();
}

function renderNavigation() {
  elements.stepNav.innerHTML = steps
    .map((step, index) => {
      const complete = completionForStep(index) >= 0.75;
      const accomplished = index < state.currentStep || (index === state.currentStep && complete);
      return `
        <div class="step-button ${index === state.currentStep ? "active" : ""} ${accomplished ? "complete" : ""} ${index > state.currentStep ? "locked" : ""}">
          <span class="step-number">${accomplished ? "✓" : index + 1}</span>
          <span class="step-copy"><strong>${step.short}</strong><small>${step.subtitle}</small></span>
        </div>
      `;
    })
    .join("");
}

function currentQuestionIndex(stageIndex = state.currentStep) {
  const questions = steps[stageIndex].questions;
  const stored = Number(state.stagePositions?.[steps[stageIndex].id] || 0);
  return Math.max(0, Math.min(questions.length - 1, stored));
}

function setCurrentQuestionIndex(index) {
  const stage = steps[state.currentStep];
  state.stagePositions = {
    ...(state.stagePositions || {}),
    [stage.id]: Math.max(0, Math.min(stage.questions.length - 1, index)),
  };
}

function renderLinearQuestion(stage, question, questionIndex) {
  return `
    <div class="linear-question">
      <div class="question-heading">
        <div>
          <span>问题 ${questionIndex + 1} / ${stage.questions.length}</span>
          <h2>${escapeHtml(question.title)}</h2>
          ${question.help ? `<p>${escapeHtml(question.help)}</p>` : ""}
        </div>
        <b>${
          question.kind === "field"
            ? question.required
              ? "必填"
              : "可暂存 TBD"
            : question.kind === "summary"
              ? "阶段确认"
              : question.kind === "actions"
                ? "交付"
                : "持续补充"
        }</b>
      </div>
      <div class="question-body">
        ${renderQuestionBody(stage, question)}
      </div>
    </div>
  `;
}

function renderQuestionBody(stage, question) {
  if (question.kind === "field") {
    return `<div class="form-grid single-question">${field(question.key, question.label, {
      type: question.inputType === "textarea" ? "textarea" : "text",
      placeholder: question.placeholder || "",
      required: Boolean(question.required),
      span: true,
      ai: Boolean(question.ai),
    })}</div>`;
  }
  if (question.kind === "collection") return renderCollectionQuestion(question);
  if (question.kind === "quality") return renderQualityQuestion();
  if (question.kind === "summary") return renderStageSummary(stage);
  if (question.kind === "actions") return renderDeliveryActions();
  return '<div class="callout"><strong>配置错误</strong><span>不支持的问题类型。</span></div>';
}

function renderCollectionQuestion(question) {
  const collection = question.collection;
  const renderersByCollection = {
    evidence: renderEvidenceRow,
    requirements: renderRequirementRow,
    metrics: renderMetricRow,
    risks: renderRiskRow,
  };
  const labels = {
    evidence: "添加一条证据或判断",
    requirements: "添加功能需求",
    metrics: "添加成功指标",
    risks: "添加风险",
  };
  const renderer = renderersByCollection[collection];
  return `
    <div class="collection linear-collection" id="${collection}Collection">
      ${state[collection].map(renderer).join("")}
      <button class="add-row" data-add="${collection}" type="button">＋ ${labels[collection]}</button>
    </div>
  `;
}

function renderQualityQuestion() {
  const validation = validateState();
  const checked = checklistItems.filter((item) => state.checks[item.id]).length;
  return `
    <div class="validation-results">
      <div class="validation-stat good"><strong>${validation.passed}</strong><span>已通过</span></div>
      <div class="validation-stat warn"><strong>${validation.warnings.length}</strong><span>待补充</span></div>
      <div class="validation-stat neutral"><strong>${checked}/${checklistItems.length}</strong><span>人工检查</span></div>
    </div>
    ${
      validation.warnings.length
        ? `<div class="callout"><strong>结构提示</strong><span>${validation.warnings.map(escapeHtml).join("；")}</span></div>`
        : '<div class="callout"><strong>结构通过</strong><span>关键结构信号齐全，请继续完成人工判断和独立读者测试。</span></div>'
    }
    <div class="checklist">
      ${checklistItems
        .map(
          (item) => `
            <label class="check-item">
              <input type="checkbox" data-check="${item.id}" ${state.checks[item.id] ? "checked" : ""} />
              <span>${escapeHtml(item.text)}</span>
            </label>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderStageSummary(stage) {
  const questions = stage.questions.filter(
    (question) => !["summary", "actions"].includes(question.kind),
  );
  return `
    <div class="stage-summary-list">
      ${questions
        .map(
          (question) => `
            <div class="stage-summary-item ${questionIsComplete(question) ? "complete" : ""}">
              <span>${questionIsComplete(question) ? "✓" : "○"}</span>
              <div><strong>${escapeHtml(question.title)}</strong><small>${questionIsComplete(question) ? "已完成" : question.required ? "仍需补充" : "可保留 TBD"}</small></div>
            </div>
          `,
        )
        .join("")}
    </div>
    <div class="callout"><strong>阶段确认</strong><span>返回修改遗漏内容，或点击“下一题”进入下一阶段。</span></div>
  `;
}

function renderDeliveryActions() {
  return `
    <div class="callout"><strong>交付提醒</strong><span>请核验事实、链接、目标值、法律与合规声明，并取得相关利益方批准。</span></div>
    <div class="form-actions">
      <button class="button button-ghost" data-action="preview" type="button">预览完整文档</button>
      <button class="button button-primary" data-action="export" type="button">导出 Markdown</button>
    </div>
  `;
}

function questionIsComplete(question) {
  if (question.kind === "field") return hasText(state[question.key]);
  if (question.kind === "collection") {
    return (
      state[question.collection].length > 0 &&
      state[question.collection].some((item) => Object.values(item).some(hasText))
    );
  }
  if (question.kind === "quality") {
    return (
      checklistItems.filter((item) => state.checks[item.id]).length >=
      workflow.checklist.minCheckedForCompletion
    );
  }
  return true;
}

function renderEvidenceRow(item, index) {
  return `
    <div class="collection-row">
      <select data-array="evidence" data-index="${index}" data-field="type" aria-label="证据类型">
        ${workflow.enums.evidenceTypes
          .map((type) => `<option ${item.type === type ? "selected" : ""}>${type}</option>`)
          .join("")}
      </select>
      <textarea data-array="evidence" data-index="${index}" data-field="claim" placeholder="主张、洞察或待决问题">${escapeHtml(item.claim)}</textarea>
      <input data-array="evidence" data-index="${index}" data-field="source" value="${escapeHtml(item.source)}" placeholder="来源 / 验证计划" />
      <button class="remove-row" data-remove="evidence" data-index="${index}" type="button" aria-label="删除">×</button>
    </div>
  `;
}

function renderRequirementRow(item, index) {
  return `
    <div class="collection-row requirement-row">
      <input data-array="requirements" data-index="${index}" data-field="id" value="${escapeHtml(item.id)}" placeholder="FR-001" aria-label="需求 ID" />
      <select data-array="requirements" data-index="${index}" data-field="priority" aria-label="优先级">
        ${workflow.enums.priorities.map((value) => `<option ${item.priority === value ? "selected" : ""}>${value}</option>`).join("")}
      </select>
      <div>
        <textarea data-array="requirements" data-index="${index}" data-field="requirement" placeholder="系统应当……">${escapeHtml(item.requirement)}</textarea>
        <textarea data-array="requirements" data-index="${index}" data-field="acceptance" placeholder="给定……当……则……">${escapeHtml(item.acceptance)}</textarea>
      </div>
      <button class="remove-row" data-remove="requirements" data-index="${index}" type="button" aria-label="删除">×</button>
    </div>
  `;
}

function renderMetricRow(item, index) {
  return `
    <div class="collection-row metric-row">
      <input data-array="metrics" data-index="${index}" data-field="name" value="${escapeHtml(item.name)}" placeholder="指标名称" />
      <textarea data-array="metrics" data-index="${index}" data-field="definition" placeholder="基线 / 定义 / 来源">${escapeHtml(item.definition)}</textarea>
      <textarea data-array="metrics" data-index="${index}" data-field="target" placeholder="目标 / 护栏 / 周期 / 负责人">${escapeHtml(item.target)}</textarea>
      <button class="remove-row" data-remove="metrics" data-index="${index}" type="button" aria-label="删除">×</button>
    </div>
  `;
}

function renderRiskRow(item, index) {
  return `
    <div class="collection-row metric-row">
      <textarea data-array="risks" data-index="${index}" data-field="risk" placeholder="风险与影响">${escapeHtml(item.risk)}</textarea>
      <textarea data-array="risks" data-index="${index}" data-field="mitigation" placeholder="缓解措施">${escapeHtml(item.mitigation)}</textarea>
      <textarea data-array="risks" data-index="${index}" data-field="signal" placeholder="触发信号 / 负责人">${escapeHtml(item.signal)}</textarea>
      <button class="remove-row" data-remove="risks" data-index="${index}" type="button" aria-label="删除">×</button>
    </div>
  `;
}

function bindStepEvents() {
  elements.stepContent.querySelectorAll("[data-key]").forEach((control) => {
    control.addEventListener("input", () => {
      state[control.dataset.key] = control.value;
      queueSave();
      updateDashboard();
    });
  });

  elements.stepContent.querySelectorAll("[data-array]").forEach((control) => {
    control.addEventListener("input", () => {
      const { array, index, field: itemField } = control.dataset;
      state[array][Number(index)][itemField] = control.value;
      queueSave();
      updateDashboard();
    });
  });

  elements.stepContent.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      addItem(button.dataset.add);
      renderStep();
    });
  });

  elements.stepContent.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state[button.dataset.remove].splice(Number(button.dataset.index), 1);
      saveState();
      renderStep();
    });
  });

  elements.stepContent.querySelectorAll("[data-check]").forEach((control) => {
    control.addEventListener("change", () => {
      state.checks[control.dataset.check] = control.checked;
      saveState();
      updateDashboard();
    });
  });

  elements.stepContent.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "preview") openPreview();
      if (button.dataset.action === "export") exportMarkdown();
    });
  });

  elements.stepContent.querySelectorAll("[data-ai-key]").forEach((button) => {
    button.addEventListener("click", () => {
      openAiAssistant({
        key: button.dataset.aiKey,
        label: button.dataset.aiLabel,
      });
    });
  });
}

function addItem(collection) {
  const factories = {
    evidence: () => ({
      type: workflow.enums.evidenceTypes[0],
      claim: "",
      source: "",
    }),
    requirements: () => ({
      id: `FR-${String(state.requirements.length + 1).padStart(3, "0")}`,
      priority: workflow.enums.priorities[0],
      requirement: "",
      acceptance: "",
    }),
    metrics: () => ({ name: "", definition: "", target: "" }),
    risks: () => ({ risk: "", mitigation: "", signal: "" }),
  };
  state[collection].push(factories[collection]());
  saveState();
}

function queueSave() {
  elements.saveStatus.textContent = activeTask ? "正在同步任务…" : "正在保存…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 300);
}

function saveState() {
  const storageKey = activeTask
    ? `${TASK_CACHE_PREFIX}${activeTask.id}`
    : STORAGE_KEY;
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (activeTask) {
    queueRemoteTaskSave();
    elements.saveStatus.textContent = "已保存本机，等待同步";
  } else {
    elements.saveStatus.textContent = "已自动保存到本机";
  }
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function completionForStep(index) {
  const fields = steps[index].completionFields;
  const completed = fields.filter((key) => {
    if (key === "checks") {
      return (
        checklistItems.filter((item) => state.checks[item.id]).length >=
        workflow.checklist.minCheckedForCompletion
      );
    }
    if (Array.isArray(state[key])) {
      return state[key].length > 0 && state[key].some((item) => Object.values(item).some(hasText));
    }
    return hasText(state[key]);
  }).length;
  return completed / fields.length;
}

function updateDashboard() {
  const score = Math.round(
    (steps.reduce((sum, _, index) => sum + completionForStep(index), 0) /
      steps.length) *
      100,
  );
  elements.readinessScore.textContent = `${score}%`;
  elements.readinessBar.style.width = `${score}%`;
  elements.readinessBar.parentElement.setAttribute("aria-valuenow", score);
  elements.readinessHint.textContent =
    workflow.readiness.hints.find((hint) => score >= hint.minScore)?.text || "";

  const questionProgress =
    (currentQuestionIndex() + 1) / steps[state.currentStep].questions.length;
  const journeyProgress = Math.min(
    100,
    ((state.currentStep + questionProgress) / steps.length) * 100,
  );
  elements.journeyProgressLabel.textContent =
    `阶段 ${state.currentStep + 1} · 问题 ${currentQuestionIndex() + 1}/${steps[state.currentStep].questions.length}`;
  elements.journeyFill.style.width = `${journeyProgress}%`;
  elements.journeyCharacter.style.left = `${Math.max(2, journeyProgress)}%`;

  const counts = { Fact: 0, Decision: 0, Assumption: 0, TBD: 0 };
  state.evidence.forEach((item) => {
    if (counts[item.type] !== undefined && hasText(item.claim)) counts[item.type] += 1;
  });
  document.querySelector("#evidenceCount").textContent =
    `${Object.values(counts).reduce((sum, count) => sum + count, 0)} 条`;
  document.querySelector("#factCount").textContent = counts.Fact;
  document.querySelector("#decisionCount").textContent = counts.Decision;
  document.querySelector("#assumptionCount").textContent = counts.Assumption;
  document.querySelector("#tbdCount").textContent = counts.TBD;
}

function validateState() {
  const rules = workflow.validation.rules.map((rule) => [
    evaluateValidationRule(rule),
    rule.message,
  ]);
  return {
    passed: rules.filter(([passed]) => passed).length,
    warnings: rules.filter(([passed]) => !passed).map(([, message]) => message),
  };
}

function evaluateValidationRule(rule) {
  if (rule.kind === "nonEmpty") return hasText(state[rule.field]);
  if (rule.kind === "allNonEmpty") {
    return rule.fields.every((fieldKey) => hasText(state[fieldKey]));
  }
  if (rule.kind === "anyNonEmpty") {
    return rule.fields.some((fieldKey) => hasText(state[fieldKey]));
  }
  if (rule.kind === "arrayNonEmpty") {
    return state[rule.field].some((item) => hasText(item[rule.itemField]));
  }
  return false;
}

function bullets(value, empty = "- TBD") {
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines.map((line) => `- ${line}`).join("\n") : empty;
}

function tableCell(value) {
  return String(value || "TBD").replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function generateMarkdown() {
  const today = new Date().toISOString().slice(0, 10);
  const evidenceRows =
    state.evidence
      .filter((item) => hasText(item.claim))
      .map(
        (item, index) =>
          `| E-${String(index + 1).padStart(3, "0")} | ${tableCell(item.claim)} | ${item.type} | ${tableCell(item.source)} |`,
      )
      .join("\n") || "| E-001 | TBD | TBD | TBD |";
  const requirementRows =
    state.requirements
      .filter((item) => hasText(item.requirement))
      .map(
        (item) =>
          `| ${tableCell(item.id)} | ${tableCell(item.priority)} | ${tableCell(item.requirement)} |`,
      )
      .join("\n") || "| FR-001 | Must | TBD |";
  const acceptance =
    state.requirements
      .filter((item) => hasText(item.acceptance))
      .map((item) => `#### ${item.id}\n\n${bullets(item.acceptance)}`)
      .join("\n\n") || "#### FR-001\n\n- Given TBD, when TBD, then TBD.";
  const metricRows =
    state.metrics
      .filter((item) => hasText(item.name))
      .map(
        (item) =>
          `| ${tableCell(item.name)} | ${tableCell(item.definition)} | ${tableCell(item.target)} |`,
      )
      .join("\n") || "| TBD | TBD + 测量计划 | TBD |";
  const riskRows =
    state.risks
      .filter((item) => hasText(item.risk))
      .map(
        (item) =>
          `| ${tableCell(item.risk)} | ${tableCell(item.mitigation)} | ${tableCell(item.signal)} |`,
      )
      .join("\n") || "| TBD | TBD | TBD |";

  return `# ${state.productName || "未命名产品 / 功能"}

| 字段 | 内容 |
| --- | --- |
| 状态 | Draft |
| 负责人 | ${tableCell(state.owner)} |
| 审批人 | ${tableCell(state.approver)} |
| 最后更新 | ${today} |
| 目标发布 | ${tableCell(state.targetRelease)} |

## 1. 执行摘要

${state.executiveSummary || "TBD：在正文完成后补充不超过 150 字的执行摘要。"}

- **需要的决策：** ${state.decisionNeeded || "TBD"}
- **目标读者：** ${state.audience || "TBD"}

## 2. 背景与证据

### 背景与为什么是现在

${state.whyNow || "TBD"}

### 证据地图

| ID | 主张或洞察 | 类型 | 来源 / 验证计划 |
| --- | --- | --- | --- |
${evidenceRows}

### 当前用户旅程与替代方案

${state.currentJourney || state.currentWorkaround || "TBD"}

## 3. 问题与机会

### 问题陈述

${state.problem || "TBD"}

### 期望结果

${state.desiredOutcome || "TBD"}

## 4. 用户与任务

### 主要用户

${state.targetUsers || "TBD"}

### 当前替代方案

${state.currentWorkaround || "TBD"}

## 5. 目标与成功指标

### 目标

${bullets(state.goals)}

### 非目标

${bullets(state.nonGoals)}

### 指标

| 指标 | 基线 / 定义 / 来源 | 目标 / 护栏 / 周期 / 负责人 |
| --- | --- | --- |
${metricRows}

## 6. 范围与用户体验

### 范围内

${bullets(state.inScope)}

### 范围外

${bullets(state.outOfScope)}

### 延期

${bullets(state.deferred)}

### 未来用户旅程

${state.futureJourney || "TBD"}

## 7. 需求

### 功能需求

| ID | 优先级 | 需求 |
| --- | --- | --- |
${requirementRows}

### 验收标准

${acceptance}

### 非功能需求

${state.nfr || "TBD：类别｜可量化阈值｜验证方式"}

## 8. 技术与运营考虑

### 约束

${state.constraints || "TBD"}

### 依赖

${state.dependencies || "TBD"}

## 9. 风险与发布

### 风险

| 风险与影响 | 缓解措施 | 触发信号 / 负责人 |
| --- | --- | --- |
${riskRows}

### 发布与验证

${state.rollout || "TBD"}

## 10. 假设与开放决策

### 待验证假设

${bullets(
  state.evidence
    .filter((item) => item.type === "Assumption")
    .map((item) => `${item.claim}｜验证：${item.source || "TBD"}`)
    .join("\n"),
)}

### 开放决策

${state.openDecisions || "TBD"}

### 建议下一步

${state.nextAction || "TBD"}
`;
}

function openPreview() {
  elements.markdownPreview.textContent = generateMarkdown();
  elements.previewDialog.showModal();
}

function exportMarkdown() {
  const markdown = generateMarkdown();
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const filename = (state.productName || "prd")
    .trim()
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/^-|-$/g, "");
  anchor.href = url;
  anchor.download = `${filename || "prd"}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Markdown 文档已导出");
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

function gatewayBaseUrl() {
  return String(aiSettings.endpoint || "")
    .trim()
    .replace(/\/api\/assist\/?$/, "")
    .replace(/\/$/, "");
}

async function apiRequest(path, options = {}) {
  const baseUrl = gatewayBaseUrl();
  if (!baseUrl || !aiSettings.accessToken) {
    throw new Error("请先配置工作台服务");
  }
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiSettings.accessToken}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `服务请求失败（${response.status}）`);
  }
  return payload;
}

function hasLegacyDraft() {
  return [
    state.productName,
    state.problem,
    state.targetUsers,
    state.desiredOutcome,
    state.goals,
    state.inScope,
  ].some(hasText) || [state.evidence, state.requirements, state.metrics, state.risks].some(
    (items) => items.length > 0,
  );
}

function normalizePrd(prd) {
  const cleanPrd =
    prd && typeof prd === "object"
      ? Object.fromEntries(
          Object.entries(prd).filter(([key]) =>
            Object.prototype.hasOwnProperty.call(defaults, key),
          ),
        )
      : {};
  return {
    ...structuredClone(defaults),
    ...cleanPrd,
    stagePositions:
      cleanPrd.stagePositions && typeof cleanPrd.stagePositions === "object"
        ? cleanPrd.stagePositions
        : {},
    checks: normalizeChecks(prd?.checks),
  };
}

function normalizeChecks(value) {
  return Object.fromEntries(
    checklistItems.map((item, index) => [
      item.id,
      Boolean(Array.isArray(value) ? value[index] : value?.[item.id]),
    ]),
  );
}

function updateTaskUi() {
  const title = activeTask?.title || "尚未选择任务";
  const status = activeTask ? taskStatuses[activeTask.status] || activeTask.status : "待创建";
  elements.activeTaskTitle.textContent = title;
  elements.activeTaskStatus.textContent = status;
  elements.taskContext.textContent = activeTask
    ? `任务：${title} · ${status} · 版本 ${activeTask.current_revision || 1}`
    : "请先创建或选择一个任务";
  document.querySelector("#historyButton").disabled = !activeTask;
  document.querySelector("#saveVersionButton").disabled = !activeTask;
}

function queueRemoteTaskSave() {
  if (!activeTask) return;
  clearTimeout(remoteSaveTimer);
  const taskId = activeTask.id;
  remoteSaveTimer = setTimeout(() => syncActiveTask(taskId), 900);
}

async function syncActiveTask(expectedTaskId = activeTask?.id) {
  if (!activeTask || activeTask.id !== expectedTaskId) return;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = null;
  const taskId = activeTask.id;
  try {
    const payload = await apiRequest(`/api/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: activeTask.title,
        status: activeTask.status,
        owner: state.owner || activeTask.owner,
        prd: state,
      }),
    });
    if (activeTask?.id === taskId) {
      activeTask = payload.task;
      upsertTaskSummary(payload.task);
      elements.saveStatus.textContent = "任务已同步到云端";
      updateTaskUi();
    }
  } catch (error) {
    elements.saveStatus.textContent = "云端同步失败，本机已保存";
    console.error("Task sync failed", error);
  }
}

function upsertTaskSummary(task) {
  const summary = {
    id: task.id,
    title: task.title,
    status: task.status,
    owner: task.owner,
    current_revision: task.current_revision,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
  const index = tasks.findIndex((item) => item.id === task.id);
  if (index >= 0) tasks[index] = summary;
  else tasks.unshift(summary);
  tasks.sort((left, right) => String(right.updated_at).localeCompare(left.updated_at));
  renderTaskList();
}

async function loadTasks() {
  const payload = await apiRequest("/api/tasks");
  tasks = payload.tasks || [];
  renderTaskList();
  return tasks;
}

function formatDate(value) {
  if (!value) return "未知时间";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function renderTaskList() {
  elements.taskCount.textContent = `${tasks.length} 个`;
  elements.legacyDraftBanner.hidden = Boolean(activeTask) || !hasLegacyDraft();
  if (!tasks.length) {
    selectedEntryTaskId = null;
    elements.taskNextActions.hidden = true;
    elements.taskList.innerHTML =
      '<div class="task-list-empty">还没有任务。创建第一个任务后，所有 PRD 内容和版本都将归属该任务。</div>';
    return;
  }
  const lastTaskId = localStorage.getItem(ACTIVE_TASK_KEY);
  elements.taskList.innerHTML = tasks
    .map(
      (task) => `
        <article class="task-item ${task.id === activeTask?.id ? "active" : ""} ${task.id === selectedEntryTaskId ? "selected" : ""}">
          <div class="task-item-copy">
            <strong>${escapeHtml(task.title)}</strong>
            <small>${task.id === lastTaskId ? "上次任务 · " : ""}v${task.current_revision || 1} · 更新于 ${formatDate(task.updated_at)}</small>
          </div>
          <select class="task-status-select" data-task-status="${task.id}" aria-label="任务状态">
            ${Object.entries(taskStatuses)
              .filter(([value]) => value !== "archived")
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${task.status === value ? "selected" : ""}>${label}</option>`,
              )
              .join("")}
          </select>
          <div class="task-item-actions">
            <button class="button ${task.id === selectedEntryTaskId ? "button-primary" : "button-ghost"}" data-select-task="${task.id}" type="button">
              ${task.id === selectedEntryTaskId ? "已选择" : "选择"}
            </button>
          </div>
        </article>
      `,
    )
    .join("");
  updateSelectedTaskActions();
}

async function openTaskCenter() {
  if (!aiSettings.endpoint || !aiSettings.accessToken) {
    await bootstrapTasks();
    return;
  }
  selectedEntryTaskId = activeTask?.id || null;
  updateTaskGate();
  if (!elements.taskDialog.open) elements.taskDialog.showModal();
  try {
    await loadTasks();
  } catch (error) {
    elements.taskList.innerHTML = `<div class="task-list-empty">${escapeHtml(error.message)}</div>`;
  }
}

function setTaskServiceAvailability(configured) {
  elements.taskServiceBanner.hidden = configured;
  elements.newTaskTitle.disabled = !configured;
  elements.newTaskOwner.disabled = !configured;
  document.querySelector("#newTaskForm button[type='submit']").disabled = !configured;
  document.querySelector("#refreshTasksButton").disabled = !configured;
  document.querySelector("#migrateDraftButton").disabled = !configured;
}

function updateTaskGate() {
  const gateRequired = !activeTask;
  elements.taskDialog.classList.toggle("task-gate", gateRequired);
  document.querySelector("#closeTaskButton").hidden = gateRequired;
  document.querySelector("#taskDialogTitle").textContent = gateRequired
    ? "先选择任务，再开始 PRD"
    : "切换或创建任务";
  updateSelectedTaskActions();
}

function selectTaskForActions(taskId) {
  selectedEntryTaskId = taskId;
  renderTaskList();
}

function updateSelectedTaskActions() {
  const task = tasks.find((item) => item.id === selectedEntryTaskId);
  elements.taskNextActions.hidden = !task;
  if (!task) return;
  elements.selectedTaskTitle.textContent = task.title;
  elements.selectedTaskMeta.textContent =
    `${taskStatuses[task.status] || task.status} · 版本 ${task.current_revision || 1} · 更新于 ${formatDate(task.updated_at)}`;
}

async function createTask(title, owner, prd = null) {
  const taskPrd = normalizePrd(prd || {});
  if (!hasText(taskPrd.productName)) taskPrd.productName = title;
  if (!hasText(taskPrd.owner)) taskPrd.owner = owner;
  const payload = await apiRequest("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      title,
      owner,
      status: "draft",
      prd: taskPrd,
    }),
  });
  upsertTaskSummary(payload.task);
  await activateTask(payload.task);
  return payload.task;
}

async function activateTask(taskOrId) {
  if (activeTask && activeTask.id !== taskOrId && activeTask.id !== taskOrId?.id) {
    await syncActiveTask(activeTask.id);
  }
  const task =
    typeof taskOrId === "string"
      ? (await apiRequest(`/api/tasks/${taskOrId}`)).task
      : taskOrId;
  activeTask = task;
  state = normalizePrd(task.prd);
  localStorage.setItem(ACTIVE_TASK_KEY, task.id);
  localStorage.setItem(`${TASK_CACHE_PREFIX}${task.id}`, JSON.stringify(state));
  upsertTaskSummary(task);
  renderStep();
  showToast(`已打开任务：${task.title}`);
}

async function updateTaskStatus(taskId, status) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  const payload = await apiRequest(`/api/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  upsertTaskSummary(payload.task);
  if (activeTask?.id === taskId) {
    activeTask.status = payload.task.status;
    activeTask.updated_at = payload.task.updated_at;
    updateTaskUi();
  }
  updateSelectedTaskActions();
  showToast(`任务状态已更新为${taskStatuses[status]}`);
}

async function archiveTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task || !window.confirm(`确定归档任务“${task.title}”吗？历史版本仍会保留。`)) {
    return;
  }
  await apiRequest(`/api/tasks/${taskId}`, { method: "DELETE" });
  tasks = tasks.filter((item) => item.id !== taskId);
  if (selectedEntryTaskId === taskId) selectedEntryTaskId = null;
  if (activeTask?.id === taskId) {
    activeTask = null;
    state = structuredClone(defaults);
    localStorage.removeItem(ACTIVE_TASK_KEY);
    renderStep();
  }
  renderTaskList();
  updateTaskGate();
  showToast("任务已归档");
}

async function bootstrapTasks() {
  updateTaskUi();
  activeTask = null;
  selectedEntryTaskId = null;
  updateTaskUi();
  updateTaskGate();
  if (!elements.taskDialog.open) elements.taskDialog.showModal();

  if (!aiSettings.endpoint || !aiSettings.accessToken) {
    setTaskServiceAvailability(false);
    elements.taskCount.textContent = "未连接";
    elements.taskList.innerHTML =
      '<div class="task-list-empty">配置工作台服务后，这里会显示历史任务。</div>';
    return;
  }
  setTaskServiceAvailability(true);
  try {
    await loadTasks();
    renderTaskList();
  } catch (error) {
    console.error("Task bootstrap failed", error);
    showToast(`任务服务未就绪：${error.message}`);
  }
}

async function openHistory() {
  if (!activeTask) {
    showToast("请先选择任务");
    return;
  }
  await syncActiveTask(activeTask.id);
  elements.historyDialog.showModal();
  await loadRevisions();
}

async function loadRevisions() {
  if (!activeTask) return;
  elements.revisionList.innerHTML =
    '<div class="revision-list-empty">正在加载版本历史…</div>';
  try {
    const payload = await apiRequest(`/api/tasks/${activeTask.id}/revisions`);
    renderRevisions(payload.revisions || []);
  } catch (error) {
    elements.revisionList.innerHTML = `<div class="revision-list-empty">${escapeHtml(error.message)}</div>`;
  }
}

function renderRevisions(revisions) {
  if (!revisions.length) {
    elements.revisionList.innerHTML =
      '<div class="revision-list-empty">还没有版本快照。</div>';
    return;
  }
  elements.revisionList.innerHTML = revisions
    .map(
      (revision) => `
        <article class="revision-item">
          <span class="revision-number">v${revision.revision}</span>
          <div class="revision-copy">
            <strong>${escapeHtml(revision.change_note || "未填写说明")}</strong>
            <small>${formatDate(revision.created_at)}</small>
          </div>
          <div class="task-item-actions">
            <button class="button button-ghost" data-preview-revision="${revision.revision}" type="button">查看</button>
            <button class="button button-ghost" data-restore-revision="${revision.revision}" type="button">恢复</button>
          </div>
        </article>
      `,
    )
    .join("");
}

async function createRevision(note) {
  if (!activeTask) return;
  await syncActiveTask(activeTask.id);
  const payload = await apiRequest(`/api/tasks/${activeTask.id}/revisions`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
  activeTask.current_revision = payload.revision.revision;
  upsertTaskSummary(activeTask);
  elements.revisionNote.value = "";
  await loadRevisions();
  updateTaskUi();
  showToast(`版本 v${payload.revision.revision} 已保存`);
}

async function fetchRevision(revision) {
  return (
    await apiRequest(`/api/tasks/${activeTask.id}/revisions/${revision}`)
  ).revision;
}

async function previewRevision(revisionNumber) {
  const revision = await fetchRevision(revisionNumber);
  const currentState = state;
  state = normalizePrd(revision.prd);
  elements.markdownPreview.textContent = generateMarkdown();
  state = currentState;
  elements.previewDialog.showModal();
}

async function restoreRevision(revisionNumber) {
  if (
    !activeTask ||
    !window.confirm(
      `确定恢复版本 v${revisionNumber} 吗？当前草稿会被替换，但会保留为历史记录。`,
    )
  ) {
    return;
  }
  const payload = await apiRequest(
    `/api/tasks/${activeTask.id}/revisions/${revisionNumber}/restore`,
    { method: "POST" },
  );
  await activateTask(payload.task);
  elements.historyDialog.close();
  showToast(`已恢复版本 v${revisionNumber}，并创建新的恢复版本`);
}

function updateAiStatus() {
  const configured = Boolean(aiSettings.endpoint && aiSettings.accessToken);
  elements.aiStatus.textContent = configured ? "已配置" : "未配置";
  elements.aiStatus.classList.toggle("connected", configured);
}

function openAiAssistant(target = { key: null, label: "当前阶段" }) {
  if (!aiSettings.endpoint || !aiSettings.accessToken) {
    openAiSettings();
    showToast("请先配置 AI 安全网关");
    return;
  }
  aiTarget = target;
  elements.aiTargetLabel.textContent = target.label;
  elements.aiResult.value = "";
  elements.appendAiButton.disabled = true;
  elements.replaceAiButton.disabled = true;
  elements.aiDialog.showModal();
}

function openAiSettings() {
  elements.aiEndpoint.value = aiSettings.endpoint;
  elements.aiAccessToken.value = aiSettings.accessToken;
  elements.aiSettingsDialog.showModal();
}

function buildAiContext() {
  const context = {
    task: activeTask
      ? {
          id: activeTask.id,
          title: activeTask.title,
          status: activeTask.status,
          revision: activeTask.current_revision,
        }
      : null,
    phase: steps[state.currentStep].short,
    question: steps[state.currentStep].questions[currentQuestionIndex()].id,
    ...Object.fromEntries(
      workflow.ai.contextFields.map((fieldKey) => [fieldKey, state[fieldKey]]),
    ),
  };
  return JSON.stringify(context).slice(0, workflow.ai.contextMaxChars);
}

async function runAiAssistant() {
  const originalText = aiTarget.key ? state[aiTarget.key] || "" : "";
  elements.runAiButton.disabled = true;
  elements.aiLoading.hidden = false;
  elements.aiResult.value = "";
  elements.appendAiButton.disabled = true;
  elements.replaceAiButton.disabled = true;

  try {
    const response = await fetch(aiSettings.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiSettings.accessToken}`,
      },
      body: JSON.stringify({
        action: elements.aiAction.value,
        target: {
          key: aiTarget.key,
          label: aiTarget.label,
          value: originalText,
        },
        context: buildAiContext(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `AI 请求失败（${response.status}）`);
    }
    if (!payload.content) throw new Error("AI 没有返回可用内容");
    elements.aiResult.value = payload.content;
    const canApply = Boolean(aiTarget.key);
    elements.appendAiButton.disabled = !canApply;
    elements.replaceAiButton.disabled = !canApply;
  } catch (error) {
    elements.aiResult.value = `无法完成 AI 分析：${error.message}`;
  } finally {
    elements.runAiButton.disabled = false;
    elements.aiLoading.hidden = true;
  }
}

function applyAiResult(operation) {
  if (!aiTarget.key || !elements.aiResult.value) return;
  const suggestion = elements.aiResult.value.trim();
  state[aiTarget.key] =
    operation === "append" && hasText(state[aiTarget.key])
      ? `${state[aiTarget.key].trim()}\n${suggestion}`
      : suggestion;
  saveState();
  elements.aiDialog.close();
  renderStep();
  showToast(operation === "append" ? "AI 建议已追加" : "字段内容已替换");
}

function moveLinear(direction) {
  const stage = steps[state.currentStep];
  const questionIndex = currentQuestionIndex();
  if (direction > 0) {
    if (questionIndex < stage.questions.length - 1) {
      setCurrentQuestionIndex(questionIndex + 1);
    } else if (state.currentStep < steps.length - 1) {
      state.currentStep += 1;
      setCurrentQuestionIndex(currentQuestionIndex(state.currentStep));
    } else {
      exportMarkdown();
      return;
    }
  } else if (questionIndex > 0) {
    setCurrentQuestionIndex(questionIndex - 1);
  } else if (state.currentStep > 0) {
    state.currentStep -= 1;
    setCurrentQuestionIndex(steps[state.currentStep].questions.length - 1);
  } else {
    return;
  }
  saveState();
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

elements.previousButton.addEventListener("click", () => moveLinear(-1));
elements.nextButton.addEventListener("click", () => moveLinear(1));
elements.markTbdButton.addEventListener("click", () => {
  const question = steps[state.currentStep].questions[currentQuestionIndex()];
  if (question.kind !== "field") return;
  if (!hasText(state[question.key])) state[question.key] = "TBD";
  saveState();
  moveLinear(1);
});

document.querySelector("#previewButton").addEventListener("click", openPreview);
document.querySelector("#exportButton").addEventListener("click", exportMarkdown);
document.querySelector("#taskCenterButton").addEventListener("click", openTaskCenter);
elements.taskContext.addEventListener("click", openTaskCenter);
document.querySelector("#historyButton").addEventListener("click", openHistory);
document.querySelector("#saveVersionButton").addEventListener("click", openHistory);
document
  .querySelector("#aiAssistantButton")
  .addEventListener("click", () => openAiAssistant());
document
  .querySelector("#aiQuickStartButton")
  .addEventListener("click", () => openAiAssistant());
document.querySelector("#aiSettingsButton").addEventListener("click", openAiSettings);
document
  .querySelector("#closePreviewButton")
  .addEventListener("click", () => elements.previewDialog.close());
elements.previewDialog.addEventListener("click", (event) => {
  if (event.target === elements.previewDialog) elements.previewDialog.close();
});

document
  .querySelector("#closeAiButton")
  .addEventListener("click", () => elements.aiDialog.close());
document
  .querySelector("#closeAiSettingsButton")
  .addEventListener("click", () => elements.aiSettingsDialog.close());
elements.aiDialog.addEventListener("click", (event) => {
  if (event.target === elements.aiDialog) elements.aiDialog.close();
});
elements.aiSettingsDialog.addEventListener("click", (event) => {
  if (event.target === elements.aiSettingsDialog) elements.aiSettingsDialog.close();
});
elements.aiSettingsDialog.addEventListener("close", () => {
  if (!activeTask) bootstrapTasks();
});
document
  .querySelector("#closeTaskButton")
  .addEventListener("click", () => {
    if (activeTask) elements.taskDialog.close();
  });
document
  .querySelector("#closeHistoryButton")
  .addEventListener("click", () => elements.historyDialog.close());
elements.taskDialog.addEventListener("click", (event) => {
  if (event.target === elements.taskDialog && activeTask) {
    elements.taskDialog.close();
  }
});
elements.taskDialog.addEventListener("cancel", (event) => {
  if (!activeTask) event.preventDefault();
});
elements.historyDialog.addEventListener("click", (event) => {
  if (event.target === elements.historyDialog) elements.historyDialog.close();
});
elements.runAiButton.addEventListener("click", runAiAssistant);
elements.appendAiButton.addEventListener("click", () => applyAiResult("append"));
elements.replaceAiButton.addEventListener("click", () => applyAiResult("replace"));
document.querySelector("#aiSettingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  aiSettings = {
    endpoint: elements.aiEndpoint.value.trim(),
    accessToken: elements.aiAccessToken.value.trim(),
  };
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
  updateAiStatus();
  elements.aiSettingsDialog.close();
  showToast("AI 服务配置已保存");
});

document.querySelector("#newTaskForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createTask(
      elements.newTaskTitle.value.trim(),
      elements.newTaskOwner.value.trim(),
    );
    elements.newTaskTitle.value = "";
    elements.newTaskOwner.value = "";
    elements.taskDialog.close();
  } catch (error) {
    showToast(`创建任务失败：${error.message}`);
  }
});

document
  .querySelector("#configureTaskServiceButton")
  .addEventListener("click", () => {
    elements.taskDialog.close();
    openAiSettings();
  });

document.querySelector("#migrateDraftButton").addEventListener("click", async () => {
  try {
    const legacyState = structuredClone(state);
    const title = state.productName || "迁移的 PRD 草稿";
    await createTask(title, state.owner || "", legacyState);
    localStorage.removeItem(STORAGE_KEY);
    elements.taskDialog.close();
    showToast("旧版草稿已迁移为任务");
  } catch (error) {
    showToast(`迁移失败：${error.message}`);
  }
});

document.querySelector("#refreshTasksButton").addEventListener("click", async () => {
  try {
    await loadTasks();
    showToast("任务列表已刷新");
  } catch (error) {
    showToast(`刷新失败：${error.message}`);
  }
});

elements.taskList.addEventListener("click", async (event) => {
  const selectButton = event.target.closest("[data-select-task]");
  if (selectButton) selectTaskForActions(selectButton.dataset.selectTask);
});

elements.taskList.addEventListener("change", async (event) => {
  const select = event.target.closest("[data-task-status]");
  if (!select) return;
  try {
    await updateTaskStatus(select.dataset.taskStatus, select.value);
  } catch (error) {
    showToast(`状态更新失败：${error.message}`);
    await loadTasks();
  }
});

document.querySelector("#continueTaskButton").addEventListener("click", async () => {
  if (!selectedEntryTaskId) return;
  try {
    await activateTask(selectedEntryTaskId);
    elements.taskDialog.close();
  } catch (error) {
    showToast(`打开任务失败：${error.message}`);
  }
});

document.querySelector("#viewTaskHistoryButton").addEventListener("click", async () => {
  if (!selectedEntryTaskId) return;
  try {
    await activateTask(selectedEntryTaskId);
    elements.taskDialog.close();
    await openHistory();
  } catch (error) {
    showToast(`读取历史失败：${error.message}`);
  }
});

document
  .querySelector("#archiveSelectedTaskButton")
  .addEventListener("click", async () => {
    if (!selectedEntryTaskId) return;
    try {
      await archiveTask(selectedEntryTaskId);
    } catch (error) {
      showToast(`归档失败：${error.message}`);
    }
  });

document.querySelector("#saveRevisionForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createRevision(elements.revisionNote.value.trim());
  } catch (error) {
    showToast(`版本保存失败：${error.message}`);
  }
});

elements.revisionList.addEventListener("click", async (event) => {
  const previewButton = event.target.closest("[data-preview-revision]");
  const restoreButton = event.target.closest("[data-restore-revision]");
  try {
    if (previewButton) {
      await previewRevision(previewButton.dataset.previewRevision);
    }
    if (restoreButton) {
      await restoreRevision(restoreButton.dataset.restoreRevision);
    }
  } catch (error) {
    showToast(`版本操作失败：${error.message}`);
  }
});

document.querySelector("#resetButton").addEventListener("click", () => {
  const target = activeTask ? `任务“${activeTask.title}”的当前草稿` : "当前本地草稿";
  if (!window.confirm(`确定清空${target}吗？已保存的历史版本不会删除。`)) return;
  state = structuredClone(defaults);
  if (!activeTask) localStorage.removeItem(STORAGE_KEY);
  saveState();
  renderStep();
  showToast("工作台已清空");
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveState();
    showToast("已保存");
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    moveLinear(1);
  }
});

elements.aiAction.innerHTML = workflow.ai.actions
  .map(
    (action) =>
      `<option value="${action.id}">${escapeHtml(action.label)}</option>`,
  )
  .join("");
updateAiStatus();
renderStep();
bootstrapTasks();
