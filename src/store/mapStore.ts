import { create } from "zustand";

export type TradePoint = {
  id: string;
  name: string;
  type: "banca" | "shopping" | "praca" | "evento" | "comunidade";
  status: "active" | "crowded" | "official" | "event";
  hours: string;
  rating: number;
  address: string;
  checkIns: number;
  latitude: number;
  longitude: number;
};

type MapState = { points: TradePoint[] };

export const useMapStore = create<MapState>(() => ({
  points: [
    { id: "1", name: "Banca Paulista", type: "banca", status: "active", hours: "09:00-19:00", rating: 4.7, address: "Av Paulista", checkIns: 38, latitude: -23.5616, longitude: -46.6560 },
    { id: "2", name: "Shopping Centro", type: "shopping", status: "official", hours: "10:00-22:00", rating: 4.8, address: "Centro", checkIns: 65, latitude: -23.5489, longitude: -46.6388 },
    { id: "3", name: "Evento Domingo", type: "evento", status: "event", hours: "13:00-17:00", rating: 4.5, address: "Parque", checkIns: 102, latitude: -23.55, longitude: -46.63 },
    { id: "4", name: "Praca da Troca", type: "praca", status: "crowded", hours: "14:00-20:00", rating: 4.0, address: "Zona Sul", checkIns: 87, latitude: -23.57, longitude: -46.62 }
  ],
}));
