import { analyzeProject } from "./domain/scanner";
import { buildContextPack, formatContextSource } from "./domain/contextPack";
import { countWritingUnits, escapeHtml, formatDate, formatNumber, shortPath, startOfDay } from "./domain/text";
import { createSnapshot, loadSnapshot, saveSnapshot } from "./domain/snapshot";
import { filesFromInput, pickProjectFiles, writeSourceFile } from "./platform/files";
import type { AssetGroup, ChapterSummary, ProjectModel, Snapshot, SourceFile } from "./types";

interface AppState {
  project: ProjectModel | null;
  previousSnapshot: Snapshot | null;
  activeView: "dashboard" | "chapters" | "assets" | "idle";
  activeAssetGroup: AssetGroup;
  search: string;
  selectedChapterId: string | null;
  currentContextPack: string;
}

const state: AppState = {
  project: null,
  previousSnapshot: null,
  activeView: "dashboard",
  activeAssetGroup: "character",
  search: "",
  selectedChapterId: null,
  currentContextPack: "",
};

const els = {
  repoLabel: qs("#repoLabel"),
  pickFolderButton: qs<HTMLButtonElement>("#pickFolderButton"),
  folderInput: qs<HTMLInputElement>("#folderInput"),
  emptyState: qs("#emptyState"),
  scanTime: qs("#scanTime"),
  snapshotStatus: qs("#snapshotStatus"),
  saveSnapshotButton: qs<HTMLButtonElement>("#saveSnapshotButton"),
  searchInput: qs<HTMLInputElement>("#searchInput"),
  viewTitle: qs("#viewTitle"),
  navItems: document.querySelectorAll<HTMLButtonElement>(".nav-item"),
  views: document.querySelectorAll<HTMLElement>(".view"),
  metrics: {
    manuscriptChars: qs("#metricManuscriptChars"),
    manuscriptFiles: qs("#metricManuscriptFiles"),
    specFiles: qs("#metricSpecFiles"),
    assetFiles: qs("#metricAssetFiles"),
    level: qs("#metricLevel"),
    levelHint: qs("#metricLevelHint"),
  },
  volumeSummary: qs("#volumeSummary"),
  volumeProgress: qs("#volumeProgress"),
  recentFiles: qs("#recentFiles"),
  volumeFilter: qs<HTMLSelectElement>("#volumeFilter"),
  volumeQuickOpen: qs("#volumeQuickOpen"),
  chapterCountLabel: qs("#chapterCountLabel"),
  chapterBoard: qs("#chapterBoard"),
  chapterDetail: qs("#chapterDetail"),
  chapterDetailContent: qs("#chapterDetailContent"),
  detailEmpty: qs(".detail-empty"),
  detailTitle: qs("#detailTitle"),
  detailMeta: qs("#detailMeta"),
  detailStatus: qs("#detailStatus"),
  detailSources: qs("#detailSources"),
  detailAssets: qs("#detailAssets"),
  manuscriptEditor: qs<HTMLTextAreaElement>("#manuscriptEditor"),
  editorStatus: qs("#editorStatus"),
  saveManuscriptButton: qs<HTMLButtonElement>("#saveManuscriptButton"),
  contextPackPreview: qs<HTMLTextAreaElement>("#contextPackPreview"),
  copyPackButton: qs<HTMLButtonElement>("#copyPackButton"),
  assetTabs: document.querySelectorAll<HTMLButtonElement>(".asset-tab"),
  assetList: qs("#assetList"),
  idleDelta: qs("#idleDelta"),
  deltaLabel: qs("#deltaLabel"),
  manuscriptProgress: qs<HTMLProgressElement>("#manuscriptProgress"),
  specProgress: qs<HTMLProgressElement>("#specProgress"),
  assetProgress: qs<HTMLProgressElement>("#assetProgress"),
  heatmap: qs("#heatmap"),
  nextQueue: qs("#nextQueue"),
};

document.addEventListener("click", (event) => {
  if ((event.target as HTMLElement).matches("[data-pick-folder]")) {
    void handlePickFolder();
  }
});

els.pickFolderButton.addEventListener("click", () => void handlePickFolder());
els.folderInput.addEventListener("change", async (event) => {
  const inputFiles = (event.target as HTMLInputElement).files;
  if (!inputFiles) return;
  const result = await filesFromInput(inputFiles);
  if (result) loadProject(result.rootName, result.files);
});

els.navItems.forEach((button) => {
  button.addEventListener("click", () => {
    setView(button.dataset.view as AppState["activeView"]);
  });
});

els.assetTabs.forEach((button) => {
  button.addEventListener("click", () => {
    state.activeAssetGroup = button.dataset.assetGroup as AssetGroup;
    renderAssets();
  });
});

els.searchInput.addEventListener("input", () => {
  state.search = els.searchInput.value.trim().toLowerCase();
  renderCurrentView();
});

els.volumeFilter.addEventListener("change", () => {
  renderVolumeQuickOpen();
  renderChapters();
  renderChapterDetail();
});
els.volumeQuickOpen.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-volume-name]");
  if (!button) return;
  els.volumeFilter.value = button.dataset.volumeName ?? "all";
  renderVolumeQuickOpen();
  renderChapters();
  renderChapterDetail();
});
els.chapterBoard.addEventListener("click", (event) => {
  const card = (event.target as HTMLElement).closest<HTMLElement>("[data-chapter-id]");
  if (!card) return;
  state.selectedChapterId = card.dataset.chapterId ?? null;
  renderChapters();
  renderChapterDetail();
});
els.copyPackButton.addEventListener("click", async () => {
  if (!state.currentContextPack) return;
  await navigator.clipboard.writeText(state.currentContextPack);
  els.copyPackButton.textContent = "已复制";
  window.setTimeout(() => {
    els.copyPackButton.textContent = "复制开写包";
  }, 1200);
});
els.manuscriptEditor.addEventListener("input", () => {
  const chapter = getSelectedChapter();
  const units = countWritingUnits(els.manuscriptEditor.value);
  const suffix = chapter?.manuscript?.handle ? "可保存" : "只读来源";
  els.editorStatus.textContent = `${formatNumber(units)} 字 · ${suffix}`;
});
els.saveManuscriptButton.addEventListener("click", () => void saveCurrentManuscript());
els.saveSnapshotButton.addEventListener("click", () => {
  if (!state.project) return;
  const snapshot = createSnapshot(state.project);
  saveSnapshot(snapshot);
  state.previousSnapshot = snapshot;
  renderAll();
});

async function handlePickFolder(): Promise<void> {
  const picked = await pickProjectFiles();
  if (picked) {
    loadProject(picked.rootName, picked.files);
    return;
  }
  els.folderInput.click();
}

function loadProject(rootName: string, files: SourceFile[]): void {
  state.project = analyzeProject(rootName, files);
  state.previousSnapshot = loadSnapshot(rootName);
  state.selectedChapterId = state.project.chapters[0] ? chapterId(state.project.chapters[0]) : null;
  sessionStorage.setItem("novel-idle:last-root", rootName);
  renderAll();
}

function renderAll(): void {
  const project = state.project;
  document.body.classList.toggle("has-project", Boolean(project));
  els.emptyState.style.display = project ? "none" : "grid";
  els.repoLabel.textContent = project?.rootName ?? "未加载工作仓";
  els.scanTime.textContent = project ? new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "-";
  els.saveSnapshotButton.disabled = !project;
  renderMetrics();
  renderDashboard();
  renderVolumeFilter();
  renderVolumeQuickOpen();
  renderChapters();
  renderChapterDetail();
  renderAssets();
  renderIdle();
  setView(state.activeView);
}

function renderMetrics(): void {
  const project = state.project;
  if (!project) return;
  els.metrics.manuscriptChars.textContent = formatNumber(project.stats.manuscriptChars);
  els.metrics.manuscriptFiles.textContent = `${project.stats.manuscriptFiles} 个正文文件`;
  els.metrics.specFiles.textContent = formatNumber(project.stats.specFiles);
  els.metrics.assetFiles.textContent = formatNumber(project.stats.assetFiles);
  els.metrics.level.textContent = `Lv. ${project.stats.level}`;
  els.metrics.levelHint.textContent = `${project.stats.completeChapters} 章正文/规格卡齐备`;
  els.snapshotStatus.textContent = state.previousSnapshot ? "可对比" : "未建立";
}

function renderDashboard(): void {
  const project = state.project;
  if (!project) return;
  const activeVolumes = project.volumes.filter((volume) => volume.manuscript.length || volume.specs.length);
  els.volumeSummary.textContent = `${activeVolumes.length} 卷有内容`;
  els.volumeProgress.innerHTML = "";
  const template = qs<HTMLTemplateElement>("#volumeRowTemplate");
  for (const volume of activeVolumes) {
    const row = template.content.firstElementChild?.cloneNode(true) as HTMLElement;
    row.querySelector("strong")!.textContent = volume.name;
    row.querySelector("span")!.textContent = `${volume.manuscript.length}/${volume.specs.length || 0} 正文/规格卡 · ${formatNumber(volume.chars)} 字`;
    (row.querySelector("i") as HTMLElement).style.width = `${volume.coverage}%`;
    els.volumeProgress.append(row);
  }

  const recent = [...project.files]
    .filter((file) => file.name.toLowerCase().endsWith(".md"))
    .sort((a, b) => b.modified - a.modified)
    .slice(0, 12);
  els.recentFiles.innerHTML = recent
    .map(
      (file) => `
        <a href="#" title="${escapeHtml(file.path)}">
          <strong>${escapeHtml(file.name)}</strong>
          <span>${escapeHtml(shortPath(file.path))} · ${formatDate(file.modified)}</span>
        </a>
      `,
    )
    .join("");
}

function renderVolumeFilter(): void {
  const project = state.project;
  if (!project) return;
  const current = els.volumeFilter.value;
  const activeVolumes = getActiveVolumes(project);
  const options = activeVolumes
    .map((volume) => `<option value="${volume.name}">${volume.name}</option>`)
    .join("");
  els.volumeFilter.innerHTML = `<option value="all">全部卷</option>${options}`;
  els.volumeFilter.value = current && (current === "all" || activeVolumes.some((volume) => volume.name === current)) ? current : "all";
}

function renderVolumeQuickOpen(): void {
  const project = state.project;
  if (!project) return;
  const selected = els.volumeFilter.value || "all";
  const buttons = [
    { label: "全部", value: "all" },
    ...getActiveVolumes(project).map((volume) => ({ label: volume.name, value: volume.name })),
  ];
  els.volumeQuickOpen.innerHTML = buttons
    .map(
      (button) => `
        <button class="${button.value === selected ? "active" : ""}" type="button" data-volume-name="${escapeHtml(button.value)}">
          ${escapeHtml(button.label)}
        </button>
      `,
    )
    .join("");
}

function renderChapters(): void {
  const project = state.project;
  if (!project) return;
  const selected = els.volumeFilter.value || "all";
  const chapters = filterBySearch(
    project.chapters.filter((chapter) => selected === "all" || chapter.volume === selected),
    (chapter) => `${chapter.volume} ${chapter.title}`,
  );
  els.chapterCountLabel.textContent = `${chapters.length} 章`;
  els.chapterBoard.innerHTML = chapters.map(renderChapterCard).join("");
  if (chapters.length && !chapters.some((chapter) => chapterId(chapter) === state.selectedChapterId)) {
    state.selectedChapterId = chapterId(chapters[0]);
  }
}

function renderChapterCard(chapter: ChapterSummary): string {
  const chars = chapter.manuscript ? countWritingUnits(chapter.manuscript.text) : 0;
  const selected = chapterId(chapter) === state.selectedChapterId;
  return `
    <button class="chapter-card ${selected ? "selected" : ""}" type="button" data-chapter-id="${escapeHtml(chapterId(chapter))}">
      <h3>${escapeHtml(chapter.volume)} · ${escapeHtml(chapter.title)}</h3>
      <small>${chapter.manuscript ? formatNumber(chars) : "0"} 字</small>
      <div class="status-row">
        <span class="pill ${chapter.spec ? "ok" : "warn"}">规格卡${chapter.spec ? "有" : "缺"}</span>
        <span class="pill ${chapter.manuscript ? "ok" : "warn"}">正文${chapter.manuscript ? "有" : "缺"}</span>
        <span class="pill ${chapter.manuscript && chapter.spec ? "ok" : "warn"}">${chapter.manuscript && chapter.spec ? "可进入闸门" : "待补齐"}</span>
      </div>
      <small>${escapeHtml(chapter.manuscript?.path || chapter.spec?.path || "")}</small>
    </button>
  `;
}

function renderChapterDetail(): void {
  const project = state.project;
  const chapter = getSelectedChapter();
  if (!project || !chapter) {
    showEmptyDetail();
    return;
  }

  const pack = buildContextPack(project, chapter);
  state.currentContextPack = pack.packText;
  els.detailEmpty.setAttribute("hidden", "");
  els.chapterDetailContent.removeAttribute("hidden");
  els.detailTitle.textContent = pack.title;
  els.detailMeta.textContent = `${pack.targetPath} · ${chapter.manuscript ? formatNumber(countWritingUnits(chapter.manuscript.text)) : "0"} 字`;
  els.detailStatus.innerHTML = `
    <span class="pill ${chapter.spec ? "ok" : "warn"}">规格卡${chapter.spec ? "已就绪" : "缺失"}</span>
    <span class="pill ${chapter.manuscript ? "ok" : "warn"}">正文${chapter.manuscript ? "已就绪" : "缺失"}</span>
    <span class="pill ${pack.previousChapter ? "ok" : "warn"}">上一章${pack.previousChapter ? "已注入" : "未找到"}</span>
    <span class="pill ${pack.relatedAssets.length ? "ok" : "warn"}">资料 ${pack.relatedAssets.length}</span>
  `;
  els.detailSources.innerHTML = pack.sources.map((source) => `<code>${escapeHtml(formatContextSource(source))}</code>`).join("");
  els.detailAssets.innerHTML = pack.relatedAssets.length
    ? pack.relatedAssets.map((asset) => `<span>${escapeHtml(shortPath(asset.path))}</span>`).join("")
    : `<span>未从章节文本中匹配到人物/场景/canon 名称。</span>`;
  renderManuscriptEditor(chapter);
  els.contextPackPreview.value = pack.packText;
}

function showEmptyDetail(): void {
  state.currentContextPack = "";
  els.detailEmpty.removeAttribute("hidden");
  els.chapterDetailContent.setAttribute("hidden", "");
  els.manuscriptEditor.value = "";
  els.manuscriptEditor.disabled = true;
  els.saveManuscriptButton.disabled = true;
  els.editorStatus.textContent = "未选择章节";
}

function renderManuscriptEditor(chapter: ChapterSummary): void {
  const text = chapter.manuscript?.text ?? "";
  els.manuscriptEditor.value = text;
  els.manuscriptEditor.disabled = !chapter.manuscript;
  els.saveManuscriptButton.disabled = !chapter.manuscript?.handle;
  if (!chapter.manuscript) {
    els.editorStatus.textContent = "缺少正文文件，暂不能保存";
    return;
  }
  const permission = chapter.manuscript.handle ? "可保存" : "只读来源";
  els.editorStatus.textContent = `${formatNumber(countWritingUnits(text))} 字 · ${permission}`;
}

async function saveCurrentManuscript(): Promise<void> {
  const project = state.project;
  const chapter = getSelectedChapter();
  if (!project || !chapter?.manuscript) return;
  els.saveManuscriptButton.disabled = true;
  els.editorStatus.textContent = "保存中...";
  try {
    const updated = await writeSourceFile(chapter.manuscript, els.manuscriptEditor.value);
    const updatedFiles = project.files.map((file) => (file.path === updated.path ? updated : file));
    state.project = analyzeProject(project.rootName, updatedFiles);
    state.previousSnapshot = loadSnapshot(project.rootName);
    state.selectedChapterId = chapterId(chapter);
    renderAll();
    els.editorStatus.textContent = `${formatNumber(countWritingUnits(updated.text))} 字 · 已保存`;
  } catch (error) {
    els.editorStatus.textContent = error instanceof Error ? error.message : "保存失败";
    els.saveManuscriptButton.disabled = !chapter.manuscript.handle;
  }
}

function renderAssets(): void {
  const project = state.project;
  if (!project) return;
  els.assetTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.assetGroup === state.activeAssetGroup);
  });
  const files = filterBySearch(project.assets[state.activeAssetGroup] || [], (file) => `${file.name} ${file.path}`);
  els.assetList.innerHTML = files
    .map(
      (file) => `
        <button type="button" title="${escapeHtml(file.path)}">
          <strong>${escapeHtml(file.name.replace(/\.md$/i, ""))}</strong>
          <small>${escapeHtml(shortPath(file.path))} · ${formatNumber(countWritingUnits(file.text))} 字</small>
        </button>
      `,
    )
    .join("");
}

function renderIdle(): void {
  const project = state.project;
  if (!project) return;
  const previous = state.previousSnapshot;
  const delta = previous ? project.stats.manuscriptChars - previous.manuscriptChars : 0;
  els.idleDelta.textContent = `${delta >= 0 ? "+" : ""}${formatNumber(delta)}`;
  els.deltaLabel.textContent = previous ? `对比 ${formatDate(previous.savedAt)}` : "先保存一次快照";
  els.manuscriptProgress.value = Math.min(100, Math.round((project.stats.manuscriptFiles / Math.max(project.stats.specFiles, 1)) * 100));
  els.specProgress.value = Math.min(100, Math.round((project.stats.specFiles / 208) * 100));
  els.assetProgress.value = Math.min(100, Math.round((project.stats.assetFiles / 140) * 100));
  renderHeatmap(project.files);
  renderNextQueue(project);
}

function renderHeatmap(files: SourceFile[]): void {
  const today = startOfDay(Date.now());
  const buckets = new Map<number, number>();
  for (const file of files) {
    const day = startOfDay(file.modified);
    buckets.set(day, (buckets.get(day) || 0) + 1);
  }
  const cells: string[] = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = today - offset * 86_400_000;
    const count = buckets.get(day) || 0;
    const level = count >= 12 ? 4 : count >= 7 ? 3 : count >= 3 ? 2 : count >= 1 ? 1 : 0;
    cells.push(`<div class="heat-cell" data-level="${level}" title="${formatDate(day)} · ${count} 个文件"></div>`);
  }
  els.heatmap.innerHTML = cells.join("");
}

function renderNextQueue(project: ProjectModel): void {
  const candidates = project.chapters.filter((chapter) => !chapter.manuscript || !chapter.spec).slice(0, 8);
  const volumeOneReview = project.volumes.find((volume) => volume.name === "卷一" && volume.manuscript.length && volume.specs.length);
  const queue: Array<{ title: string; note: string }> = [];
  if (volumeOneReview) {
    queue.push({ title: "卷一卷审", note: "正文与规格卡齐备，适合跑卷级 review" });
  }
  for (const chapter of candidates) {
    queue.push({
      title: `${chapter.volume} · ${chapter.title}`,
      note: `${chapter.spec ? "有规格卡" : "缺规格卡"} / ${chapter.manuscript ? "有正文" : "缺正文"}`,
    });
  }
  els.nextQueue.innerHTML = queue
    .map(
      (item) => `
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.note)}</span>
        </div>
      `,
    )
    .join("");
}

function setView(view: AppState["activeView"]): void {
  state.activeView = view;
  const titles: Record<AppState["activeView"], string> = { dashboard: "总览", chapters: "章节", assets: "资料库", idle: "Idle" };
  els.viewTitle.textContent = titles[view] || "总览";
  els.navItems.forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  els.views.forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === view));
}

function renderCurrentView(): void {
  if (state.activeView === "chapters") {
    renderChapters();
    renderChapterDetail();
  }
  if (state.activeView === "assets") renderAssets();
}

function filterBySearch<T>(items: T[], getText: (item: T) => string): T[] {
  if (!state.search) return items;
  return items.filter((item) => getText(item).toLowerCase().includes(state.search));
}

function getSelectedChapter(): ChapterSummary | null {
  const project = state.project;
  if (!project || !state.selectedChapterId) return null;
  return project.chapters.find((candidate) => chapterId(candidate) === state.selectedChapterId) ?? null;
}

function getActiveVolumes(project: ProjectModel): ProjectModel["volumes"] {
  return project.volumes.filter((volume) => volume.manuscript.length || volume.specs.length);
}

function qs<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function chapterId(chapter: ChapterSummary): string {
  return `${chapter.volume}::${chapter.key}`;
}

renderAll();
