import AsyncStorage from "@react-native-async-storage/async-storage";
import { groups, specialSections, type StickerCycle } from "@/constants/albumData";
import { isCollected, isRepeated, makeTeamStickers } from "@/utils/albumUtils";

export type AlbumStickerStates = Record<string, StickerCycle>;

export type AlbumTotals = {
  totalStickers: number;
  totalCollected: number;
  totalRepeated: number;
  progress: number;
};

const ALBUM_STATE_STORAGE_PREFIX = "figgo_album_states_v1";

const allTeamStickers = groups.flatMap((group) => group.teams.flatMap((team) => makeTeamStickers(team.code)));
const allSpecialStickers = specialSections.flatMap((section) => section.codes);
const allStickers = [...allSpecialStickers, ...allTeamStickers];

function storageKeyForUser(userId: string) {
  return `${ALBUM_STATE_STORAGE_PREFIX}:${userId}`;
}

export function computeAlbumTotalsFromStates(states: AlbumStickerStates): AlbumTotals {
  const getCycle = (id: string): StickerCycle => states[id] ?? 0;
  const totalCollected = allStickers.filter((stickerCode) => isCollected(getCycle(stickerCode))).length;
  const totalRepeated = allStickers.filter((stickerCode) => isRepeated(getCycle(stickerCode))).length;
  const progress = Math.round((totalCollected / allStickers.length) * 100);
  return {
    totalStickers: allStickers.length,
    totalCollected,
    totalRepeated,
    progress,
  };
}

export async function loadAlbumStatesForUser(userId: string) {
  const raw = await AsyncStorage.getItem(storageKeyForUser(userId));
  if (!raw) return {} as AlbumStickerStates;
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    const normalized: AlbumStickerStates = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === 0 || value === 1 || value === 2 || value === 3) {
        normalized[key] = value;
      }
    }
    return normalized;
  } catch {
    return {} as AlbumStickerStates;
  }
}

export async function saveAlbumStatesForUser(userId: string, states: AlbumStickerStates) {
  await AsyncStorage.setItem(storageKeyForUser(userId), JSON.stringify(states));
}
