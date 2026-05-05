import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export function AppScreen({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={["#050607", "#08120D", "#050607"]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1 },
});
