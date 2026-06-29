import { describe, expect, it } from "vitest";
import { buildContextPack, findPreviousChapter, findRelatedAssets } from "../src/domain/contextPack";
import { analyzeProject } from "../src/domain/scanner";
import type { SourceFile } from "../src/types";

function file(path: string, text: string): SourceFile {
  return {
    path,
    name: path.split("/").pop() || path,
    size: text.length,
    modified: 1_700_000_000_000,
    text,
  };
}

describe("context pack", () => {
  it("injects previous chapter ending and related assets", () => {
    const project = analyzeProject("novel-lab", [
      file("卷一/规格卡/第01章_明堂裂图.md", "明堂 初入局"),
      file("卷一/正文/第01章_明堂裂图.md", "第一章结尾：沈砚看见明堂灯火。"),
      file("卷一/规格卡/第02章_亡命.md", "沈砚 逃亡 明堂"),
      file("卷一/正文/第02章_亡命.md", "沈砚在明堂外亡命。"),
      file("character/沈砚.md", "主角"),
      file("site/明堂_场景设定卡.md", "场景"),
      file("canon/glossary.md", "术语"),
    ]);
    const chapter = project.chapters.find((candidate) => candidate.title === "亡命");
    expect(chapter).toBeDefined();

    const previous = findPreviousChapter(project, chapter!);
    const related = findRelatedAssets(project, chapter!);
    const pack = buildContextPack(project, chapter!);

    expect(previous?.path).toBe("卷一/正文/第01章_明堂裂图.md");
    expect(related.map((asset) => asset.path)).toContain("character/沈砚.md");
    expect(related.map((asset) => asset.path)).toContain("site/明堂_场景设定卡.md");
    expect(pack.packText).toContain("上一章结尾");
    expect(pack.packText).toContain("第一章结尾");
    expect(pack.packText).toContain("写回状态：预览");
  });

  it("reports missing spec or manuscript in the dry run text", () => {
    const project = analyzeProject("novel-lab", [
      file("卷二/规格卡/第七章_博州七日.md", "规格卡"),
    ]);
    const pack = buildContextPack(project, project.chapters[0]);

    expect(pack.packText).toContain("未找到正文");
    expect(pack.targetPath).toBe("卷二/正文/_开写包_七.md");
  });
});
