import { StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/AppScreen";
import { GlassCard } from "@/components/Ui";

export function NotificationsScreen() {
  return (
    <AppScreen>
      <View style={styles.wrap}>
        <Text style={styles.title}>Notificacoes</Text>
        {["Novo like no seu post", "Amanda comentou sua troca", "Novo ponto proximo de voce"].map((item) => (
          <GlassCard key={item}>
            <View style={styles.item}>
              <View style={styles.dot} />
              <Text style={styles.text}>{item}</Text>
            </View>
          </GlassCard>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16, paddingTop: 58, gap: 10 },
  title: { color: "#fff", fontSize: 36, fontWeight: "800", marginBottom: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#20D25C" },
  text: { color: "#E5E7EB", fontSize: 20 },
});

