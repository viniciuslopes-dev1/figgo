import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { FeedComment } from "@/services/feedService";
import { design } from "@/constants/design";

type Props = {
  visible: boolean;
  comments: FeedComment[];
  canInteract: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  myUserId: string | null;
};

export function CommentsModal({ visible, comments, canInteract, loading, onClose, onSubmit, onDelete, myUserId }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSubmit(text);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>Comentarios</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Fechar</Text>
            </Pressable>
          </View>
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>{loading ? "Carregando..." : "Sem comentarios ainda."}</Text>}
            renderItem={({ item }) => {
              const mine = myUserId === item.user_id;
              return (
                <View style={styles.comment}>
                  <Text style={styles.author}>{item.profile?.full_name || item.profile?.username || "Colecionador"}</Text>
                  <Text style={styles.commentText}>{item.content}</Text>
                  <View style={styles.commentFooter}>
                    <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString("pt-BR")}</Text>
                    {mine ? (
                      <Pressable onPress={() => onDelete(item.id)}>
                        <Text style={styles.delete}>Excluir</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={canInteract ? "Comente neste post..." : "Faca login para comentar"}
              placeholderTextColor={design.colors.textMuted}
              value={text}
              onChangeText={setText}
              editable={canInteract && !sending}
            />
            <Pressable style={styles.send} onPress={submit} disabled={!canInteract || sending}>
              <Text style={styles.sendText}>{sending ? "..." : "Enviar"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0D1117", maxHeight: "84%", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { color: design.colors.text, fontSize: 16, fontWeight: "700" },
  close: { color: "#C9D9FF", fontSize: 13.5, fontWeight: "600" },
  empty: { color: design.colors.textMuted, textAlign: "center", marginTop: 16 },
  comment: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(156,176,202,0.12)" },
  author: { color: "#F0F6FF", fontSize: 13.5, fontWeight: "700" },
  commentText: { color: "#DCE6F6", marginTop: 4, fontSize: 14, lineHeight: 20 },
  commentFooter: { marginTop: 6, flexDirection: "row", justifyContent: "space-between" },
  time: { color: design.colors.textMuted, fontSize: 12 },
  delete: { color: "#E89999", fontSize: 12.5, fontWeight: "600" },
  inputRow: { flexDirection: "row", marginTop: 10, gap: 8, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: "rgba(156,176,202,0.2)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: design.colors.text },
  send: { backgroundColor: design.colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  sendText: { color: "#06220F", fontWeight: "700", fontSize: 13 },
});
