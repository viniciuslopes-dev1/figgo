import type { TradePoint } from "@/types/tradePoint";

export const TRADE_POINT_POST_PREFIX = "FIGGO_TRADE_POINT::";

export type TradePointPostPayload = {
  kind: "trade_point";
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  imageUrl?: string;
  description?: string;
};

export function serializeTradePointPost(point: TradePoint, distanceKm?: number) {
  const payload: TradePointPostPayload = {
    kind: "trade_point",
    id: point.id,
    name: point.name,
    address: point.address,
    latitude: point.latitude,
    longitude: point.longitude,
    distanceKm,
    imageUrl: point.facadeImageUrl,
    description: point.description,
  };
  return `${TRADE_POINT_POST_PREFIX}${JSON.stringify(payload)}`;
}

export function parseTradePointPost(content: string | null) {
  if (!content?.startsWith(TRADE_POINT_POST_PREFIX)) return null;

  try {
    const payload = JSON.parse(content.slice(TRADE_POINT_POST_PREFIX.length)) as Partial<TradePointPostPayload>;
    if (
      payload.kind !== "trade_point" ||
      typeof payload.id !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.address !== "string" ||
      typeof payload.latitude !== "number" ||
      typeof payload.longitude !== "number"
    ) {
      return null;
    }

    return {
      kind: "trade_point",
      id: payload.id,
      name: payload.name,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      distanceKm: typeof payload.distanceKm === "number" ? payload.distanceKm : undefined,
      imageUrl: typeof payload.imageUrl === "string" ? payload.imageUrl : undefined,
      description: typeof payload.description === "string" ? payload.description : undefined,
    } satisfies TradePointPostPayload;
  } catch {
    return null;
  }
}
