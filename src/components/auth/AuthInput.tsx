import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { design } from "@/constants/design";

type AuthInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthInput({ label, error, ...props }: AuthInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#6D7D91"
        style={[styles.input, error && styles.inputError, props.style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: "#DCE4EF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#33485F",
    backgroundColor: "rgba(12, 20, 31, 0.68)",
    paddingHorizontal: 15,
    color: design.colors.text,
    fontSize: 15.5,
    fontWeight: "500",
  },
  inputError: {
    borderColor: design.colors.red,
  },
  error: {
    color: "#FF9E9E",
    fontSize: 12,
    fontWeight: "500",
  },
});
