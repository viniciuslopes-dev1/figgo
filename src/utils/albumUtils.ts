import { GroupDef, StickerCycle } from "@/constants/albumData";

export const makeTeamStickers = (code: string) => Array.from({ length: 20 }, (_, index) => `${code}${index + 1}`);

export const isCollected = (cycle: StickerCycle) => cycle > 0;

export const isRepeated = (cycle: StickerCycle) => cycle === 2;

export const nextCycle = (current: StickerCycle): StickerCycle => {
  if (current === 0) return 1;
  if (current === 1) return 2;
  if (current === 2) return 3;
  return 0;
};

export const getGroupStickerCodes = (group: GroupDef) => group.teams.flatMap((team) => makeTeamStickers(team.code));
