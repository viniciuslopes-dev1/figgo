import { useEffect, useMemo, useState } from "react";
import { GroupDef, groups, specialSections, StickerCycle } from "@/constants/albumData";
import { computeAlbumTotalsFromStates, loadAlbumStatesForUser, saveAlbumStatesForUser } from "@/services/albumProgressService";
import { upsertAlbumProgressSnapshot } from "@/services/profileService";
import { useSessionStore } from "@/store/sessionStore";
import { getGroupStickerCodes, isCollected, isRepeated, makeTeamStickers, nextCycle } from "@/utils/albumUtils";

export type AlbumFilter = "all" | "specials" | "missing" | "repeats" | "complete";

const allTeamStickers = groups.flatMap((group) => group.teams.flatMap((team) => makeTeamStickers(team.code)));
const allSpecialStickers = specialSections.flatMap((section) => section.codes);
const allStickers = [...allSpecialStickers, ...allTeamStickers];

export function useAlbumCollection() {
  const user = useSessionStore((state) => state.user);
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<AlbumFilter>("all");
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({ BRA: true });
  const [states, setStates] = useState<Record<string, StickerCycle>>({});
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const getCycle = (id: string): StickerCycle => states[id] ?? 0;

  const totals = useMemo(() => computeAlbumTotalsFromStates(states), [states]);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (selectedFilter === "specials") return [];

    return groups
      .map((group) => {
        const teams = group.teams.filter((team) => {
          const stickerCodes = makeTeamStickers(team.code);
          const collected = stickerCodes.filter((stickerCode) => isCollected(getCycle(stickerCode))).length;
          const repeated = stickerCodes.filter((stickerCode) => isRepeated(getCycle(stickerCode))).length;
          const done = collected === 20;
          const matchesText =
            normalizedQuery.length === 0 ||
            team.name.toLowerCase().includes(normalizedQuery) ||
            team.code.toLowerCase().includes(normalizedQuery);

          if (!matchesText) return false;
          if (selectedFilter === "missing") return !done;
          if (selectedFilter === "repeats") return repeated > 0;
          if (selectedFilter === "complete") return done;
          return true;
        });
        return { ...group, teams };
      })
      .filter((group) => group.teams.length > 0);
  }, [query, selectedFilter, states]);

  const filteredSpecialStickers = useMemo(() => {
    if (selectedFilter === "complete") return [];
    if (selectedFilter === "repeats") {
      return allSpecialStickers.filter((code) => isRepeated(getCycle(code)));
    }
    if (selectedFilter === "missing") {
      return allSpecialStickers.filter((code) => !isCollected(getCycle(code)));
    }
    return allSpecialStickers;
  }, [selectedFilter, states]);

  const exactStickerSearch = useMemo(() => {
    const normalized = query.trim().toUpperCase();
    if (!normalized) return null;

    const compact = normalized.replace(/\s+/g, "");
    const match = compact.match(/^([A-Z]{3}|FWC)(\d{1,2})$/);
    if (!match) return null;

    const code = `${match[1]}${Number(match[2])}`;
    if (!allStickers.includes(code)) return null;

    const cycle = getCycle(code);
    return {
      code,
      cycle,
      hasSticker: isCollected(cycle),
      isRepeated: isRepeated(cycle),
    };
  }, [query, states]);

  const setStickerAmount = (id: string, amount: number) => {
    const normalizedAmount = Math.max(0, Math.floor(amount));
    setStates((currentState) => {
      const nextState = { ...currentState };
      if (normalizedAmount <= 0) {
        delete nextState[id];
      } else {
        nextState[id] = normalizedAmount;
      }
      return nextState;
    });
  };

  const incrementSticker = (id: string) => {
    setStates((currentState) => ({
      ...currentState,
      [id]: nextCycle(currentState[id] ?? 0),
    }));
  };

  const decrementSticker = (id: string) => {
    setStates((currentState) => {
      const currentAmount = currentState[id] ?? 0;
      if (currentAmount <= 0) return currentState;
      const nextAmount = currentAmount - 1;
      const nextState = { ...currentState };
      if (nextAmount <= 0) {
        delete nextState[id];
      } else {
        nextState[id] = nextAmount;
      }
      return nextState;
    });
  };

  const toggleTeam = (code: string) => {
    setExpandedTeams((current) => ({ ...current, [code]: !current[code] }));
  };

  const getGroupProgress = (group: GroupDef) => {
    const stickerCodes = getGroupStickerCodes(group);
    if (stickerCodes.length === 0) return 0;
    const collected = stickerCodes.filter((stickerCode) => isCollected(getCycle(stickerCode))).length;
    return Math.round((collected / stickerCodes.length) * 100);
  };

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setStates({});
      setLoadedUserId(null);
      return;
    }

    let active = true;
    void (async () => {
      const loadedStates = await loadAlbumStatesForUser(userId);
      if (!active) return;
      setStates(loadedStates);
      setLoadedUserId(userId);
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || loadedUserId !== user.id) return;
    void saveAlbumStatesForUser(user.id, states);
  }, [loadedUserId, states, user?.id]);

  useEffect(() => {
    if (!user?.id || loadedUserId !== user.id) return;
    void upsertAlbumProgressSnapshot(user.id, totals);
  }, [loadedUserId, totals, user?.id]);

  return {
    query,
    setQuery,
    selectedFilter,
    setSelectedFilter,
    showSpecial: selectedFilter === "all" || selectedFilter === "specials",
    expandedTeams,
    getCycle,
    filteredGroups,
    filteredSpecialStickers,
    exactStickerSearch,
    totals,
    setStickerAmount,
    incrementSticker,
    decrementSticker,
    toggleTeam,
    getGroupProgress,
  };
}
