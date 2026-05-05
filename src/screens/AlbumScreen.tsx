import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { specialSections, StickerCycle } from "@/constants/albumData";
import { design } from "@/constants/design";
import { AppScreen } from "@/components/layout/AppScreen";
import { GlassCard, Pill } from "@/components/ui";
import { useAlbumCollection } from "@/hooks/useAlbumCollection";
import { createPost } from "@/services/feedService";
import { useSessionStore } from "@/store/sessionStore";
import { serializeAlbumProgressPost } from "@/utils/albumProgressPost";
import { isCollected, isRepeated, makeTeamStickers } from "@/utils/albumUtils";

export function AlbumScreen() {
  const user = useSessionStore((state) => state.user);
  const [shareVisible, setShareVisible] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [sharing, setSharing] = useState(false);
  const {
    query,
    setQuery,
    selectedFilter,
    setSelectedFilter,
    showSpecial,
    expandedTeams,
    getCycle,
    filteredGroups,
    filteredSpecialStickers,
    exactStickerSearch,
    totals,
    toggleSticker,
    toggleTeam,
    getGroupProgress,
  } = useAlbumCollection();

  const allSpecialCodes = specialSections.flatMap((section) => section.codes);
  const specialCollected = allSpecialCodes.filter((code) => isCollected(getCycle(code))).length;
  const specialRepeated = allSpecialCodes.filter((code) => isRepeated(getCycle(code))).length;
  const specialMissing = allSpecialCodes.length - specialCollected;
  const specialProgress = Math.round((specialCollected / allSpecialCodes.length) * 100);
  const specialVisibleCodes = filteredSpecialStickers;

  async function handleShareProgress() {
    if (!user?.id) {
      Alert.alert("Login necessario", "Entre na sua conta para compartilhar seu album.");
      return;
    }

    setSharing(true);
    try {
      await createPost({
        userId: user.id,
        content: serializeAlbumProgressPost({
          kind: "album_progress",
          caption: shareCaption,
          progress: totals.progress,
          totalCollected: totals.totalCollected,
          totalStickers: totals.totalStickers,
          totalRepeated: totals.totalRepeated,
          missing: totals.totalStickers - totals.totalCollected,
        }),
      });
      setShareCaption("");
      setShareVisible(false);
      Alert.alert("Album", "Progresso publicado no feed.");
      router.push("/(tabs)/feed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel publicar agora.";
      Alert.alert("Publicacao", message);
    } finally {
      setSharing(false);
    }
  }

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
            <View style={styles.progressTop}>
              <View>
                <Text style={styles.progressLabel}>Progresso</Text>
                <Text style={styles.progressValue}>{totals.progress}%</Text>
              </View>
              <Pressable style={styles.shareButton} onPress={() => setShareVisible(true)}>
                <Ionicons name="share-social-outline" size={17} color="#061D0D" />
                <Text style={styles.shareButtonText}>Postar</Text>
              </Pressable>
            </View>
            <View style={styles.progressRail}>
              <View style={[styles.progressFill, { width: `${totals.progress}%` }]} />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <MiniStat label="Coletadas" value={`${totals.totalCollected}`} tone="#DDE4EE" />
            <MiniStat label="Faltam" value={`${totals.totalStickers - totals.totalCollected}`} tone="#F8D064" />
            <MiniStat label="Repetidas" value={`${totals.totalRepeated}`} tone="#82AEFF" />
          </View>
        </GlassCard>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#92A4BD" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Pesquisar selecao ou figurinha (ex: Brasil, MEX 10)" placeholderTextColor="#6F8098" style={styles.searchInput} />
        </View>

        {exactStickerSearch && (
          <GlassCard>
            <View style={styles.exactSearchResult}>
              <View>
                <Text style={styles.exactSearchCode}>{exactStickerSearch.code}</Text>
                <Text style={styles.exactSearchStatus}>
                  {exactStickerSearch.hasSticker ? (exactStickerSearch.isRepeated ? "Voce tem repetida" : "Voce ja tem") : "Voce ainda nao tem"}
                </Text>
              </View>
              <StickerCard code={exactStickerSearch.code} cycle={exactStickerSearch.cycle} onPress={() => toggleSticker(exactStickerSearch.code)} />
            </View>
          </GlassCard>
        )}

        <View style={styles.filters}>
          <Pill label="Todas" active={selectedFilter === "all"} onPress={() => setSelectedFilter("all")} />
          <Pill label="Especiais" active={selectedFilter === "specials"} onPress={() => setSelectedFilter("specials")} />
          <Pill label="Faltando completar" active={selectedFilter === "missing"} onPress={() => setSelectedFilter("missing")} />
          <Pill label="Com repetidas" active={selectedFilter === "repeats"} onPress={() => setSelectedFilter("repeats")} />
          <Pill label="100% completas" active={selectedFilter === "complete"} onPress={() => setSelectedFilter("complete")} />
        </View>

        {showSpecial && selectedFilter !== "complete" && (
          <GlassCard>
            <View style={styles.specialHeader}>
              <View>
                <Text style={styles.sectionTitle}>Figurinhas Especiais FWC</Text>
                <Text style={styles.teamSubline}>FWC - {specialProgress}% completo</Text>
              </View>
              <Text style={styles.teamStat}>{specialCollected}/{allSpecialCodes.length}</Text>
            </View>
            <View style={styles.teamDetailStats}>
              <MiniStat label="Adicionadas" value={`${specialCollected}`} tone="#DDE4EE" />
              <MiniStat label="Faltam" value={`${specialMissing}`} tone="#F8D064" />
              <MiniStat label="Repetidas" value={`${specialRepeated}`} tone="#82AEFF" />
            </View>
            <View style={styles.teamDetailRail}>
              <View style={[styles.teamDetailFill, { width: `${specialProgress}%` }]} />
            </View>
            {specialSections.map((section) => {
              const sectionCodes = section.codes.filter((code) => specialVisibleCodes.includes(code));
              if (!sectionCodes.length) return null;
              return (
                <View key={section.title} style={styles.specialBlock}>
                  <Text style={styles.specialTitle}>{section.title}</Text>
                  <View style={styles.stickerGrid}>
                    {sectionCodes.map((code) => (
                      <StickerCard key={code} code={code} cycle={getCycle(code)} onPress={() => toggleSticker(code)} />
                    ))}
                  </View>
                </View>
              );
            })}
          </GlassCard>
        )}

        {filteredGroups.map((group) => {
          const groupProgress = getGroupProgress(group);

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
                  const missing = stickers.length - collected;
                  const teamProgress = Math.round((collected / stickers.length) * 100);
                  const expanded = Boolean(expandedTeams[team.code]);
                  const visibleStickers = selectedFilter === "missing" ? stickers.filter((code) => !isCollected(getCycle(code))) : stickers;
                  return (
                    <View
                      key={team.code}
                      style={[
                        styles.teamCard,
                        expanded ? styles.teamCardExpanded : styles.teamCardCompact,
                      ]}
                    >
                      <Pressable style={styles.teamHeader} onPress={() => toggleTeam(team.code)}>
                        <View style={styles.teamTitleWrap}>
                          <Text style={styles.teamName}>{team.name}</Text>
                          {expanded && <Text style={styles.teamSubline}>{team.code} - {teamProgress}% completo</Text>}
                        </View>
                        <View style={styles.teamMeta}>
                          <Text style={styles.teamStat}>{collected}/20</Text>
                          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#9EB0C8" />
                        </View>
                      </Pressable>
                      {expanded && (
                        <View style={styles.teamDetail}>
                          <View style={styles.teamDetailStats}>
                            <MiniStat label="Adicionadas" value={`${collected}`} tone="#DDE4EE" />
                            <MiniStat label="Faltam" value={`${missing}`} tone="#F8D064" />
                            <MiniStat label="Repetidas" value={`${repeated}`} tone="#82AEFF" />
                          </View>
                          <View style={styles.teamDetailRail}>
                            <View style={[styles.teamDetailFill, { width: `${teamProgress}%` }]} />
                          </View>
                          <View style={styles.stickerGrid}>
                            {visibleStickers.map((code) => (
                              <StickerCard key={code} code={code} cycle={getCycle(code)} onPress={() => toggleSticker(code)} />
                            ))}
                          </View>
                        </View>
                      )}
                      {!expanded && repeated > 0 && <Text style={styles.repeatLabel}>{repeated} repetidas</Text>}
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          );
        })}
      </ScrollView>

      <Modal visible={shareVisible} transparent animationType="fade" onRequestClose={() => setShareVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.shareModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Compartilhar progresso</Text>
              <Pressable onPress={() => setShareVisible(false)} disabled={sharing}>
                <Text style={styles.modalClose}>Cancelar</Text>
              </Pressable>
            </View>
            <View style={styles.progressPostPreview}>
              <Text style={styles.previewKicker}>Album FigGo</Text>
              <Text style={styles.previewTitle}>Meu album esta {totals.progress}% completo</Text>
              <View style={styles.previewRail}>
                <View style={[styles.previewFill, { width: `${totals.progress}%` }]} />
              </View>
              <Text style={styles.previewMeta}>
                {totals.totalCollected}/{totals.totalStickers} figurinhas - {totals.totalRepeated} repetidas
              </Text>
              <Text style={styles.previewMissing}>Faltam {totals.totalStickers - totals.totalCollected} figurinhas para completar</Text>
            </View>
            <TextInput
              value={shareCaption}
              onChangeText={setShareCaption}
              placeholder="Legenda opcional"
              placeholderTextColor={design.colors.textMuted}
              multiline
              editable={!sharing}
              style={styles.captionInput}
            />
            <Pressable style={styles.publishButton} onPress={handleShareProgress} disabled={sharing}>
              <Text style={styles.publishButtonText}>{sharing ? "Publicando..." : "Publicar no feed"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    color: design.colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.4,
  },
  progressBlock: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  shareButton: {
    minHeight: 36,
    borderRadius: 12,
    backgroundColor: design.colors.green,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareButtonText: {
    color: "#061D0D",
    fontSize: 13,
    fontWeight: "800",
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
    borderColor: design.colors.border,
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
    color: design.colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  specialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  teamCardCompact: {
    width: "100%",
  },
  teamCardExpanded: {
    width: "100%",
    borderColor: "rgba(44,255,126,0.34)",
    backgroundColor: "rgba(9,15,23,0.96)",
    padding: 10,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  teamTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  teamName: {
    color: "#E4EBF5",
    fontSize: 13,
    fontWeight: "700",
  },
  teamSubline: {
    color: "#8FA0B7",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
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
  teamDetail: {
    gap: 10,
  },
  teamDetailStats: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  teamDetailRail: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#172435",
    overflow: "hidden",
  },
  teamDetailFill: {
    height: "100%",
    backgroundColor: design.colors.green,
  },
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.56)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  shareModal: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(156,176,202,0.22)",
    backgroundColor: "rgba(10,16,25,0.98)",
    padding: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#F6FAFF",
    fontSize: 17,
    fontWeight: "800",
  },
  modalClose: {
    color: "#C9D9FF",
    fontSize: 13.5,
    fontWeight: "600",
  },
  progressPostPreview: {
    borderWidth: 1,
    borderColor: "rgba(245,197,66,0.42)",
    borderRadius: 16,
    backgroundColor: "rgba(21,25,24,0.96)",
    padding: 14,
  },
  previewKicker: {
    color: "#F8D064",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  previewTitle: {
    color: "#F7F7F8",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 5,
  },
  previewRail: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#1B2635",
    marginTop: 12,
    overflow: "hidden",
  },
  previewFill: {
    height: "100%",
    backgroundColor: design.colors.green,
  },
  previewMeta: {
    color: "#DDE4EE",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  previewMissing: {
    color: "#9CB0CA",
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 4,
  },
  captionInput: {
    minHeight: 74,
    color: design.colors.text,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(156,176,202,0.2)",
    backgroundColor: "rgba(14,23,34,0.74)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    marginTop: 12,
    fontSize: 14,
  },
  publishButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: design.colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  publishButtonText: {
    color: "#06220F",
    fontSize: 14,
    fontWeight: "800",
  },
  exactSearchResult: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  exactSearchCode: {
    color: "#F7F7F8",
    fontSize: 20,
    fontWeight: "900",
  },
  exactSearchStatus: {
    color: "#9CB0CA",
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 4,
  },
});
