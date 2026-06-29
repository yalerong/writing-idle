interface FileSystemDirectoryHandle {
  readonly kind: "directory";
  readonly name: string;
  entries(): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
}

interface FileSystemFileHandle {
  readonly kind: "file";
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | Blob | BufferSource): Promise<void>;
  close(): Promise<void>;
}

interface Window {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
}
