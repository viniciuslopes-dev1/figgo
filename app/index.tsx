import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSessionStore } from "@/store/sessionStore";

export default function Index() {
  const { ready, user } = useSessionStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0D0D0D" }}>
        <ActivityIndicator color="#0066FF" />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)/mapa" />;
}
