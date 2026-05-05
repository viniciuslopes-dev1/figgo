import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { design } from "@/constants/design";

type Props = {
  value: string;
  imageUri: string | null;
  disabled?: boolean;
  posting?: boolean;
  onChangeText: (text: string) => void;
  onPickImage: () => void;
  onClearImage: () => void;
  onSubmit: () => void;
};

export function PostComposer({
  value,
  imageUri,
  disabled,
  posting,
  onChangeText,
  onPickImage,
  onClearImage,
  onSubmit,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Compartilhe sua troca ou progresso..."
        placeholderTextColor={design.colors.textMuted}
        multiline
        style={styles.input}
        editable={!disabled && !posting}
      />
      {imageUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <Pressable style={styles.removeImage} onPress={onClearImage}>
            <Text style={styles.removeImageText}>Remover</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={onPickImage} disabled={disabled || posting}>
          <Text style={styles.secondaryText}>Imagem</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={disabled || posting}>
          <Text style={styles.primaryText}>{posting ? "Publicando..." : "Publicar"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "rgba(13,17,23,0.9)",
    borderWidth: 1,
    borderColor: "rgba(156,176,202,0.16)",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 18,
  },
  input: {
    color: design.colors.text,
    minHeight: 80,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: "top",
  },
  previewWrap: { marginTop: 10 },
  preview: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: "#14202E" },
  removeImage: { marginTop: 8, alignSelf: "flex-start" },
  removeImageText: { color: "#E89999", fontSize: 13, fontWeight: "600" },
  actions: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  secondaryButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "rgba(44,107,255,0.18)" },
  secondaryText: { color: "#C9D9FF", fontSize: 13, fontWeight: "600" },
  primaryButton: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, backgroundColor: design.colors.green },
  primaryText: { color: "#06220F", fontSize: 13.5, fontWeight: "700" },
});
