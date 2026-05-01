import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSessionStore } from "@/store/sessionStore";

export function LoginScreen() {
  const { signInAsGuest } = useSessionStore();
  return (
    <LinearGradient colors={["#040506", "#08140E", "#040506"]} style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.brand}>Fig<Text style={{ color: "#20D25C" }}>Go</Text></Text>
        <Text style={styles.copy}>Troque figurinhas, complete seu album e faca parte da maior comunidade.</Text>
      </View>
      <View style={styles.panel}>
        <Btn label="Continuar com Google" light />
        <Btn label="Continuar com Apple" />
        <Text style={styles.or}>ou</Text>
        <Btn label="Entrar com E-mail" />
        <Btn
          label="Continuar como visitante"
          gold
          onPress={async () => {
            await signInAsGuest("guest");
            router.replace("/(tabs)/feed");
          }}
        />
      </View>
    </LinearGradient>
  );
}

function Btn({ label, light, gold, onPress }: { label: string; light?: boolean; gold?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, light && styles.btnLight, gold && styles.btnGold]}>
      <Text style={[styles.btnText, light && { color: "#0D0D0D" }, gold && { color: "#111" }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "space-between" },
  hero: { marginTop: 90 },
  brand: { color: "#fff", fontSize: 62, fontWeight: "900", letterSpacing: -1.5 },
  copy: { color: "#D2D9E2", fontSize: 20, lineHeight: 30, marginTop: 22 },
  panel: { gap: 12, marginBottom: 24 },
  btn: { height: 58, borderRadius: 18, borderWidth: 1, borderColor: "#273042", backgroundColor: "#0B1018", alignItems: "center", justifyContent: "center" },
  btnLight: { backgroundColor: "#fff", borderColor: "#fff" },
  btnGold: { backgroundColor: "#F5C542", borderColor: "#F7D66E", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  or: { color: "#8B95A8", textAlign: "center", marginVertical: 2, fontSize: 24 },
});
