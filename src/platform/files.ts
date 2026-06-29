import type { SourceFile } from "../types";
import { isReadableTextFile, normalizePath, stripRoot } from "../domain/text";

export async function pickProjectFiles(): Promise<{ rootName: string; files: SourceFile[] } | null> {
  const directoryPicker = window.showDirectoryPicker;
  if (directoryPicker) {
    try {
      const handle = await directoryPicker.call(window, { mode: "readwrite" });
      const files: SourceFile[] = [];
      await walkDirectoryHandle(handle, "", files);
      return { rootName: handle.name, files };
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        console.warn(error);
      }
    }
  }
  return null;
}

export async function filesFromInput(fileList: FileList): Promise<{ rootName: string; files: SourceFile[] } | null> {
  const files = [...fileList];
  if (files.length === 0) return null;
  const rootName = files[0]?.webkitRelativePath.split("/")[0] || "novel-lab";
  return {
    rootName,
    files: await Promise.all(files.filter((file) => isReadableTextFile(file.name)).map((file) => fileToRecord(file))),
  };
}

export async function writeSourceFile(source: SourceFile, text: string): Promise<SourceFile> {
  if (!source.handle) {
    throw new Error("当前文件没有浏览器写入权限，请使用“选择 novel-lab 文件夹”重新授权。");
  }
  const writable = await source.handle.createWritable();
  await writable.write(text);
  await writable.close();
  const file = await source.handle.getFile();
  return fileToRecord(file, source.path, source.handle);
}

async function walkDirectoryHandle(handle: FileSystemDirectoryHandle, prefix: string, output: SourceFile[]): Promise<void> {
  for await (const [name, entry] of handle.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (entry.kind === "directory") {
      if (name === ".git" || name === "node_modules") continue;
      await walkDirectoryHandle(entry, path, output);
    } else if (isReadableTextFile(name)) {
      const file = await entry.getFile();
      output.push(await fileToRecord(file, path, entry));
    }
  }
}

async function fileToRecord(file: File, explicitPath?: string, handle?: FileSystemFileHandle): Promise<SourceFile> {
  const path = normalizePath(explicitPath || file.webkitRelativePath || file.name);
  return {
    path: stripRoot(path),
    name: path.split("/").pop() || file.name,
    size: file.size,
    modified: file.lastModified || Date.now(),
    text: await file.text(),
    handle,
  };
}
