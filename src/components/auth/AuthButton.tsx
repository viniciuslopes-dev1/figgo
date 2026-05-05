import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

export function AuthButton({ label, onPress, loading, variant = "primary" }: AuthButtonProps) {
  const secondary = variant === "secondary";
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.base, secondary ? styles.secondary : styles.primary, pressed && styles.pressed, loading && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? "#FFFFFF" : "#141414"} />
      ) : (
        <Text style={[styles.text, secondary ? styles.textSecondary : styles.textPrimary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 55,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primary: {
    backgroundColor: "#F5C542",
    borderColor: "#F7D66E",
  },
  secondary: {
    backgroundColor: "#0E1621",
    borderColor: "#273346",
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
  textPrimary: {
    color: "#121212",
  },
  textSecondary: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.7,
  },
});
