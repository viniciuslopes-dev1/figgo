import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSessionStore } from "@/store/sessionStore";
import { supabaseEnabled } from "@/services/supabase";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthInput } from "@/components/auth/AuthInput";

const loginBackground = require("../../imagens/tela_de_login/fundo_login.jpeg");
const loginLogo = require("../../imagens/tela_de_login/logo_login.png");

export function LoginScreen() {
  const { user, needsUsername, loading, signInWithEmail, signUpWithEmail, recoverPassword } = useSessionStore();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    if (needsUsername) {
      router.replace("/username");
      return;
    }
    router.replace("/(tabs)/mapa");
  }, [needsUsername, user]);

  const ctaLabel = useMemo(() => (mode === "login" ? "Entrar" : "Criar conta"), [mode]);

  async function handleSubmit() {
    setErrorMessage("");
    setInfoMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      setErrorMessage("Digite um email valido.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setErrorMessage("As senhas nao conferem.");
      return;
    }

    try {
      if (mode === "login") {
        await signInWithEmail(normalizedEmail, password);
        return;
      }
      await signUpWithEmail(normalizedEmail, password, fullName);
      setInfoMessage("Conta criada. Se o Supabase exigir confirmacao por email, confirme para concluir.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel autenticar agora.");
    }
  }

  async function handleRecoverPassword() {
    setErrorMessage("");
    setInfoMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      setErrorMessage("Informe seu email para recuperar a senha.");
      return;
    }
    try {
      await recoverPassword(normalizedEmail);
      setInfoMessage("Enviamos o link de recuperacao para seu email.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel recuperar a senha.");
    }
  }

  return (
    <ImageBackground source={loginBackground} style={styles.screen} resizeMode="cover">
      <View style={styles.overlay} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image source={loginLogo} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.panel}>
            <View style={styles.modeSwitch}>
              <Pressable onPress={() => setMode("login")} style={[styles.modeBtn, mode === "login" && styles.modeBtnActive]}>
                <Text style={[styles.modeText, mode === "login" && styles.modeTextActive]}>Entrar</Text>
              </Pressable>
              <Pressable onPress={() => setMode("signup")} style={[styles.modeBtn, mode === "signup" && styles.modeBtnActive]}>
                <Text style={[styles.modeText, mode === "signup" && styles.modeTextActive]}>Cadastrar</Text>
              </Pressable>
            </View>

            {mode === "signup" ? (
              <AuthInput
                label="Nome"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoCorrect={false}
                placeholder="Seu nome"
                returnKeyType="next"
              />
            ) : null}

            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="voce@email.com"
              returnKeyType="next"
            />

            <AuthInput
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Sua senha"
              returnKeyType="done"
            />

            {mode === "signup" ? (
              <AuthInput
                label="Confirmar senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Repita sua senha"
                returnKeyType="done"
              />
            ) : null}

            {mode === "login" ? (
              <Pressable onPress={handleRecoverPassword} style={styles.recoverBtn}>
                <Text style={styles.recoverText}>Esqueci minha senha</Text>
              </Pressable>
            ) : null}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}
            {!supabaseEnabled ? (
              <Text style={styles.errorText}>
                Supabase nao configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.
              </Text>
            ) : null}

            <AuthButton label={ctaLabel} loading={loading} onPress={handleSubmit} />
            <AuthButton
              variant="secondary"
              label={mode === "login" ? "Criar nova conta" : "Ja tenho conta"}
              onPress={() => {
                setMode((prev) => (prev === "login" ? "signup" : "login"));
                setErrorMessage("");
                setInfoMessage("");
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 58,
    paddingBottom: 34,
    justifyContent: "space-between",
    gap: 26,
  },
  hero: {
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
  },
  logo: {
    width: "84%",
    maxWidth: 360,
    minWidth: 220,
    height: 124,
  },
  panel: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#2C4058",
    backgroundColor: "rgba(8, 14, 22, 0.74)",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.26,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 12,
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: "rgba(10, 18, 27, 0.88)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#223349",
    padding: 4,
    marginBottom: 4,
  },
  modeBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  modeBtnActive: {
    backgroundColor: "#1B2A3B",
  },
  modeText: {
    color: "#8FA1B7",
    fontSize: 13.5,
    fontWeight: "600",
  },
  modeTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  recoverBtn: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  recoverText: {
    color: "#A8BCDA",
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    color: "#FF9F9F",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  infoText: {
    color: "#BFEACD",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
