import type { AssetGroup, ChapterSummary, ProjectModel, SourceFile } from "../types";
import { chapterKey, cleanChapterTitle, countWritingUnits, numericChapter, PROJECT_DOCS, stripRoot, VOLUME_ORDER } from "./text";

export function analyzeProject(rootName: string, inputFiles: SourceFile[]): ProjectModel {
  const files = inputFiles
    .map((file) => ({ ...file, path: stripRoot(file.path) }))
    .sort((a, b) => a.path.localeCompare(b.path, "zh-Hans-CN"));
  const markdownFiles = files.filter((file) => file.name.toLowerCase().endsWith(".md"));

  const volumes = VOLUME_ORDER.map((name) => {
    const volumeFiles = markdownFiles.filter((file) => file.path.startsWith(`${name}/`));
    const manuscript = volumeFiles.filter((file) => file.path.includes("/正文/") && !file.name.startsWith("_"));
    const specs = volumeFiles.filter((file) => file.path.includes("/规格卡/"));
    const archive = volumeFiles.filter((file) => file.path.includes("/_archive/"));
    return {
      name,
      manuscript,
      specs,
      archive,
      chars: manuscript.reduce((sum, file) => sum + countWritingUnits(file.text), 0),
      coverage: specs.length ? Math.min(100, Math.round((manuscript.length / specs.length) * 100)) : 0,
    };
  });

  const chapters: ChapterSummary[] = [];
  for (const volume of volumes) {
    const byKey = new Map<string, ChapterSummary>();
    for (const spec of volume.specs) {
      const key = chapterKey(spec.name);
      byKey.set(key, { key, volume: volume.name, title: cleanChapterTitle(spec.name), spec, manuscript: null });
    }
    for (const manuscript of volume.manuscript) {
      const key = chapterKey(manuscript.name);
      const existing = byKey.get(key) ?? { key, volume: volume.name, title: cleanChapterTitle(manuscript.name), spec: null, manuscript: null };
      existing.manuscript = manuscript;
      existing.title = cleanChapterTitle(manuscript.name);
      byKey.set(key, existing);
    }
    chapters.push(...[...byKey.values()].sort((a, b) => numericChapter(a.key) - numericChapter(b.key)));
  }

  const assets: Record<AssetGroup, SourceFile[]> = {
    character: markdownFiles.filter((file) => file.path.startsWith("character/")),
    site: markdownFiles.filter((file) => file.path.startsWith("site/")),
    canon: markdownFiles.filter((file) => file.path.startsWith("canon/")),
    project: markdownFiles.filter((file) => PROJECT_DOCS.has(file.path) || file.path.startsWith("工程/")),
  };

  const manuscriptFiles = volumes.flatMap((volume) => volume.manuscript);
  const specFiles = volumes.flatMap((volume) => volume.specs);
  const assetFiles = [...assets.character, ...assets.site, ...assets.canon];
  const manuscriptChars = manuscriptFiles.reduce((sum, file) => sum + countWritingUnits(file.text), 0);
  const totalChars = markdownFiles.reduce((sum, file) => sum + countWritingUnits(file.text), 0);
  const completeChapters = chapters.filter((chapter) => chapter.manuscript && chapter.spec).length;

  return {
    rootName,
    files,
    volumes,
    chapters,
    assets,
    stats: {
      markdownFiles: markdownFiles.length,
      manuscriptFiles: manuscriptFiles.length,
      specFiles: specFiles.length,
      assetFiles: assetFiles.length,
      manuscriptChars,
      totalChars,
      completeChapters,
      level: Math.max(1, Math.floor(Math.sqrt(Math.max(manuscriptChars, 1) / 1000))),
    },
  };
}
