import { supabase, supabaseEnabled } from "@/services/supabase";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type FeedPost = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  profile: Profile | null;
  post_likes: { user_id: string }[];
  post_comments: { id: string }[];
};

export type FeedComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: Pick<Profile, "id" | "username" | "full_name"> | null;
};

function requireSupabase() {
  if (!supabaseEnabled || !supabase) throw new Error("Supabase nao configurado no app.");
  return supabase;
}

function parseSupabaseError(error: unknown) {
  const raw =
    typeof error === "object" && error !== null
      ? (error as { message?: string; code?: string; details?: string; hint?: string })
      : null;
  const message = raw?.message ?? (error instanceof Error ? error.message : "");
  const code = raw?.code ?? "";
  const details = raw?.details ?? "";
  const hint = raw?.hint ?? "";
  if (!message) return "Erro inesperado ao comunicar com o servidor.";

  if (message.includes("relation") && message.includes("does not exist")) {
    return "As tabelas do feed nao existem no banco. Rode o SQL do feed no Supabase.";
  }
  if (message.toLowerCase().includes("row-level security")) {
    return "Permissao negada pelo RLS. Verifique as politicas no Supabase.";
  }
  if (message.toLowerCase().includes("jwt") || message.toLowerCase().includes("auth")) {
    return "Sessao invalida. Faca login novamente.";
  }

  return [message, code ? `code=${code}` : "", details, hint].filter(Boolean).join(" | ");
}

export async function fetchFeedPosts() {
  const client = requireSupabase();

  let { data: posts, error: postsError } = await client
    .from("posts")
    .select("id,user_id,content,image_url,created_at")
    .order("created_at", { ascending: false });

  const missingImageColumn =
    typeof postsError === "object" &&
    postsError !== null &&
    "message" in postsError &&
    String((postsError as { message?: string }).message || "").includes("image_url");

  if (missingImageColumn) {
    const fallback = await client
      .from("posts")
      .select("id,user_id,content,created_at")
      .order("created_at", { ascending: false });
    posts = (fallback.data ?? []).map((row) => ({ ...row, image_url: null }));
    postsError = fallback.error;
  }

  if (postsError) throw new Error(parseSupabaseError(postsError));

  const postRows = posts ?? [];
  if (!postRows.length) return [] as FeedPost[];

  const userIds = Array.from(new Set(postRows.map((p) => p.user_id)));
  const postIds = postRows.map((p) => p.id);

  const [{ data: profiles, error: profilesError }, { data: likes, error: likesError }, { data: comments, error: commentsError }] =
    await Promise.all([
      client.from("profiles").select("id,username,full_name,avatar_url").in("id", userIds),
      client.from("post_likes").select("post_id,user_id").in("post_id", postIds),
      client.from("post_comments").select("id,post_id").in("post_id", postIds),
    ]);

  if (profilesError) throw new Error(parseSupabaseError(profilesError));
  if (likesError) throw new Error(parseSupabaseError(likesError));
  if (commentsError) throw new Error(parseSupabaseError(commentsError));

  const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.id, profile as Profile]));
  const likesByPostId = new Map<string, { user_id: string }[]>();
  for (const like of likes ?? []) {
    const current = likesByPostId.get(like.post_id) ?? [];
    current.push({ user_id: like.user_id });
    likesByPostId.set(like.post_id, current);
  }

  const commentsByPostId = new Map<string, { id: string }[]>();
  for (const comment of comments ?? []) {
    const current = commentsByPostId.get(comment.post_id) ?? [];
    current.push({ id: comment.id });
    commentsByPostId.set(comment.post_id, current);
  }

  return postRows.map((post) => ({
    ...post,
    profile: profileByUserId.get(post.user_id) ?? null,
    post_likes: likesByPostId.get(post.id) ?? [],
    post_comments: commentsByPostId.get(post.id) ?? [],
  })) as FeedPost[];
}

export async function createPost(payload: { userId: string; content?: string; imageUrl?: string }) {
  const client = requireSupabase();
  const text = payload.content?.trim() ?? "";
  const image = payload.imageUrl?.trim() ?? "";
  if (!text && !image) throw new Error("Escreva algo ou selecione uma imagem.");

  const authUser = await client.auth.getUser();
  if (authUser.error || authUser.data.user?.id !== payload.userId) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  let { data, error } = await client
    .from("posts")
    .insert({
      user_id: payload.userId,
      content: text || null,
      image_url: image || null,
    })
    .select("id,user_id,content,image_url,created_at")
    .single();

  const missingImageColumn =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    String((error as { message?: string }).message || "").includes("image_url");
  if (missingImageColumn) {
    const fallback = await client
      .from("posts")
      .insert({
        user_id: payload.userId,
        content: text || null,
      })
      .select("id,user_id,content,created_at")
      .single();
    data = fallback.data ? { ...fallback.data, image_url: null } : null;
    error = fallback.error;
  }

  if (error) throw new Error(parseSupabaseError(error));
  return data as Pick<FeedPost, "id" | "user_id" | "content" | "image_url" | "created_at">;
}

export async function fetchPostById(postId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("posts")
    .select("id,user_id,content,image_url,created_at")
    .eq("id", postId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(parseSupabaseError(error));
  return data as Pick<FeedPost, "id" | "user_id" | "content" | "image_url" | "created_at"> | null;
}

export async function createPostComment(postId: string, userId: string, content: string) {
  const client = requireSupabase();
  const text = content.trim();
  if (!text) throw new Error("Comentario vazio.");

  const { data, error } = await client
    .from("post_comments")
    .insert({ post_id: postId, user_id: userId, content: text })
    .select("id,post_id,user_id,content,created_at")
    .single();
  if (error) throw new Error(parseSupabaseError(error));
  return data as Pick<FeedComment, "id" | "post_id" | "user_id" | "content" | "created_at">;
}

export async function deletePostComment(commentId: string, userId: string) {
  const client = requireSupabase();
  const { error } = await client.from("post_comments").delete().eq("id", commentId).eq("user_id", userId);
  if (error) throw new Error(parseSupabaseError(error));
}

export async function deletePost(postId: string, userId: string) {
  const client = requireSupabase();
  const { error } = await client.from("posts").delete().eq("id", postId).eq("user_id", userId);
  if (error) throw new Error(parseSupabaseError(error));
}

export async function togglePostLike(postId: string, userId: string, liked: boolean) {
  const client = requireSupabase();
  if (liked) {
    const { error } = await client.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw new Error(parseSupabaseError(error));
    return;
  }
  const { error } = await client.from("post_likes").insert({ post_id: postId, user_id: userId });
  if (error) throw new Error(parseSupabaseError(error));
}

export async function fetchPostComments(postId: string) {
  const client = requireSupabase();
  const { data: comments, error: commentsError } = await client
    .from("post_comments")
    .select("id,post_id,user_id,content,created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (commentsError) throw new Error(parseSupabaseError(commentsError));

  const commentRows = comments ?? [];
  if (!commentRows.length) return [] as FeedComment[];

  const userIds = Array.from(new Set(commentRows.map((c) => c.user_id)));
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id,username,full_name")
    .in("id", userIds);
  if (profilesError) throw new Error(parseSupabaseError(profilesError));

  const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return commentRows.map((comment) => ({
    ...comment,
    profile: profileByUserId.get(comment.user_id) ?? null,
  })) as FeedComment[];
}
