import { create } from "zustand";
import { fetchUnreadNotificationsCount } from "@/services/notificationService";

type NotificationsState = {
  unreadCount: number;
  setUnreadCount: (value: number | ((current: number) => number)) => void;
  refreshUnreadCount: (userId: string) => Promise<void>;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (value) =>
    set((state) => {
      const next = typeof value === "function" ? value(state.unreadCount) : value;
      return { unreadCount: next < 0 ? 0 : next };
    }),
  refreshUnreadCount: async (userId) => {
    try {
      const unreadCount = await fetchUnreadNotificationsCount(userId);
      set({ unreadCount });
    } catch {
      set({ unreadCount: 0 });
    }
  },
}));
