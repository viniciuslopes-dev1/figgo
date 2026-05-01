import { create } from "zustand";
import { onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut } from "firebase/auth";
import { auth, firebaseEnabled } from "@/services/firebase";

type UserModel = { id: string; name: string; city: string };
type ProviderKind = "google" | "apple" | "email" | "guest";

type SessionState = {
  user: UserModel | null;
  ready: boolean;
  loading: boolean;
  signInAsGuest: (provider: ProviderKind) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  ready: !firebaseEnabled,
  loading: false,
  signInAsGuest: async () => {
    set({ loading: true });
    if (!firebaseEnabled || !auth) {
      useSessionStore.setState({
        user: { id: "guest-local", name: "Visitante", city: "Sao Paulo" },
        ready: true,
        loading: false,
      });
      return;
    }
    await signInAnonymously(auth);
    set({ loading: false });
  },
  signOut: async () => {
    if (firebaseEnabled && auth) {
      await firebaseSignOut(auth);
    }
    set({ user: null });
  },
}));

if (firebaseEnabled && auth) {
  onAuthStateChanged(auth, (firebaseUser) => {
    if (!firebaseUser) {
      useSessionStore.setState({ user: null, ready: true });
      return;
    }
    useSessionStore.setState({
      user: {
        id: firebaseUser.uid,
        name: firebaseUser.displayName ?? "Colecionador",
        city: "Sao Paulo",
      },
      ready: true,
    });
  });
}
