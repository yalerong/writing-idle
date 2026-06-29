import type { ChapterSummary, ProjectModel, SourceFile } from "../types";
import { countWritingUnits, shortPath } from "./text";

export interface ContextPack {
  title: string;
  targetPath: string;
  packText: string;
  sources: string[];
  relatedAssets: SourceFile[];
  previousChapter: SourceFile | null;
}

const ASSET_SCAN_LIMIT = 12;
const PREVIOUS_ENDING_LIMIT = 1200;
const EXISTING_DRAFT_LIMIT = 1600;

export function buildContextPack(project: ProjectModel, chapter: ChapterSummary): ContextPack {
  const previousChapter = findPreviousChapter(project, chapter);
  const relatedAssets = findRelatedAssets(project, chapter);
  const targetPath = chapter.manuscript?.path ?? `${chapter.volume}/正文/_开写包_${chapter.key}.md`;
  const sources = [
    chapter.spec?.path,
    chapter.manuscript?.path,
    previousChapter?.path,
    "outline.md",
    "story.md",
    ...relatedAssets.map((asset) => asset.path),
  ].filter(Boolean) as string[];

  const packText = [
    `# 开写包 Dry-run · ${chapter.volume} · ${chapter.title}`,
    "",
    "## 目标",
    `- 章节：${chapter.volume} · ${chapter.title}`,
    `- 建议输出：${targetPath}`,
    "- 写回状态：预览，不会修改 novel-lab",
    "",
    "## 规格卡",
    chapter.spec ? fence(chapter.spec.text.trim()) : "_缺规格卡：不能进入正式写章。_",
    "",
    "## 上一章结尾",
    previousChapter ? fence(tail(previousChapter.text, PREVIOUS_ENDING_LIMIT)) : "_未找到上一章正文。_",
    "",
    "## 当前正文摘录",
    chapter.manuscript ? fence(head(chapter.manuscript.text, EXISTING_DRAFT_LIMIT)) : "_未找到正文，适合生成新章初稿。_",
    "",
    "## 相关资料索引",
    ...relatedAssets.map((asset) => `- ${asset.path} (${countWritingUnits(asset.text)} 字)`),
    "",
    "## 工作纪律",
    "- 正文只落在 `<卷>/正文/*.md`。",
    "- 伏笔表与人物状态需要回写 `story.md`。",
    "- 单章 POV 不越界；双 POV 必须分段钉死。",
  ].join("\n");

  return {
    title: `${chapter.volume} · ${chapter.title}`,
    targetPath,
    packText,
    sources,
    relatedAssets,
    previousChapter,
  };
}

export function findPreviousChapter(project: ProjectModel, chapter: ChapterSummary): SourceFile | null {
  const volumeChapters = project.chapters.filter((candidate) => candidate.volume === chapter.volume);
  const index = volumeChapters.findIndex((candidate) => candidate.key === chapter.key);
  if (index <= 0) return null;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const previous = volumeChapters[cursor];
    if (previous.manuscript) return previous.manuscript;
  }
  return null;
}

export function findRelatedAssets(project: ProjectModel, chapter: ChapterSummary): SourceFile[] {
  const haystack = `${chapter.title}\n${chapter.spec?.text ?? ""}\n${chapter.manuscript?.text ?? ""}`;
  const assets = [...project.assets.character, ...project.assets.site, ...project.assets.canon];
  return assets
    .map((asset) => ({ asset, score: relevanceScore(asset, haystack) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.asset.path.localeCompare(b.asset.path, "zh-Hans-CN"))
    .slice(0, ASSET_SCAN_LIMIT)
    .map((item) => item.asset);
}

function relevanceScore(asset: SourceFile, haystack: string): number {
  const baseName = asset.name.replace(/\.md$/i, "");
  const shortName = baseName.split("_")[0];
  let score = 0;
  if (baseName && haystack.includes(baseName)) score += 4;
  if (shortName && shortName !== baseName && haystack.includes(shortName)) score += 2;
  if (asset.path.includes("canon/") && haystack.includes(shortName)) score += 1;
  return score;
}

function head(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}\n...` : text;
}

function tail(text: string, limit: number): string {
  return text.length > limit ? `...\n${text.slice(-limit)}` : text;
}

function fence(text: string): string {
  return ["```markdown", text, "```"].join("\n");
}

export function formatContextSource(path: string): string {
  return shortPath(path);
}
