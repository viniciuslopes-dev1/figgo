import { Pressable, StyleSheet, Text } from "react-native";
import { design } from "@/constants/design";

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
  pill: {
    height: 38,
    borderRadius: design.radius.md,
    borderWidth: 1,
    borderColor: design.colors.border,
    backgroundColor: "#090D13",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  pillActive: {
    backgroundColor: "rgba(32,210,92,0.18)",
    borderColor: "#2CFF7E",
  },
  pillLabel: {
    color: design.colors.text,
    fontWeight: "600",
    fontSize: 13,
  },
  pillLabelActive: {
    color: "#7DFFAB",
    fontWeight: "700",
  },
});
