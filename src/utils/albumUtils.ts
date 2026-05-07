import { GroupDef, StickerCycle } from "@/constants/albumData";

export const makeTeamStickers = (code: string) => Array.from({ length: 20 }, (_, index) => `${code}${index + 1}`);

export const isCollected = (cycle: StickerCycle) => cycle > 0;

export const isRepeated = (cycle: StickerCycle) => cycle > 1;

export const nextCycle = (current: StickerCycle): StickerCycle => {
  return current + 1;
};

export const getGroupStickerCodes = (group: GroupDef) => group.teams.flatMap((team) => makeTeamStickers(team.code));
