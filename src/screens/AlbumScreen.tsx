import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { AppScreen } from "@/components/AppScreen";
import { GlassCard, Pill } from "@/components/Ui";
import { tokens } from "@/styles/tokens";

type StickerCycle = 0 | 1 | 2 | 3;
type TeamDef = { name: string; code: string };
type GroupDef = { name: string; teams: TeamDef[] };

const specialSections = [
  { title: "FWC Especiais", codes: ["FWC1", "FWC2", "FWC3", "FWC4", "FWC5"] },
  { title: "FWC Bola e Paises", codes: ["FWC6", "FWC7", "FWC8", "FWC9"] },
  {
    title: "FWC Historia",
    codes: ["FWC10", "FWC11", "FWC12", "FWC13", "FWC14", "FWC15", "FWC16", "FWC17", "FWC18", "FWC19", "FWC20"],
  },
] as const;

const groups: GroupDef[] = [
  { name: "Grupo A", teams: [{ name: "Mexico", code: "MEX" }, { name: "Estados Unidos", code: "USA" }, { name: "Canada", code: "CAN" }, { name: "Nova Zelandia", code: "NZL" }] },
  { name: "Grupo B", teams: [{ name: "Argentina", code: "ARG" }, { name: "Franca", code: "FRA" }, { name: "Africa do Sul", code: "RSA" }, { name: "Coreia do Sul", code: "KOR" }] },
  { name: "Grupo C", teams: [{ name: "Brasil", code: "BRA" }, { name: "Japao", code: "JPN" }, { name: "Nigeria", code: "NGA" }, { name: "Noruega", code: "NOR" }] },
  { name: "Grupo D", teams: [{ name: "Inglaterra", code: "ENG" }, { name: "Holanda", code: "NED" }, { name: "Costa Rica", code: "CRC" }, { name: "Camaroes", code: "CMR" }] },
  { name: "Grupo E", teams: [{ name: "Espanha", code: "ESP" }, { name: "Uruguai", code: "URU" }, { name: "Egito", code: "EGY" }, { name: "Australia", code: "AUS" }] },
  { name: "Grupo F", teams: [{ name: "Alemanha", code: "GER" }, { name: "Dinamarca", code: "DEN" }, { name: "Gana", code: "GHA" }, { name: "Panama", code: "PAN" }] },
  { name: "Grupo G", teams: [{ name: "Portugal", code: "POR" }, { name: "Suica", code: "SUI" }, { name: "Ira", code: "IRN" }, { name: "Honduras", code: "HON" }] },
  { name: "Grupo H", teams: [{ name: "Belgica", code: "BEL" }, { name: "Croacia", code: "CRO" }, { name: "Tunisia", code: "TUN" }, { name: "Jamaica", code: "JAM" }] },
  { name: "Grupo I", teams: [{ name: "Italia", code: "ITA" }, { name: "Servia", code: "SRB" }, { name: "Arabia Saudita", code: "KSA" }, { name: "Iraque", code: "IRQ" }] },
  { name: "Grupo J", teams: [{ name: "Colombia", code: "COL" }, { name: "Marrocos", code: "MAR" }, { name: "Venezuela", code: "VEN" }, { name: "Emirados Arabes", code: "UAE" }] },
  { name: "Grupo K", teams: [{ name: "Chile", code: "CHI" }, { name: "Suecia", code: "SWE" }, { name: "Costa do Marfim", code: "CIV" }, { name: "Uzbequistao", code: "UZB" }] },
  { name: "Grupo L", teams: [{ name: "Paraguai", code: "PAR" }, { name: "Polonia", code: "POL" }, { name: "Argelia", code: "ALG" }, { name: "China", code: "CHN" }] },
];

const makeTeamStickers = (code: string) => Array.from({ length: 20 }, (_, i) => `${code}${i + 1}`);
const allTeamStickers = groups.flatMap((g) => g.teams.flatMap((t) => makeTeamStickers(t.code)));
const allSpecialStickers = specialSections.flatMap((s) => s.codes);
const allStickers = [...allSpecialStickers, ...allTeamStickers];

export function AlbumScreen() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "missing" | "repeats" | "complete">("all");
  const [showSpecial, setShowSpecial] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({ BRA: true });
  const [states, setStates] = useState<Record<string, StickerCycle>>({});

  const columns = width >= 1024 ? 3 : width >= 700 ? 2 : 1;
  const teamWidth = (width - 28 - 24 - (columns - 1) * 8) / columns;
  const getCycle = (id: string): StickerCycle => states[id] ?? 0;
  const nextCycle = (current: StickerCycle): StickerCycle => (current === 0 ? 1 : current === 1 ? 2 : current === 2 ? 3 : 0);

  const isCollected = (cycle: StickerCycle) => cycle === 1 || cycle === 2 || cycle === 3;
  const isRepeated = (cycle: StickerCycle) => cycle === 2;
  const totalCollected = allStickers.filter((s) => isCollected(getCycle(s))).length;
  const totalRepeated = allStickers.filter((s) => isRepeated(getCycle(s))).length;
  const globalProgress = Math.round((totalCollected / allStickers.length) * 100);

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return groups
      .map((group) => {
        const teams = group.teams.filter((team) => {
          const stickers = makeTeamStickers(team.code);
          const collected = stickers.filter((s) => isCollected(getCycle(s))).length;
          const repeated = stickers.filter((s) => isRepeated(getCycle(s))).length;
          const done = collected === 20;
          const matchesText = normalized.length === 0 || team.name.toLowerCase().includes(normalized) || team.code.toLowerCase().includes(normalized);
          if (!matchesText) return false;
          if (selectedFilter === "missing") return !done;
          if (selectedFilter === "repeats") return repeated > 0;
          if (selectedFilter === "complete") return done;
          return true;
        });
        return { ...group, teams };
      })
      .filter((g) => g.teams.length > 0);
  }, [query, selectedFilter, states]);

  const toggleSticker = (id: string) => setStates((current) => ({ ...current, [id]: nextCycle(current[id] ?? 0) }));
  const toggleTeam = (code: string) => setExpandedTeams((prev) => ({ ...prev, [code]: !prev[code] }));

  return (
    <AppScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Album Oficial</Text>
            <Text style={styles.title}>Copa do Mundo 2026</Text>
          </View>
        </View>

        <GlassCard>
          <View style={styles.progressBlock}>
            <View>
              <Text style={styles.progressLabel}>Progresso</Text>
              <Text style={styles.progressValue}>{globalProgress}%</Text>
            </View>
            <View style={styles.progressRail}>
              <View style={[styles.progressFill, { width: `${globalProgress}%` }]} />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <MiniStat label="Coletadas" value={`${totalCollected}`} tone="#DDE4EE" />
            <MiniStat label="Faltam" value={`${allStickers.length - totalCollected}`} tone="#F8D064" />
            <MiniStat label="Repetidas" value={`${totalRepeated}`} tone="#82AEFF" />
          </View>
        </GlassCard>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#92A4BD" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Pesquisar selecao (ex: Brasil)" placeholderTextColor="#6F8098" style={styles.searchInput} />
        </View>

        <View style={styles.filters}>
          <Pill label="Todas" active={selectedFilter === "all"} onPress={() => setSelectedFilter("all")} />
          <Pill label="Faltando completar" active={selectedFilter === "missing"} onPress={() => setSelectedFilter("missing")} />
          <Pill label="Com repetidas" active={selectedFilter === "repeats"} onPress={() => setSelectedFilter("repeats")} />
          <Pill label="100% completas" active={selectedFilter === "complete"} onPress={() => setSelectedFilter("complete")} />
          <Pill label="Mostrar especiais" active={showSpecial} onPress={() => setShowSpecial((v) => !v)} />
        </View>

        {showSpecial && (
          <GlassCard>
            <View style={styles.specialHeader}>
              <Text style={styles.sectionTitle}>Figurinhas Especiais FWC</Text>
            </View>
            {specialSections.map((section) => (
              <View key={section.title} style={styles.specialBlock}>
                <Text style={styles.specialTitle}>{section.title}</Text>
                <View style={styles.stickerGrid}>
                  {section.codes.map((code) => (
                    <StickerCard key={code} code={code} cycle={getCycle(code)} onPress={() => toggleSticker(code)} />
                  ))}
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        {filteredGroups.map((group) => {
          const groupStickers = group.teams.flatMap((team) => makeTeamStickers(team.code));
          const groupCollected = groupStickers.filter((s) => isCollected(getCycle(s))).length;
          const groupProgress = Math.round((groupCollected / groupStickers.length) * 100);

          return (
            <GlassCard key={group.name}>
              <View style={styles.groupHeader}>
                <Text style={styles.sectionTitle}>{group.name}</Text>
                <Text style={styles.groupPercent}>{groupProgress}%</Text>
              </View>
              <View style={styles.groupRail}>
                <View style={[styles.groupFill, { width: `${groupProgress}%` }]} />
              </View>

              <View style={styles.teamGrid}>
                {group.teams.map((team) => {
                  const stickers = makeTeamStickers(team.code);
                  const collected = stickers.filter((s) => isCollected(getCycle(s))).length;
                  const repeated = stickers.filter((s) => isRepeated(getCycle(s))).length;
                  const expanded = Boolean(expandedTeams[team.code]);
                  return (
                    <View key={team.code} style={[styles.teamCard, { width: teamWidth > 240 ? 240 : teamWidth }]}>
                      <Pressable style={styles.teamHeader} onPress={() => toggleTeam(team.code)}>
                        <Text style={styles.teamName}>{team.name}</Text>
                        <View style={styles.teamMeta}>
                          <Text style={styles.teamStat}>{collected}/20</Text>
                          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#9EB0C8" />
                        </View>
                      </Pressable>
                      {expanded && (
                        <View style={styles.stickerGrid}>
                          {stickers.map((code) => (
                            <StickerCard key={code} code={code} cycle={getCycle(code)} onPress={() => toggleSticker(code)} />
                          ))}
                        </View>
                      )}
                      {repeated > 0 && <Text style={styles.repeatLabel}>{repeated} repetidas</Text>}
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          );
        })}
      </ScrollView>
    </AppScreen>
  );
}

function StickerCard({ code, cycle, onPress }: { code: string; cycle: StickerCycle; onPress: () => void }) {
  const isCollected = cycle === 1 || cycle === 2 || cycle === 3;
  const isRepeated = cycle === 2;
  const label = code.endsWith("1") ? "Escudo" : code.endsWith("2") ? "Time" : "Jogador";
  return (
    <Pressable onPress={onPress} style={[styles.sticker, isCollected && styles.stickerCollected, isRepeated && styles.stickerRepeated]}>
      <Text style={[styles.code, isCollected && styles.codeCollected]}>{code}</Text>
      <Text style={[styles.state, isCollected && styles.stateCollected]}>{label}</Text>
      {isRepeated && <View style={styles.repeatBadge}><Text style={styles.repeatBadgeText}>x2</Text></View>}
    </Pressable>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 46,
  },
  content: {
    paddingBottom: 120,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  eyebrow: {
    color: "#8EA0B7",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.4,
  },
  progressBlock: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  progressLabel: {
    color: "#A6B2C4",
    fontSize: 12,
    fontWeight: "600",
  },
  progressValue: {
    color: "#F2F5FA",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 2,
  },
  progressRail: {
    marginTop: 8,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#182332",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2ED56B",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#253244",
    backgroundColor: "rgba(11,17,27,0.8)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  statLabel: {
    color: "#8FA0B7",
    fontSize: 11,
    fontWeight: "600",
  },
  statValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
  },
  filters: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  searchWrap: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 12,
    backgroundColor: "#090D13",
    paddingHorizontal: 10,
    height: 40,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    color: "#E8EEF7",
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
  },
  sticker: {
    width: "18%",
    aspectRatio: 0.8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#314055",
    backgroundColor: "rgba(11,17,27,0.82)",
    marginBottom: 6,
    position: "relative",
  },
  stickerCollected: {
    borderColor: "#2CFF7E",
    backgroundColor: "rgba(28,172,85,0.16)",
    shadowColor: "#2CFF7E",
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  stickerRepeated: {
    borderColor: "#6BA5FF",
    backgroundColor: "rgba(44,107,255,0.18)",
  },
  code: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#A9B6C9",
  },
  codeCollected: {
    color: "#E8FFF1",
  },
  state: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "600",
    color: "#8FA0B7",
  },
  stateCollected: {
    color: "#BEECD0",
  },
  repeatBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#2C6BFF",
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  repeatBadgeText: {
    color: "#F0F6FF",
    fontSize: 9,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#F2F5FA",
    fontSize: 15,
    fontWeight: "800",
  },
  specialHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  specialBlock: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
  },
  specialTitle: {
    color: "#F8D064",
    fontWeight: "700",
    fontSize: 12.5,
    marginBottom: 6,
  },
  groupHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupPercent: {
    color: "#C8D4E7",
    fontWeight: "700",
    fontSize: 12,
  },
  groupRail: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1A2534",
    marginHorizontal: 12,
    marginTop: 8,
    overflow: "hidden",
  },
  groupFill: {
    height: "100%",
    backgroundColor: "#2ED56B",
  },
  teamGrid: {
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  teamCard: {
    borderWidth: 1,
    borderColor: "#243346",
    borderRadius: 12,
    backgroundColor: "rgba(8,12,18,0.94)",
    padding: 8,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  teamName: {
    color: "#E4EBF5",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    paddingRight: 6,
  },
  teamMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  teamStat: {
    color: "#9CB0CA",
    fontSize: 12,
    fontWeight: "700",
  },
  repeatLabel: {
    color: "#9CC0FF",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
