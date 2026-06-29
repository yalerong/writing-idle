import type { ProjectModel, Snapshot } from "../types";

export function snapshotKey(rootName: string): string {
  return `novel-idle:snapshot:${rootName}`;
}

export function createSnapshot(project: ProjectModel): Snapshot {
  return {
    rootName: project.rootName,
    savedAt: Date.now(),
    manuscriptChars: project.stats.manuscriptChars,
    manuscriptFiles: project.stats.manuscriptFiles,
    specFiles: project.stats.specFiles,
    assetFiles: project.stats.assetFiles,
  };
}

export function loadSnapshot(rootName: string, storage: Storage = localStorage): Snapshot | null {
  const raw = storage.getItem(snapshotKey(rootName));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

export function saveSnapshot(snapshot: Snapshot, storage: Storage = localStorage): void {
  storage.setItem(snapshotKey(snapshot.rootName), JSON.stringify(snapshot));
}
