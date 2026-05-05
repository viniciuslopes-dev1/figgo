import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseEnabled } from "@/services/supabase";
import {
  ensureProfileRow,
  fetchProfileByUserId,
  isUsernameAvailable,
  saveUsernameForCurrentUser,
} from "@/services/profileService";

type UserModel = { id: string; name: string; email: string; city: string; username: string | null };

type SessionState = {
  user: UserModel | null;
  session: Session | null;
  needsUsername: boolean;
  ready: boolean;
  loading: boolean;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  saveUsername: (username: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>;
  recoverPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const MISSING_CONFIG_ERROR = "Configure o Supabase para autenticar: EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.";

function mapSupabaseUserFallback(user: User | null): UserModel | null {
  if (!user) return null;
  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    (user.email ? user.email.split("@")[0] : "Colecionador");

  return {
    id: user.id,
    name: displayName,
    email: user.email ?? "",
    city: "Sao Paulo",
    username: null,
  };
}

async function mapSupabaseUser(user: User | null): Promise<UserModel | null> {
  if (!user) return null;

  const fallback = mapSupabaseUserFallback(user)!;
  if (!supabaseEnabled || !supabase) return fallback;

  try {
    await ensureProfileRow(user, fallback.name);
    const profile = await fetchProfileByUserId(user.id);
    const profileName = profile?.full_name?.trim() || fallback.name;
    const username = profile?.username?.trim() || null;

    return {
      ...fallback,
      name: profileName,
      username,
    };
  } catch {
    return fallback;
  }
}

function parseAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Nao foi possivel concluir esta acao. Tente novamente.";
  const raw = error.message.toLowerCase();

  if (raw.includes("invalid login credentials")) return "Email ou senha invalidos.";
  if (raw.includes("email not confirmed")) return "Confirme seu email para entrar.";
  if (raw.includes("user already registered")) return "Este email ja esta cadastrado.";
  if (raw.includes("duplicate key value") && raw.includes("username")) return "Esse username ja esta em uso.";
  if (raw.includes("password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
  if (raw.includes("failed to fetch") || raw.includes("network")) return "Sem conexao com a internet no momento.";

  return error.message;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  session: null,
  needsUsername: false,
  ready: !supabaseEnabled,
  loading: false,

  initialize: async () => {
    if (!supabaseEnabled || !supabase) {
      set({ ready: true, user: null, session: null, needsUsername: false });
      return;
    }
    if (get().ready) return;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({ ready: true, user: null, session: null, needsUsername: false });
      return;
    }

    const mappedUser = await mapSupabaseUser(data.session?.user ?? null);
    set({
      ready: true,
      session: data.session,
      user: mappedUser,
      needsUsername: Boolean(mappedUser && !mappedUser.username),
    });
  },

  refreshProfile: async () => {
    const sessionUser = get().session?.user ?? null;
    const mappedUser = await mapSupabaseUser(sessionUser);
    set({
      user: mappedUser,
      needsUsername: Boolean(mappedUser && !mappedUser.username),
    });
  },

  checkUsernameAvailability: async (username) => {
    if (!supabaseEnabled || !supabase) throw new Error(MISSING_CONFIG_ERROR);
    const currentUserId = get().user?.id;
    return isUsernameAvailable(username, currentUserId);
  },

  saveUsername: async (username) => {
    if (!supabaseEnabled || !supabase) throw new Error(MISSING_CONFIG_ERROR);
    const currentUser = get().user;
    if (!currentUser) throw new Error("Sessao invalida. Faca login novamente.");

    set({ loading: true });
    try {
      const saved = await saveUsernameForCurrentUser(currentUser, username);
      set((state) => ({
        user: state.user ? { ...state.user, username: saved } : state.user,
        needsUsername: false,
      }));
    } catch (error) {
      throw new Error(parseAuthErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    if (!supabaseEnabled || !supabase) throw new Error(MISSING_CONFIG_ERROR);
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
    } catch (error) {
      throw new Error(parseAuthErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  signUpWithEmail: async (email, password, fullName) => {
    if (!supabaseEnabled || !supabase) throw new Error(MISSING_CONFIG_ERROR);
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: fullName ? { data: { full_name: fullName.trim() } } : undefined,
      });
      if (error) throw error;
    } catch (error) {
      throw new Error(parseAuthErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  recoverPassword: async (email) => {
    if (!supabaseEnabled || !supabase) throw new Error(MISSING_CONFIG_ERROR);
    set({ loading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) throw error;
    } catch (error) {
      throw new Error(parseAuthErrorMessage(error));
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    if (!supabaseEnabled || !supabase) {
      set({ user: null, session: null, needsUsername: false });
      return;
    }
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, session: null, needsUsername: false });
    } finally {
      set({ loading: false });
    }
  },
}));

if (supabaseEnabled && supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    void (async () => {
      const mappedUser = await mapSupabaseUser(session?.user ?? null);
      useSessionStore.setState({
        ready: true,
        session,
        user: mappedUser,
        needsUsername: Boolean(mappedUser && !mappedUser.username),
      });
    })();
  });
}

void useSessionStore.getState().initialize();
