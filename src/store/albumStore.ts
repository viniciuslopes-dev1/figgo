import { create } from "zustand";

type StickerState = "tenho" | "falta" | "repetida" | "especial";
type Sticker = { id: string; code: string; name: string; state: StickerState };

type AlbumState = {
  stickers: Sticker[];
  query: string;
  setQuery: (value: string) => void;
  toggleState: (id: string) => void;
  stats: { have: number; missing: number; progress: number };
};

const states: StickerState[] = ["falta", "tenho", "repetida", "especial"];

export const useAlbumStore = create<AlbumState>((set, get) => ({
  query: "",
  stickers: Array.from({ length: 200 }, (_, i) => {
    const code = String(i + 1).padStart(3, "0");
    return { id: code, code, name: `Figurinha ${code}`, state: "falta" as StickerState };
  }),
  setQuery: (value) => set({ query: value }),
  toggleState: (id) => {
    set((state) => ({
      stickers: state.stickers.map((s) => {
        if (s.id !== id) return s;
        const idx = states.indexOf(s.state);
        return { ...s, state: states[(idx + 1) % states.length] };
      }),
    }));
  },
  get stats() {
    const current = get().stickers;
    const have = current.filter((s) => s.state === "tenho").length;
    const missing = current.filter((s) => s.state === "falta").length;
    return { have, missing, progress: Math.round((have / current.length) * 100) };
  },
}));
