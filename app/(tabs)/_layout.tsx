import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const tabIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  mapa: "map",
  feed: "home",
  album: "albums",
  notificacoes: "notifications",
  perfil: "person-circle",
};

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="mapa"
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
      <Tabs.Screen name="notificacoes" options={{ title: "Notificacoes" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
