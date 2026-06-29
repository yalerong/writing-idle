import { describe, expect, it } from "vitest";
import { analyzeProject } from "../src/domain/scanner";
import type { SourceFile } from "../src/types";

function file(path: string, text = "一二三 test"): SourceFile {
  return {
    path,
    name: path.split("/").pop() || path,
    size: text.length,
    modified: 1_700_000_000_000,
    text,
  };
}

describe("analyzeProject", () => {
  it("pairs manuscript and spec files by chapter key", () => {
    const project = analyzeProject("novel-lab", [
      file("novel-lab/卷一/规格卡/第01章_明堂裂图.md"),
      file("novel-lab/卷一/正文/第01章_明堂裂图.md", "沈砚入局"),
      file("novel-lab/character/沈砚.md"),
      file("novel-lab/site/明堂_场景设定卡.md"),
      file("novel-lab/canon/glossary.md"),
    ]);

    expect(project.stats.manuscriptFiles).toBe(1);
    expect(project.stats.specFiles).toBe(1);
    expect(project.stats.assetFiles).toBe(3);
    expect(project.chapters[0]).toMatchObject({
      volume: "卷一",
      title: "明堂裂图",
    });
    expect(project.chapters[0].spec?.name).toBe("第01章_明堂裂图.md");
    expect(project.chapters[0].manuscript?.name).toBe("第01章_明堂裂图.md");
  });

  it("keeps spec-only future chapters in the queue", () => {
    const project = analyzeProject("novel-lab", [
      file("卷二/规格卡/第七章_博州七日.md"),
      file("卷二/规格卡/第八章_十万压城.md"),
    ]);

    expect(project.stats.manuscriptFiles).toBe(0);
    expect(project.stats.specFiles).toBe(2);
    expect(project.chapters.map((chapter) => chapter.title)).toEqual(["博州七日", "十万压城"]);
  });
});
