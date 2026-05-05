export const ALBUM_PROGRESS_POST_PREFIX = "FIGGO_ALBUM_PROGRESS::";

export type AlbumProgressPostPayload = {
  kind: "album_progress";
  caption?: string;
  progress: number;
  totalCollected: number;
  totalStickers: number;
  totalRepeated: number;
  missing: number;
};

export function serializeAlbumProgressPost(payload: AlbumProgressPostPayload) {
  return `${ALBUM_PROGRESS_POST_PREFIX}${JSON.stringify(payload)}`;
}

export function parseAlbumProgressPost(content: string | null) {
  if (!content?.startsWith(ALBUM_PROGRESS_POST_PREFIX)) return null;

  try {
    const payload = JSON.parse(content.slice(ALBUM_PROGRESS_POST_PREFIX.length)) as Partial<AlbumProgressPostPayload>;
    if (payload.kind !== "album_progress") return null;
    if (
      typeof payload.progress !== "number" ||
      typeof payload.totalCollected !== "number" ||
      typeof payload.totalStickers !== "number" ||
      typeof payload.totalRepeated !== "number" ||
      typeof payload.missing !== "number"
    ) {
      return null;
    }

    return {
      kind: "album_progress",
      caption: typeof payload.caption === "string" ? payload.caption : "",
      progress: payload.progress,
      totalCollected: payload.totalCollected,
      totalStickers: payload.totalStickers,
      totalRepeated: payload.totalRepeated,
      missing: payload.missing,
    } satisfies AlbumProgressPostPayload;
  } catch {
    return null;
  }
}
