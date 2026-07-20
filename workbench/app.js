const STORAGE_KEY = "zxl-prd-workbench-v1";

const steps = [
  {
    short: "项目概况",
    subtitle: "文档契约",
    phase: "PHASE 1 · 建立文档契约",
    title: "先对齐问题，再讨论方案",
    tip: "先描述目标用户正在经历的问题，不要急于写功能清单。",
  },
  {
    short: "证据地图",
    subtitle: "事实与假设",
    phase: "PHASE 2 · 构建证据地图",
    title: "让每个关键判断都有出处",
    tip: "无法证明的内容不是事实；将它标为假设，并写明验证方法。",
  },
  {
    short: "产品框架",
    subtitle: "目标与范围",
    phase: "PHASE 3 · 先框定，再细化",
    title: "明确结果、边界与关键旅程",
    tip: "好范围不仅说明要做什么，也说明不做什么以及推迟什么。",
  },
  {
    short: "需求共创",
    subtitle: "行为与验收",
    phase: "PHASE 4 · 共创 PRD",
    title: "把需求写成可验证的行为",
    tip: "每条需求都应包含触发条件、预期结果，以及失败或恢复行为。",
  },
  {
    short: "度量与风险",
    subtitle: "成功定义",
    phase: "PHASE 4 · 度量与交付",
    title: "定义怎样才算真正成功",
    tip: "指标需要基线或测量计划、目标、护栏、周期、来源和负责人。",
  },
  {
    short: "质量检查",
    subtitle: "结构与判断",
    phase: "PHASE 5–6 · 校验与读者测试",
    title: "在交付前暴露歧义与缺口",
    tip: "自动检查只能发现结构信号，不能证明产品推理正确。",
  },
  {
    short: "交付",
    subtitle: "摘要与决策",
    phase: "PHASE 7 · 交付",
    title: "形成可供决策的完整文档",
    tip: "交付前请核验事实、链接、指标、合规声明和利益相关者批准。",
  },
];

const checklistItems = [
  "请求的决策及其审批人明确",
  "问题、紧迫性、目标用户与期望结果清楚",
  "范围、非目标与延期项可避免误解",
  "关键主张有来源或明确标为假设",
  "事实、决策、假设与 TBD 可区分",
  "功能需求拥有稳定 ID 与合理优先级",
  "验收标准二元、可观察且不绑定实现",
  "主要指标包含定义、基线、目标、周期、来源与负责人",
  "风险包含缓解措施、触发信号与负责人",
  "独立读者能复述问题、用户、范围、方向和成功标准",
];

const defaults = {
  mode: "full",
  currentStep: 0,
  productName: "",
  owner: "",
  approver: "",
  targetRelease: "",
  problem: "",
  audience: "",
  targetUsers: "",
  currentWorkaround: "",
  desiredOutcome: "",
  constraints: "",
  decisionNeeded: "",
  whyNow: "",
  currentJourney: "",
  goals: "",
  nonGoals: "",
  inScope: "",
  outOfScope: "",
  deferred: "",
  futureJourney: "",
  nfr: "",
  dependencies: "",
  rollout: "",
  executiveSummary: "",
  openDecisions: "",
  nextAction: "",
  evidence: [],
  requirements: [],
  metrics: [],
  risks: [],
  checks: Array(checklistItems.length).fill(false),
};

let state = loadState();
let saveTimer;
let toastTimer;

const elements = {
  stepNav: document.querySelector("#stepNav"),
  stepContent: document.querySelector("#stepContent"),
  phaseLabel: document.querySelector("#phaseLabel"),
  stepTitle: document.querySelector("#stepTitle"),
  stepCounter: document.querySelector("#stepCounter"),
  previousButton: document.querySelector("#previousButton"),
  nextButton: document.querySelector("#nextButton"),
  mode: document.querySelector("#mode"),
  saveStatus: document.querySelector("#saveStatus"),
  readinessScore: document.querySelector("#readinessScore"),
  readinessBar: document.querySelector("#readinessBar"),
  readinessHint: document.querySelector("#readinessHint"),
  coachTip: document.querySelector("#coachTip"),
  previewDialog: document.querySelector("#previewDialog"),
  markdownPreview: document.querySelector("#markdownPreview"),
  toast: document.querySelector("#toast"),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaults);
    return {
      ...structuredClone(defaults),
      ...saved,
      checks: checklistItems.map((_, index) => Boolean(saved.checks?.[index])),
    };
  } catch {
    return structuredClone(defaults);
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
  } = options;
  const labelMarkup = `${label}${required ? ' <span class="required">*</span>' : ""}`;
  const control =
    type === "textarea"
      ? `<textarea data-key="${key}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(state[key])}</textarea>`
      : `<input data-key="${key}" type="${type}" value="${escapeHtml(state[key])}" placeholder="${escapeHtml(placeholder)}" />`;
  return `
    <div class="field ${span ? "field-span" : ""}">
      <label for="${key}"><span>${labelMarkup}</span>${required ? "<small>必填</small>" : ""}</label>
      ${control}
      ${hint ? `<p class="field-hint">${hint}</p>` : ""}
    </div>
  `;
}

function intro(title, copy) {
  return `<div class="section-intro"><h2>${title}</h2><p>${copy}</p></div>`;
}

function renderStep() {
  const step = steps[state.currentStep];
  elements.phaseLabel.textContent = step.phase;
  elements.stepTitle.textContent = step.title;
  elements.coachTip.textContent = step.tip;
  elements.stepCounter.textContent = `步骤 ${state.currentStep + 1} / ${steps.length}`;
  elements.previousButton.disabled = state.currentStep === 0;
  elements.nextButton.textContent =
    state.currentStep === steps.length - 1 ? "导出文档 ↓" : "下一步 →";
  elements.stepContent.innerHTML = renderers[state.currentStep]();
  renderNavigation();
  bindStepEvents();
  updateDashboard();
}

function renderNavigation() {
  elements.stepNav.innerHTML = steps
    .map((step, index) => {
      const complete = completionForStep(index) >= 0.75;
      return `
        <button class="step-button ${index === state.currentStep ? "active" : ""} ${complete ? "complete" : ""}" data-step="${index}" type="button">
          <span class="step-number">${complete ? "✓" : index + 1}</span>
          <span class="step-copy"><strong>${step.short}</strong><small>${step.subtitle}</small></span>
          <span class="step-check">${complete ? "✓" : ""}</span>
        </button>
      `;
    })
    .join("");
}

const renderers = [
  () => `
    ${intro("建立文档契约", "先确定这份 PRD 要帮助谁做什么决策，并记录用户、结果与约束。带星号字段会计入当前阶段完成度。")}
    <div class="form-grid">
      ${field("productName", "产品或功能名称", { placeholder: "例如：PRD 可视化共创工作台", required: true })}
      ${field("owner", "文档负责人", { placeholder: "姓名或角色", required: true })}
      ${field("approver", "决策审批人", { placeholder: "谁对关键决策负责？" })}
      ${field("targetRelease", "目标发布", { placeholder: "日期、季度或里程碑" })}
      ${field("problem", "核心问题", { type: "textarea", placeholder: "谁因为什么原因难以完成什么任务，并造成了什么影响？", required: true, span: true })}
      ${field("audience", "PRD 读者与决策", { type: "textarea", placeholder: "主要读者是谁？他们需要批准、取舍或执行什么？", required: true })}
      ${field("targetUsers", "目标用户", { type: "textarea", placeholder: "用户细分、使用场景与关键需求", required: true })}
      ${field("currentWorkaround", "当前替代方案", { type: "textarea", placeholder: "用户现在怎么处理？痛点和失败模式是什么？" })}
      ${field("desiredOutcome", "期望结果", { type: "textarea", placeholder: "描述改变后的用户或业务状态，不要预设具体实现。", required: true })}
      ${field("constraints", "主要约束", { type: "textarea", placeholder: "时间、预算、技术、政策、隐私、无障碍或运营约束", span: true })}
    </div>
  `,
  () => `
    ${intro("证据地图", "把关键输入区分为事实、明确决策、待验证假设与 TBD。对事实和外部主张附上来源。")}
    <div class="callout"><strong>标注原则</strong><span>事实需要来源；决策需要责任人；假设需要验证计划；TBD 需要下一步或负责人。</span></div>
    <div class="collection" id="evidenceCollection">
      ${state.evidence.map(renderEvidenceRow).join("")}
      <button class="add-row" data-add="evidence" type="button">＋ 添加一条证据或判断</button>
    </div>
  `,
  () => `
    ${intro("产品框架", "把问题转化为紧凑、可评审的产品框架。方案细节尚未确定时，请保留为假设。")}
    <div class="form-grid">
      ${field("whyNow", "为什么是现在", { type: "textarea", placeholder: "触发因素、紧迫性或不行动的机会成本", required: true })}
      ${field("decisionNeeded", "需要做出的决策", { type: "textarea", placeholder: "读者应批准或解决什么？", required: true })}
      ${field("currentJourney", "当前用户旅程", { type: "textarea", placeholder: "步骤、痛点、替代方法与失败模式", span: true })}
      ${field("goals", "目标", { type: "textarea", placeholder: "列出 3–5 个结果导向目标，每行一项", required: true })}
      ${field("nonGoals", "非目标", { type: "textarea", placeholder: "本次明确不解决的内容", required: true })}
      ${field("inScope", "范围内", { type: "textarea", placeholder: "每行一个范围项", required: true })}
      ${field("outOfScope", "范围外", { type: "textarea", placeholder: "每行一个排除项", required: true })}
      ${field("deferred", "延期项", { type: "textarea", placeholder: "有价值但推迟处理的内容" })}
      ${field("futureJourney", "未来用户旅程", { type: "textarea", placeholder: "覆盖成功、空、加载、错误、权限、取消与恢复状态", span: true })}
    </div>
  `,
  () => `
    ${intro("需求共创", "使用稳定 ID 和 Must / Should / Could 优先级。需求描述行为，验收标准描述可观察的通过条件。")}
    <div class="collection" id="requirementsCollection">
      ${state.requirements.map(renderRequirementRow).join("")}
      <button class="add-row" data-add="requirements" type="button">＋ 添加功能需求</button>
    </div>
    <div class="form-grid" style="margin-top: 28px">
      ${field("nfr", "非功能需求", { type: "textarea", placeholder: "按“类别｜可量化阈值｜验证方式”逐行填写", span: true, hint: "考虑性能、可用性、安全、隐私、无障碍、规模、可观测性与支持性。" })}
    </div>
  `,
  () => `
    ${intro("度量、风险与发布", "先定义结果指标和护栏，再记录依赖、风险与回滚条件。不要把未经确认的数字写成事实。")}
    <h3>成功指标</h3>
    <div class="collection" id="metricsCollection">
      ${state.metrics.map(renderMetricRow).join("")}
      <button class="add-row" data-add="metrics" type="button">＋ 添加成功指标</button>
    </div>
    <h3 style="margin-top: 28px">风险</h3>
    <div class="collection" id="risksCollection">
      ${state.risks.map(renderRiskRow).join("")}
      <button class="add-row" data-add="risks" type="button">＋ 添加风险</button>
    </div>
    <div class="form-grid" style="margin-top: 28px">
      ${field("dependencies", "依赖与备选方案", { type: "textarea", placeholder: "依赖｜负责人｜状态｜备选方案" })}
      ${field("rollout", "发布与验证", { type: "textarea", placeholder: "阶段、资格、监控、回滚与退出标准" })}
    </div>
  `,
  () => {
    const validation = validateState();
    return `
      ${intro("质量检查", "先查看结构校验，再逐项进行判断式评审。保留的问题应有严重级别、负责人和下一步。")}
      <div class="validation-results">
        <div class="validation-stat good"><strong>${validation.passed}</strong><span>已通过</span></div>
        <div class="validation-stat warn"><strong>${validation.warnings.length}</strong><span>待补充</span></div>
        <div class="validation-stat neutral"><strong>${state.checks.filter(Boolean).length}/${checklistItems.length}</strong><span>人工检查</span></div>
      </div>
      ${
        validation.warnings.length
          ? `<div class="callout"><strong>结构提示</strong><span>${validation.warnings.map(escapeHtml).join("；")}</span></div>`
          : '<div class="callout"><strong>结构通过</strong><span>关键结构信号齐全，请继续完成人工判断和独立读者测试。</span></div>'
      }
      <div class="checklist">
        ${checklistItems
          .map(
            (item, index) => `
              <label class="check-item">
                <input type="checkbox" data-check="${index}" ${state.checks[index] ? "checked" : ""} />
                <span>${item}</span>
              </label>
            `,
          )
          .join("")}
      </div>
    `;
  },
  () => `
    ${intro("交付决策文档", "执行摘要应在正文完成后撰写，并能独立说明问题、方向、用户、范围、成功标准和待决事项。")}
    <div class="form-grid">
      ${field("executiveSummary", "执行摘要", { type: "textarea", placeholder: "用不超过 150 字总结问题、方向、范围边界、核心成功指标和未决事项。", required: true, span: true })}
      ${field("openDecisions", "开放决策", { type: "textarea", placeholder: "决策｜选项与权衡｜建议人｜审批人｜期限" })}
      ${field("nextAction", "建议下一步", { type: "textarea", placeholder: "明确负责人和具体动作", required: true })}
    </div>
    <div class="callout" style="margin-top: 24px"><strong>交付提醒</strong><span>请让负责人核验事实、链接、目标值、法律与合规声明，并取得相关利益方批准。</span></div>
    <div class="form-actions">
      <button class="button button-ghost" data-action="preview" type="button">预览完整文档</button>
      <button class="button button-primary" data-action="export" type="button">导出 Markdown</button>
    </div>
  `,
];

function renderEvidenceRow(item, index) {
  return `
    <div class="collection-row">
      <select data-array="evidence" data-index="${index}" data-field="type" aria-label="证据类型">
        ${["Fact", "Decision", "Assumption", "TBD"]
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
        ${["Must", "Should", "Could"].map((value) => `<option ${item.priority === value ? "selected" : ""}>${value}</option>`).join("")}
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
      state.checks[Number(control.dataset.check)] = control.checked;
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
}

function addItem(collection) {
  const factories = {
    evidence: () => ({ type: "Fact", claim: "", source: "" }),
    requirements: () => ({
      id: `FR-${String(state.requirements.length + 1).padStart(3, "0")}`,
      priority: "Must",
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
  elements.saveStatus.textContent = "正在保存…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 300);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  elements.saveStatus.textContent = "已自动保存到本机";
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function completionForStep(index) {
  const fieldGroups = [
    ["productName", "owner", "problem", "audience", "targetUsers", "desiredOutcome"],
    ["evidence"],
    ["whyNow", "decisionNeeded", "goals", "nonGoals", "inScope", "outOfScope"],
    ["requirements"],
    ["metrics", "risks", "rollout"],
    ["checks"],
    ["executiveSummary", "nextAction"],
  ];
  const fields = fieldGroups[index];
  const completed = fields.filter((key) => {
    if (key === "checks") return state.checks.filter(Boolean).length >= 7;
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
    score >= 85
      ? "文档接近可交付，请完成独立读者测试。"
      : score >= 50
        ? "框架已形成，继续补全可测试需求与指标。"
        : "完成关键字段后即可进入下一阶段。";

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
  const rules = [
    [hasText(state.problem), "缺少明确的问题陈述"],
    [hasText(state.targetUsers), "缺少目标用户"],
    [hasText(state.goals), "缺少结果导向目标"],
    [hasText(state.inScope) && hasText(state.outOfScope), "范围边界不完整"],
    [
      state.requirements.some(
        (item) => /^FR-\d{3}$/.test(item.id) && hasText(item.requirement),
      ),
      "缺少 FR-001 格式的功能需求",
    ],
    [
      state.requirements.some((item) => hasText(item.acceptance)),
      "缺少可观察的验收标准",
    ],
    [state.metrics.some((item) => hasText(item.name)), "缺少成功指标"],
    [state.risks.some((item) => hasText(item.risk)), "缺少风险记录"],
    [hasText(state.openDecisions) || hasText(state.nextAction), "待决事项缺少负责人或下一步"],
  ];
  return {
    passed: rules.filter(([passed]) => passed).length,
    warnings: rules.filter(([passed]) => !passed).map(([, message]) => message),
  };
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

function goToStep(index) {
  state.currentStep = Math.max(0, Math.min(steps.length - 1, index));
  saveState();
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

elements.stepNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-step]");
  if (button) goToStep(Number(button.dataset.step));
});

elements.previousButton.addEventListener("click", () => goToStep(state.currentStep - 1));
elements.nextButton.addEventListener("click", () => {
  if (state.currentStep === steps.length - 1) exportMarkdown();
  else goToStep(state.currentStep + 1);
});

elements.mode.value = state.mode;
elements.mode.addEventListener("change", () => {
  state.mode = elements.mode.value;
  saveState();
  showToast(`已切换为${elements.mode.options[elements.mode.selectedIndex].text}`);
});

document.querySelector("#previewButton").addEventListener("click", openPreview);
document.querySelector("#exportButton").addEventListener("click", exportMarkdown);
document
  .querySelector("#closePreviewButton")
  .addEventListener("click", () => elements.previewDialog.close());
elements.previewDialog.addEventListener("click", (event) => {
  if (event.target === elements.previewDialog) elements.previewDialog.close();
});

document.querySelector("#resetButton").addEventListener("click", () => {
  if (!window.confirm("确定清空所有已保存的 PRD 内容吗？此操作无法撤销。")) return;
  state = structuredClone(defaults);
  localStorage.removeItem(STORAGE_KEY);
  elements.mode.value = state.mode;
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
    if (state.currentStep < steps.length - 1) goToStep(state.currentStep + 1);
  }
});

renderStep();
