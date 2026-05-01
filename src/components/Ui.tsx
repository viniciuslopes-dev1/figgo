import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "@/styles/tokens";

export function GlassCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(10,15,24,0.92)",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  pill: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: "#090D13",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  pillActive: {
    backgroundColor: "rgba(32,210,92,0.18)",
    borderColor: "#2CFF7E",
  },
  pillLabel: { color: tokens.colors.text, fontWeight: "600", fontSize: 13 },
  pillLabelActive: { color: "#7DFFAB", fontWeight: "700" },
});
