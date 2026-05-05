import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppScreen } from "@/components/layout/AppScreen";
import { design } from "@/constants/design";
import {
  fetchNotifications,
  getRelativeNotificationTime,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
  type AppNotification,
  type NotificationType,
} from "@/services/notificationService";
import { useSessionStore } from "@/store/sessionStore";
import { useNotificationsStore } from "@/store/notificationsStore";

export function NotificationsScreen() {
  const user = useSessionStore((state) => state.user);
  const setUnreadCount = useNotificationsStore((state) => state.setUnreadCount);
  const refreshUnreadCount = useNotificationsStore((state) => state.refreshUnreadCount);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void loadNotifications(user.id);
    const unsubscribe = subscribeToNotifications(
      user.id,
      () => {
        void loadNotifications(user.id, false);
      },
      () => {
        void loadNotifications(user.id, false);
      },
    );
    return unsubscribe;
  }, [user?.id]);

  async function loadNotifications(userId: string, showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      const data = await fetchNotifications(userId);
      setItems(data);
      const unread = data.filter((item) => !item.is_read).length;
      setUnreadCount(unread);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const hasUnread = useMemo(() => items.some((item) => !item.is_read), [items]);

  async function openNotification(item: AppNotification) {
    if (!user?.id) return;
    if (!item.is_read) {
      await markNotificationAsRead(item.id, user.id);
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry)),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    if ((item.type === "like" || item.type === "comment" || item.type === "reply" || item.type === "trade_point_post") && item.reference_id) {
      router.push({
        pathname: "/(tabs)/feed",
        params: {
          postId: item.reference_id,
          openComments: item.type === "comment" || item.type === "reply" ? "1" : "0",
        },
      });
      return;
    }
    if (item.type === "trade_point" && item.reference_id) {
      router.push({
        pathname: "/(tabs)/mapa",
        params: { pointId: item.reference_id },
      });
    }
  }

  async function handleMarkAllAsRead() {
    if (!user?.id || !hasUnread) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead(user.id);
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
      await refreshUnreadCount(user.id);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.title}>Notificacoes</Text>
          <Pressable
            style={[styles.readAllButton, (!hasUnread || markingAll) && styles.readAllButtonDisabled]}
            disabled={!hasUnread || markingAll}
            onPress={() => void handleMarkAllAsRead()}
          >
            <Text style={styles.readAllText}>{markingAll ? "..." : "Marcar todas como lidas"}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={design.colors.green} />
            <Text style={styles.loadingText}>Carregando notificacoes...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  if (!user?.id) return;
                  setRefreshing(true);
                  void loadNotifications(user.id, false);
                }}
                tintColor={design.colors.green}
              />
            }
            contentContainerStyle={items.length ? styles.listContent : styles.emptyContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="notifications-off-outline" size={28} color="#89A0BD" />
                <Text style={styles.emptyTitle}>Sem notificacoes por enquanto</Text>
                <Text style={styles.emptyText}>Quando houver novidades, elas vao aparecer aqui.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable style={[styles.item, !item.is_read && styles.unreadItem]} onPress={() => void openNotification(item)}>
                <View style={styles.leading}>
                  {item.from_profile?.avatar_url ? (
                    <Image source={{ uri: item.from_profile.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Ionicons name="person" size={14} color="#DCE6F3" />
                    </View>
                  )}
                  <View style={styles.typeIconWrap}>
                    <Ionicons name={iconByType(item.type)} size={12} color="#092111" />
                  </View>
                </View>

                <View style={styles.contentWrap}>
                  <Text style={styles.text}>{item.content}</Text>
                  <Text style={styles.time}>{getRelativeNotificationTime(item.created_at)}</Text>
                </View>

                {!item.is_read ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            )}
          />
        )}
      </View>
    </AppScreen>
  );
}

function iconByType(type: NotificationType): keyof typeof Ionicons.glyphMap {
  if (type === "like") return "heart";
  if (type === "comment" || type === "reply") return "chatbubble";
  if (type === "trade_point") return "location";
  if (type === "trade_point_post") return "megaphone";
  return "information-circle";
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16, paddingTop: 58 },
  header: { marginBottom: 12, gap: 10 },
  title: { color: "#fff", fontSize: 30, fontWeight: "800" },
  readAllButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#294158",
    backgroundColor: "rgba(9,18,29,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  readAllButtonDisabled: { opacity: 0.6 },
  readAllText: { color: "#C7D7EA", fontSize: 12.5, fontWeight: "600" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#A6BAD2", fontSize: 13 },
  listContent: { paddingBottom: 120, gap: 10 },
  item: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(156,176,202,0.16)",
    backgroundColor: "rgba(10,16,25,0.82)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  unreadItem: {
    borderColor: "rgba(32,210,92,0.4)",
    backgroundColor: "rgba(24,40,30,0.38)",
  },
  leading: { width: 38, alignItems: "center" },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1D2C40",
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconWrap: {
    marginTop: -4,
    marginLeft: 18,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#20D25C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#88F3AF",
    position: "absolute",
    bottom: -2,
  },
  contentWrap: { flex: 1, gap: 5 },
  text: { color: "#E6EDF8", fontSize: 14.5, lineHeight: 20 },
  time: { color: "#94A9C3", fontSize: 12.5 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#20D25C", marginLeft: 4 },
  emptyContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingBottom: 60 },
  emptyWrap: { alignItems: "center", gap: 6, maxWidth: 260 },
  emptyTitle: { color: "#DCE7F6", fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyText: { color: "#92A8C3", fontSize: 13, textAlign: "center", lineHeight: 18 },
});
