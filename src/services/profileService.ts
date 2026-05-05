import type { User } from "@supabase/supabase-js";
import { supabase, supabaseEnabled } from "@/services/supabase";
import type { AlbumTotals } from "@/services/albumProgressService";

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export type UserProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  followers_count?: number | null;
  following_count?: number | null;
  album_total_stickers?: number | null;
  album_total_collected?: number | null;
  album_total_repeated?: number | null;
  album_progress_percent?: number | null;
};

function requireSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error("Supabase nao configurado no app.");
  }
  return supabase;
}

function isMissingProfilesTableError(error: unknown) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "";
  return message.includes("relation") && message.includes("profiles") && message.includes("does not exist");
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string) {
  const normalized = normalizeUsername(value);
  if (!normalized) return "Informe um username.";
  if (!USERNAME_REGEX.test(normalized)) {
    return "Use 3-20 caracteres: letras, numeros e underscore (_), sem espacos.";
  }
  return null;
}

export async function fetchProfileByUserId(userId: string): Promise<UserProfile | null> {
  const client = requireSupabase();
  const preferredSelect =
    "id,username,full_name,avatar_url,cover_url,followers_count,following_count,album_total_stickers,album_total_collected,album_total_repeated,album_progress_percent";
  let query = await client.from("profiles").select(preferredSelect).eq("id", userId).maybeSingle();

  if (
    query.error &&
    typeof query.error === "object" &&
    "message" in query.error &&
    String((query.error as { message?: string }).message ?? "").includes("column")
  ) {
    query = await client.from("profiles").select("id,username,full_name,avatar_url").eq("id", userId).maybeSingle();
  }

  const { data, error } = query;

  if (error) {
    if (isMissingProfilesTableError(error)) return null;
    throw new Error((error as { message?: string }).message ?? "Nao foi possivel carregar seu perfil.");
  }
  return (data as UserProfile | null) ?? null;
}

export async function updateCurrentUserProfileMedia(userId: string, payload: { avatarUrl?: string; coverUrl?: string }) {
  const client = requireSupabase();

  const updatePayload: Record<string, string | null> = {};
  if (payload.avatarUrl !== undefined) updatePayload.avatar_url = payload.avatarUrl || null;
  if (payload.coverUrl !== undefined) updatePayload.cover_url = payload.coverUrl || null;
  if (!Object.keys(updatePayload).length) return;

  let { error } = await client.from("profiles").update(updatePayload).eq("id", userId);
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    String((error as { message?: string }).message ?? "").includes("cover_url")
  ) {
    delete updatePayload.cover_url;
    if (!Object.keys(updatePayload).length) return;
    const fallback = await client.from("profiles").update(updatePayload).eq("id", userId);
    error = fallback.error;
  }

  if (error) throw new Error((error as { message?: string }).message ?? "Nao foi possivel atualizar as imagens do perfil.");
}

export async function fetchPostCountByUserId(userId: string) {
  const client = requireSupabase();
  const { count, error } = await client.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) return 0;
  return count ?? 0;
}

export async function upsertAlbumProgressSnapshot(userId: string, totals: AlbumTotals) {
  const client = requireSupabase();
  const payload = {
    id: userId,
    album_total_stickers: totals.totalStickers,
    album_total_collected: totals.totalCollected,
    album_total_repeated: totals.totalRepeated,
    album_progress_percent: totals.progress,
  };

  const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    String((error as { message?: string }).message ?? "").includes("album_total_stickers")
  ) {
    return;
  }
  if (error) throw new Error((error as { message?: string }).message ?? "Nao foi possivel salvar progresso publico.");
}

export async function ensureProfileRow(authUser: User, fallbackName?: string) {
  const client = requireSupabase();
  const fullName =
    typeof authUser.user_metadata?.full_name === "string"
      ? authUser.user_metadata.full_name.trim()
      : typeof authUser.user_metadata?.name === "string"
        ? authUser.user_metadata.name.trim()
        : fallbackName?.trim();

  const { error } = await client.from("profiles").upsert(
    {
      id: authUser.id,
      full_name: fullName || null,
    },
    { onConflict: "id" },
  );

  if (error) {
    if (isMissingProfilesTableError(error)) return;
    throw new Error((error as { message?: string }).message ?? "Nao foi possivel preparar seu perfil.");
  }
}

export async function isUsernameAvailable(rawUsername: string, currentUserId?: string) {
  const client = requireSupabase();
  const username = normalizeUsername(rawUsername);

  const { data, error } = await client
    .from("profiles")
    .select("id,username")
    .eq("username", username)
    .limit(1);

  if (error) {
    if (isMissingProfilesTableError(error)) return true;
    throw new Error((error as { message?: string }).message ?? "Nao foi possivel validar o username.");
  }

  if (!data?.length) return true;
  if (currentUserId && data[0].id === currentUserId) return true;
  return false;
}

export async function saveUsernameForCurrentUser(user: { id: string; name: string }, rawUsername: string) {
  const client = requireSupabase();
  const username = normalizeUsername(rawUsername);
  const validationError = validateUsername(username);
  if (validationError) throw new Error(validationError);

  const available = await isUsernameAvailable(username, user.id);
  if (!available) throw new Error("Esse username ja esta em uso.");

  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      username,
      full_name: user.name || null,
    },
    { onConflict: "id" },
  );

  if (error) throw new Error((error as { message?: string }).message ?? "Nao foi possivel salvar seu username.");

  return username;
}
