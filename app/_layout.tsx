import "react-native-gesture-handler";
import "react-native-reanimated";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useSessionStore } from "@/store/sessionStore";
import { initPushInteractionHandler, registerPushTokenForCurrentUser } from "@/services/pushService";

export default function RootLayout() {
  const user = useSessionStore((state) => state.user);

  useEffect(() => {
    const teardown = initPushInteractionHandler();
    return teardown;
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void registerPushTokenForCurrentUser(user.id).catch(() => {
      // Push nao pode quebrar inicializacao do app.
    });
  }, [user?.id]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="username" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
