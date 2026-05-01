import { create } from "zustand";

type Post = { id: string; user: string; city: string; content: string; likes: number; comments: number; shares: number };
type FeedState = {
  posts: Post[];
  draft: string;
  setDraft: (value: string) => void;
  createPost: () => void;
  likePost: (id: string) => void;
};

export const useFeedStore = create<FeedState>((set, get) => ({
  draft: "",
  posts: [
    { id: "p1", user: "Lucas", city: "Sao Paulo", content: "Troco repetidas 102, 118 e 220", likes: 32, comments: 7, shares: 3 },
    { id: "p2", user: "Marina", city: "Campinas", content: "Album 90% completo, faltam 10!", likes: 71, comments: 18, shares: 8 },
  ],
  setDraft: (value) => set({ draft: value }),
  createPost: () => {
    const { draft } = get();
    if (!draft.trim()) return;
    const newPost: Post = { id: String(Date.now()), user: "Voce", city: "Minha cidade", content: draft, likes: 0, comments: 0, shares: 0 };
    set((state) => ({ posts: [newPost, ...state.posts], draft: "" }));
  },
  likePost: (id) => set((state) => ({ posts: state.posts.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)) })),
}));
