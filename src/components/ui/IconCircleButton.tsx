import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { design } from "@/constants/design";

export function IconCircleButton({
  name,
  size = 18,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Ionicons name={name} size={size} color="#E5E7EB" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: design.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#243142",
  },
});
