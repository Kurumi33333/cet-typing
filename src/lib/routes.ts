import type { CetLevel } from "../features/course/types";

/**
 * The app's address map. Every screen has a real URL so a refresh, a bookmark
 * and a shared link all land where the visitor left off.
 */
export const ROUTES = {
  landing: "/",
  app: "/app",
  course: (level: CetLevel) => `/app/${level === "CET4" ? "cet4" : "cet6"}`,
  review: (level: CetLevel) => `/app/${level === "CET4" ? "cet4" : "cet6"}/review`,
  lexicon: (level: CetLevel) => `/lexicon/${level === "CET4" ? "cet4" : "cet6"}`,
} as const;

const LEVEL_FROM_SEGMENT: Record<string, CetLevel> = { cet4: "CET4", cet6: "CET6" };

/** `/app/cet4` → CET4. Unknown segments are null, never a silent default. */
export function levelFromSegment(segment: string | undefined): CetLevel | null {
  if (!segment) return null;
  return LEVEL_FROM_SEGMENT[segment.toLowerCase()] ?? null;
}

/** A navigation key for screens that must remount when the address changes. */
export function routeKey(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function segmentFromLevel(level: CetLevel): "cet4" | "cet6" {
  return level === "CET4" ? "cet4" : "cet6";
}

/** The title each route sets on the document, so history entries are readable. */
export function documentTitle(pathname: string, search = ""): string {
  if (pathname.startsWith("/lexicon")) return "参考词库 · CET Typing";
  if (pathname.includes("/review")) return "错题复习 · CET Typing";
  if (pathname.startsWith("/app")) {
    const level = pathname.split("/")[2];
    const name = level === "cet4" ? "四级" : level === "cet6" ? "六级" : "";
    return search.includes("fresh=1")
      ? `${name} · 从头开始 · CET Typing`
      : `${name ? name + " · " : ""}练习台 · CET Typing`;
  }
  return "CET Typing · 看中文，写英文";
}
