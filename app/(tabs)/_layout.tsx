import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSessionStore } from "@/store/sessionStore";
import { subscribeToNotifications } from "@/services/notificationService";
import { useNotificationsStore } from "@/store/notificationsStore";

const tabIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  mapa: "map",
  feed: "home",
  album: "albums",
  notificacoes: "notifications",
  perfil: "person-circle",
};

export default function TabsLayout() {
  const { ready, user, needsUsername } = useSessionStore();
  const refreshUnreadCount = useNotificationsStore((state) => state.refreshUnreadCount);
  const setUnreadCount = useNotificationsStore((state) => state.setUnreadCount);

  useEffect(() => {
    if (!user?.id) return;
    void refreshUnreadCount(user.id);
    const unsubscribe = subscribeToNotifications(
      user.id,
      (newNotification) => {
        if (!newNotification.is_read) {
          setUnreadCount((current) => current + 1);
        }
      },
      () => {
        void refreshUnreadCount(user.id);
      },
    );
    return unsubscribe;
  }, [refreshUnreadCount, setUnreadCount, user?.id]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050607" }}>
        <ActivityIndicator color="#20D25C" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (needsUsername) return <Redirect href="/username" />;

  return (
    <Tabs
      initialRouteName="feed"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#20D25C",
        tabBarInactiveTintColor: "#8C9AAE",
        tabBarStyle: {
          backgroundColor: "#0C1118",
          borderTopColor: "#1F2B3A",
          height: 68,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarIcon: ({ color, size }) => <Ionicons name={tabIcon[route.name]} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="mapa" options={{ title: "Mapa" }} />
      <Tabs.Screen name="album" options={{ title: "Album" }} />
      <Tabs.Screen
        name="notificacoes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
