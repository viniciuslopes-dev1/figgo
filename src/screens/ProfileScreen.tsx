import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen } from "@/components/AppScreen";
import { GlassCard } from "@/components/Ui";

const stats = [
  { label: "Album", value: "72%", tone: "#7CE7A7" },
  { label: "Tenho", value: "840", tone: "#EAF0F8" },
  { label: "Faltam", value: "260", tone: "#F4CF6E" },
  { label: "Repetidas", value: "110", tone: "#8EB2FF" },
  { label: "Posts", value: "32", tone: "#D9E2F1" },
  { label: "Seguidores", value: "214", tone: "#D9E2F1" },
];

export function ProfileScreen() {
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>L21</Text>
            </View>
            <View style={styles.identity}>
              <Text style={styles.name}>Lucas Moraes</Text>
              <Text style={styles.username}>@lucas21</Text>
              <View style={styles.cityRow}>
                <Ionicons name="location-outline" size={13} color="#9FB0C6" />
                <Text style={styles.city}>Sao Paulo, SP</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        <View style={styles.actionsRow}>
          <ActionButton icon="create-outline" label="Editar perfil" primary />
          <ActionButton icon="share-social-outline" label="Compartilhar" />
          <ActionButton icon="swap-horizontal-outline" label="Ver trocas" />
        </View>

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <GlassCard key={s.label}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={[styles.statValue, { color: s.tone }]}>{s.value}</Text>
              </View>
            </GlassCard>
          ))}
        </View>

        <GlassCard>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo da semana</Text>
            <Text style={styles.summaryText}>Você recebeu 14 pedidos de troca e completou 26 novas figurinhas no album.</Text>
          </View>
        </GlassCard>
      </ScrollView>
    </AppScreen>
  );
}

function ActionButton({
  icon,
  label,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary?: boolean;
}) {
  return (
    <View style={[styles.actionBtn, primary && styles.actionPrimary]}>
      <Ionicons name={icon} size={15} color={primary ? "#FFFFFF" : "#DCE5F1"} />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 14,
    paddingTop: 46,
    paddingBottom: 120,
    gap: 10,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: "#182433",
    borderWidth: 1.5,
    borderColor: "#2FDB79",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#F2F7FF",
    fontSize: 24,
    fontWeight: "800",
  },
  identity: {
    flex: 1,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  username: {
    color: "#92A4BA",
    marginTop: 1,
    fontSize: 12.5,
    fontWeight: "600",
  },
  cityRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  city: {
    color: "#9FB0C6",
    fontSize: 12,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B3748",
    backgroundColor: "#0B111A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionPrimary: {
    backgroundColor: "#1FAE4D",
    borderColor: "#32D768",
  },
  actionText: {
    color: "#DCE5F1",
    fontSize: 12,
    fontWeight: "600",
  },
  actionTextPrimary: {
    color: "#FFFFFF",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    width: 105,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  statLabel: {
    color: "#8FA0B7",
    fontSize: 11,
    fontWeight: "600",
  },
  statValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
  },
  summaryCard: {
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  summaryTitle: {
    color: "#ECF2FA",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryText: {
    color: "#9EB0C6",
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },
});
