export const VOLUME_ORDER = ["卷一", "卷二", "卷三", "卷四", "卷五", "卷六", "卷七", "卷八", "卷九"] as const;

export const PROJECT_DOCS = new Set(["README.md", "INDEX.md", "PLAN.md", "WORKFLOWS.md", "outline.md", "story.md"]);

export function countWritingUnits(text: string): number {
  const cjk = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinWords = text.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
  return cjk + latinWords;
}

export function isReadableTextFile(name: string): boolean {
  return /\.(md|txt|json|yaml|yml)$/i.test(name);
}

export function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

export function stripRoot(path: string): string {
  const parts = normalizePath(path).split("/");
  if (
    parts.length > 1 &&
    !VOLUME_ORDER.includes(parts[0] as (typeof VOLUME_ORDER)[number]) &&
    parts[0] !== "canon" &&
    parts[0] !== "character" &&
    parts[0] !== "site" &&
    parts[0] !== "工程"
  ) {
    return parts.slice(1).join("/");
  }
  return normalizePath(path);
}

export function chapterKey(name: string): string {
  const match = name.match(/第([0-9一二三四五六七八九十百]+)[章回]/);
  return match ? match[1] : name;
}

export function numericChapter(key: string): number {
  if (/^\d+$/.test(key)) return Number(key);
  const values: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (key === "十") return 10;
  if (key.startsWith("十")) return 10 + (values[key[1]] ?? 0);
  if (key.includes("十")) {
    const [left, right] = key.split("十");
    return (values[left] ?? 1) * 10 + (values[right] ?? 0);
  }
  return values[key] ?? 999;
}

export function cleanChapterTitle(name: string): string {
  return name.replace(/\.(md|txt)$/i, "").replace(/^第[0-9一二三四五六七八九十百]+章_?/, "");
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatDate(value: number): string {
  return new Date(value).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function startOfDay(value: number): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function shortPath(path: string): string {
  const parts = path.split("/");
  return parts.length > 3 ? `${parts[0]}/.../${parts.at(-1)}` : path;
}

export function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
