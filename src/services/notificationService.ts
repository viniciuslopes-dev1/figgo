import { supabase, supabaseEnabled } from "@/services/supabase";

export type NotificationType = "like" | "comment" | "trade_point" | "trade_point_post" | "reply" | "system";
export type NotificationReferenceType = "post" | "comment" | "trade_point" | "system";

type NotificationRow = {
  id: string;
  user_id: string;
  from_user_id: string | null;
  type: NotificationType;
  reference_id: string | null;
  reference_type: NotificationReferenceType | null;
  content: string;
  is_read: boolean;
  created_at: string;
};

type NotificationProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type AppNotification = NotificationRow & {
  from_profile: NotificationProfile | null;
};

export type CreateNotificationInput = {
  userId: string;
  fromUserId?: string | null;
  type: NotificationType;
  referenceId?: string | null;
  referenceType?: NotificationReferenceType | null;
  content: string;
  sendPush?: boolean;
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
    return "As tabelas de notificacao ainda nao existem. Rode o SQL de notifications no Supabase.";
  }

  return [message, code ? `code=${code}` : "", details, hint].filter(Boolean).join(" | ");
}

function buildPushPayload(type: NotificationType, content: string) {
  if (type === "like") return { title: "FigGo", body: content };
  if (type === "comment" || type === "reply") return { title: "Novo comentario", body: content };
  if (type === "trade_point") return { title: "Novo ponto de troca", body: content };
  if (type === "trade_point_post") return { title: "Novo post de ponto de troca", body: content };
  return { title: "Atualizacao FigGo", body: content };
}

async function sendPushThroughEdgeFunction(params: {
  userId: string;
  title: string;
  body: string;
  data: Record<string, string>;
}) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("send-push-notification", {
    body: {
      user_id: params.userId,
      title: params.title,
      body: params.body,
      data: params.data,
    },
  });
  if (error) throw new Error(parseSupabaseError(error));
}

async function shouldSkipAsDuplicate(input: CreateNotificationInput) {
  const dedupeTypes: NotificationType[] = ["like", "trade_point", "trade_point_post"];
  if (!dedupeTypes.includes(input.type)) return false;
  const client = requireSupabase();
  const query = client
    .from("notifications")
    .select("id")
    .eq("user_id", input.userId)
    .eq("type", input.type);

  if (input.referenceId) {
    query.eq("reference_id", input.referenceId);
  } else {
    query.is("reference_id", null);
  }

  if (input.referenceType) {
    query.eq("reference_type", input.referenceType);
  } else {
    query.is("reference_type", null);
  }

  if (input.fromUserId) {
    query.eq("from_user_id", input.fromUserId);
  } else {
    query.is("from_user_id", null);
  }

  const { data, error } = await query.limit(1);
  if (error) throw new Error(parseSupabaseError(error));
  return Boolean(data?.length);
}

export async function createNotification(input: CreateNotificationInput) {
  const client = requireSupabase();
  const fromUserId = input.fromUserId ?? null;
  if (fromUserId && fromUserId === input.userId) return { skipped: true };
  if (await shouldSkipAsDuplicate(input)) return { skipped: true };

  const { data, error } = await client
    .from("notifications")
    .insert({
      user_id: input.userId,
      from_user_id: fromUserId,
      type: input.type,
      reference_id: input.referenceId ?? null,
      reference_type: input.referenceType ?? null,
      content: input.content,
      is_read: false,
    })
    .select("id,user_id,from_user_id,type,reference_id,reference_type,content,is_read,created_at")
    .single();

  if (error) throw new Error(parseSupabaseError(error));

  if (input.sendPush ?? true) {
    const push = buildPushPayload(input.type, input.content);
    try {
      await sendPushThroughEdgeFunction({
        userId: input.userId,
        title: push.title,
        body: push.body,
        data: {
          type: input.type,
          referenceId: input.referenceId ?? "",
          referenceType: input.referenceType ?? "",
        },
      });
    } catch {
      // Notificacao interna continua valendo mesmo se push falhar.
    }
  }

  return { skipped: false, notification: data as NotificationRow };
}

export async function fetchNotifications(userId: string, limit = 40) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("notifications")
    .select("id,user_id,from_user_id,type,reference_id,reference_type,content,is_read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(parseSupabaseError(error));
  const rows = (data ?? []) as NotificationRow[];
  const fromIds = Array.from(new Set(rows.map((row) => row.from_user_id).filter(Boolean) as string[]));
  if (!fromIds.length) {
    return rows.map((row) => ({ ...row, from_profile: null })) as AppNotification[];
  }

  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id,username,full_name,avatar_url")
    .in("id", fromIds);

  if (profilesError) throw new Error(parseSupabaseError(profilesError));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile as NotificationProfile]));
  return rows.map((row) => ({
    ...row,
    from_profile: row.from_user_id ? profileById.get(row.from_user_id) ?? null : null,
  })) as AppNotification[];
}

export async function fetchUnreadNotificationsCount(userId: string) {
  const client = requireSupabase();
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw new Error(parseSupabaseError(error));
  return count ?? 0;
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
  if (error) throw new Error(parseSupabaseError(error));
}

export async function markAllNotificationsAsRead(userId: string) {
  const client = requireSupabase();
  const { error } = await client
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw new Error(parseSupabaseError(error));
}

export function subscribeToNotifications(
  userId: string,
  onInsert: (row: NotificationRow) => void,
  onUpdate?: (row: NotificationRow) => void,
) {
  if (!supabaseEnabled || !supabase) return () => undefined;
  const client = supabase;
  const channelName = `notifications-${userId}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new as NotificationRow),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate?.(payload.new as NotificationRow),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function getRelativeNotificationTime(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days} dia${days > 1 ? "s" : ""}`;
}

export async function notifyUsersAboutNewTradePoint(params: {
  creatorId: string;
  tradePointId: string;
  tradePointName: string;
  latitude: number;
  longitude: number;
}) {
  const client = requireSupabase();
  let targetUserIds: string[] = [];

  // Se o projeto tiver latitude/longitude em profiles, notifica por proximidade.
  // Caso contrario, fallback para todos os usuarios.
  const profilesQuery = await client.from("profiles").select("id,latitude,longitude").neq("id", params.creatorId);
  const missingLocationColumns =
    typeof profilesQuery.error === "object" &&
    profilesQuery.error !== null &&
    "message" in profilesQuery.error &&
    String((profilesQuery.error as { message?: string }).message ?? "").includes("latitude");

  if (!profilesQuery.error && profilesQuery.data) {
    const nearby = (profilesQuery.data as { id: string; latitude: number | null; longitude: number | null }[])
      .filter((profile) => profile.latitude != null && profile.longitude != null)
      .filter((profile) => {
        const lat = profile.latitude as number;
        const lng = profile.longitude as number;
        const distanceKm = haversineDistanceKm(params.latitude, params.longitude, lat, lng);
        return distanceKm <= 20;
      })
      .map((profile) => profile.id);
    if (nearby.length) targetUserIds = nearby;
  }

  if (missingLocationColumns || !targetUserIds.length) {
    const fallback = await client.from("profiles").select("id").neq("id", params.creatorId);
    if (fallback.error) throw new Error(parseSupabaseError(fallback.error));
    targetUserIds = (fallback.data ?? []).map((row) => row.id as string);
  }

  if (!targetUserIds.length) return;

  await Promise.all(
    targetUserIds.map((userId) =>
      createNotification({
        userId,
        fromUserId: params.creatorId,
        type: "trade_point",
        referenceId: params.tradePointId,
        referenceType: "trade_point",
        content: "Novo ponto de troca disponivel perto de voce",
        sendPush: true,
      }),
    ),
  );
}

export async function notifyUsersAboutTradePointPost(params: {
  authorId: string;
  postId: string;
  tradePointName: string;
}) {
  const client = requireSupabase();
  const { data, error } = await client.from("profiles").select("id").neq("id", params.authorId);
  if (error) throw new Error(parseSupabaseError(error));
  const targetUserIds = (data ?? []).map((row) => row.id as string);
  if (!targetUserIds.length) return;

  await Promise.all(
    targetUserIds.map((userId) =>
      createNotification({
        userId,
        fromUserId: params.authorId,
        type: "trade_point_post",
        referenceId: params.postId,
        referenceType: "post",
        content: `Novo post sobre ponto de troca: ${params.tradePointName}`,
        sendPush: true,
      }),
    ),
  );
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
