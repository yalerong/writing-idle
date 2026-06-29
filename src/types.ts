export type AssetGroup = "character" | "site" | "canon" | "project";

export interface SourceFile {
  path: string;
  name: string;
  size: number;
  modified: number;
  text: string;
}

export interface VolumeSummary {
  name: string;
  manuscript: SourceFile[];
  specs: SourceFile[];
  archive: SourceFile[];
  chars: number;
  coverage: number;
}

export interface ChapterSummary {
  key: string;
  volume: string;
  title: string;
  spec: SourceFile | null;
  manuscript: SourceFile | null;
}

export interface ProjectStats {
  markdownFiles: number;
  manuscriptFiles: number;
  specFiles: number;
  assetFiles: number;
  manuscriptChars: number;
  totalChars: number;
  completeChapters: number;
  level: number;
}

export interface ProjectModel {
  rootName: string;
  files: SourceFile[];
  volumes: VolumeSummary[];
  chapters: ChapterSummary[];
  assets: Record<AssetGroup, SourceFile[]>;
  stats: ProjectStats;
}

export interface Snapshot {
  rootName: string;
  savedAt: number;
  manuscriptChars: number;
  manuscriptFiles: number;
  specFiles: number;
  assetFiles: number;
}
