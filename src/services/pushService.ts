import { Platform } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { supabase, supabaseEnabled } from "@/services/supabase";
import type { NotificationType } from "@/services/notificationService";

type NotificationsModule = typeof import("expo-notifications");
type DeviceModule = typeof import("expo-device");

let pushModulesPromise: Promise<{ Notifications: NotificationsModule; Device: DeviceModule } | null> | null = null;
let notificationHandlerConfigured = false;

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

async function loadPushModules() {
  if (isExpoGo()) return null;
  if (pushModulesPromise) return pushModulesPromise;

  pushModulesPromise = (async () => {
    const [Notifications, Device] = await Promise.all([import("expo-notifications"), import("expo-device")]);
    return { Notifications, Device };
  })();

  return pushModulesPromise;
}

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
  return [message, code ? `code=${code}` : "", details, hint].filter(Boolean).join(" | ");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function configureNotificationHandler(Notifications: NotificationsModule) {
  if (notificationHandlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  notificationHandlerConfigured = true;
}

export async function registerPushTokenForCurrentUser(userId: string) {
  if (!supabaseEnabled || !supabase) return null;
  const modules = await loadPushModules();
  if (!modules) return null;
  const { Notifications, Device } = modules;
  configureNotificationHandler(Notifications);

  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const permission = await Notifications.getPermissionsAsync();
  let finalStatus = permission.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") return null;

  const rawProjectId =
    Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || undefined;
  const projectId = rawProjectId && isUuid(rawProjectId) ? rawProjectId : undefined;
  let expoToken;
  try {
    expoToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  } catch {
    return null;
  }

  const token = expoToken.data;
  if (!token) return null;

  const deviceId = [Device.osName || "unknown", Device.modelName || "unknown", Device.deviceName || "unknown"]
    .filter(Boolean)
    .join("-");

  const client = requireSupabase();
  const { data: existing, error: existingError } = await client
    .from("user_push_tokens")
    .select("id")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error(parseSupabaseError(existingError));

  if (existing?.id) {
    const { error: updateError } = await client
      .from("user_push_tokens")
      .update({
        expo_push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (updateError) throw new Error(parseSupabaseError(updateError));
    return token;
  }

  const { error: insertError } = await client.from("user_push_tokens").insert({
    user_id: userId,
    expo_push_token: token,
    device_id: deviceId,
    platform: Platform.OS,
  });
  if (insertError) throw new Error(parseSupabaseError(insertError));
  return token;
}

type PushPayload = {
  type?: NotificationType;
  referenceId?: string;
  referenceType?: string;
};

function handleNotificationNavigation(payload: PushPayload) {
  if (!payload.type) return;
  if ((payload.type === "like" || payload.type === "comment" || payload.type === "reply") && payload.referenceId) {
    router.push({
      pathname: "/(tabs)/feed",
      params: {
        postId: payload.referenceId,
        openComments: payload.type === "comment" || payload.type === "reply" ? "1" : "0",
      },
    });
    return;
  }
  if (payload.type === "trade_point" && payload.referenceId) {
    router.push({
      pathname: "/(tabs)/mapa",
      params: { pointId: payload.referenceId },
    });
    return;
  }
  if (payload.type === "trade_point_post" && payload.referenceId) {
    router.push({
      pathname: "/(tabs)/feed",
      params: { postId: payload.referenceId, openComments: "0" },
    });
  }
}

export function initPushInteractionHandler() {
  if (isExpoGo()) return () => undefined;

  let responseSub: { remove: () => void } | null = null;
  let cancelled = false;

  void (async () => {
    const modules = await loadPushModules();
    if (!modules || cancelled) return;
    const { Notifications } = modules;
    configureNotificationHandler(Notifications);

    responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushPayload;
      handleNotificationNavigation(data);
    });

    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (cancelled || !lastResponse) return;
    const data = lastResponse.notification.request.content.data as PushPayload;
    handleNotificationNavigation(data);
  })();

  return () => {
    cancelled = true;
    responseSub?.remove();
  };
}
