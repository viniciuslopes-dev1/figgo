import { supabase, supabaseEnabled } from "@/services/supabase";
import type { TradePoint } from "@/types/tradePoint";

type TradePointRow = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  facade_image_url: string | null;
  description: string | null;
  available_days: string[] | null;
  opening_time: string;
  closing_time: string;
  created_by: string;
  created_at: string;
};

const fallbackTradePoints: TradePoint[] = [
  {
    id: "seed-1",
    name: "Shopping Eldorado",
    address: "Av. Reboucas, 3970 - Pinheiros, Sao Paulo - SP",
    latitude: -23.572262,
    longitude: -46.696594,
    facadeImageUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=80",
    description: "Encontro semanal perto da praca de alimentacao.",
    availableDays: ["Seg", "Qua", "Sab"],
    openingTime: "14:00",
    closingTime: "19:00",
    createdBy: "system",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-2",
    name: "Parque Ibirapuera",
    address: "Av. Pedro Alvares Cabral - Vila Mariana, Sao Paulo - SP",
    latitude: -23.587416,
    longitude: -46.657634,
    facadeImageUrl: "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1200&q=80",
    description: "Troca livre com repetidas da Copa e album infantil.",
    availableDays: ["Dom"],
    openingTime: "09:00",
    closingTime: "12:30",
    createdBy: "system",
    createdAt: new Date().toISOString(),
  },
];

function requireSupabase() {
  if (!supabaseEnabled || !supabase) throw new Error("Supabase nao configurado no app.");
  return supabase;
}

function parseSupabaseError(error: unknown) {
  const raw =
    typeof error === "object" && error !== null
      ? (error as { message?: string; code?: string; details?: string; hint?: string })
      : null;
  const message = raw?.message ?? (error instanceof Error ? error.message : "");
  const code = raw?.code ?? "";
  const details = raw?.details ?? "";
  const hint = raw?.hint ?? "";

  if (!message) return "Erro inesperado ao comunicar com o servidor.";
  if (message.includes("relation") && message.includes("does not exist")) {
    return "A tabela trade_points nao existe no banco. Rode o SQL de trade points no Supabase.";
  }
  if (message.toLowerCase().includes("row-level security")) {
    return "Permissao negada pelo RLS. Verifique as politicas de trade_points no Supabase.";
  }

  return [message, code ? `code=${code}` : "", details, hint].filter(Boolean).join(" | ");
}

function mapRowToTradePoint(row: TradePointRow): TradePoint {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    facadeImageUrl: row.facade_image_url ?? undefined,
    description: row.description ?? undefined,
    availableDays: row.available_days ?? [],
    openingTime: row.opening_time,
    closingTime: row.closing_time,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function fetchTradePoints() {
  if (!supabaseEnabled || !supabase) return fallbackTradePoints;

  const client = requireSupabase();
  const { data, error } = await client
    .from("trade_points")
    .select(
      "id,name,address,latitude,longitude,facade_image_url,description,available_days,opening_time,closing_time,created_by,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map((row) => mapRowToTradePoint(row as TradePointRow));
}

export async function createTradePoint(payload: Omit<TradePoint, "id" | "createdAt">) {
  if (!supabaseEnabled || !supabase) {
    return {
      ...payload,
      id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
    } as TradePoint;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("trade_points")
    .insert({
      name: payload.name,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      facade_image_url: payload.facadeImageUrl ?? null,
      description: payload.description ?? null,
      available_days: payload.availableDays,
      opening_time: payload.openingTime,
      closing_time: payload.closingTime,
      created_by: payload.createdBy,
    })
    .select(
      "id,name,address,latitude,longitude,facade_image_url,description,available_days,opening_time,closing_time,created_by,created_at",
    )
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return mapRowToTradePoint(data as TradePointRow);
}
