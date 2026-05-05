import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";
import { normalizeUsername, validateUsername } from "@/services/profileService";
import { useSessionStore } from "@/store/sessionStore";

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

export function UsernameScreen() {
  const { user, loading, needsUsername, checkUsernameAvailability, saveUsername } = useSessionStore();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState("");

  const normalized = useMemo(() => normalizeUsername(username), [username]);
  const validationError = useMemo(() => validateUsername(normalized), [normalized]);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!needsUsername) {
      router.replace("/(tabs)/mapa");
    }
  }, [needsUsername, user]);

  useEffect(() => {
    let active = true;
    setErrorMessage("");

    if (!normalized) {
      setStatus("idle");
      setFeedback("");
      return () => {
        active = false;
      };
    }

    if (validationError) {
      setStatus("invalid");
      setFeedback(validationError);
      return () => {
        active = false;
      };
    }

    setStatus("checking");
    setFeedback("Validando disponibilidade...");

    const timeout = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(normalized);
        if (!active) return;
        if (available) {
          setStatus("available");
          setFeedback("Disponivel");
          return;
        }
        setStatus("taken");
        setFeedback("Ja em uso");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setFeedback("Nao foi possivel verificar agora.");
        setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel verificar agora.");
      }
    }, 320);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [checkUsernameAvailability, normalized, validationError]);

  async function handleConfirm() {
    setErrorMessage("");
    const error = validateUsername(normalized);
    if (error) {
      setStatus("invalid");
      setFeedback(error);
      return;
    }

    try {
      await saveUsername(normalized);
      router.replace("/(tabs)/mapa");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Nao foi possivel salvar seu username.");
    }
  }

  const canSubmit = status === "available" && !loading;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Crie seu username unico (@seunome)</Text>
          <Text style={styles.subtitle}>Seu username identifica seu perfil na comunidade FigGo.</Text>

          <AuthInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="seu_username"
            returnKeyType="done"
          />

          <Text style={styles.preview}>{normalized ? `@${normalized}` : "@seu_username"}</Text>
          {feedback ? <Text style={[styles.feedback, status === "taken" || status === "invalid" || status === "error" ? styles.feedbackError : styles.feedbackOk]}>{feedback}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <AuthButton label="Confirmar username" loading={loading} onPress={handleConfirm} />
          {!canSubmit ? <Text style={styles.hint}>Escolha um username valido e disponivel para continuar.</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#060A0F",
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#253447",
    backgroundColor: "rgba(10, 18, 29, 0.95)",
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 10,
  },
  title: {
    color: "#F2F6FD",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#9FB0C6",
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 4,
  },
  preview: {
    color: "#DDE8F7",
    fontSize: 14,
    fontWeight: "700",
  },
  feedback: {
    fontSize: 13,
    fontWeight: "600",
  },
  feedbackOk: {
    color: "#BCE9C9",
  },
  feedbackError: {
    color: "#FFADAD",
  },
  error: {
    color: "#FFADAD",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  hint: {
    color: "#8FA2BC",
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: "center",
    marginTop: -2,
  },
});
