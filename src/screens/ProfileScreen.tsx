import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppScreen } from "@/components/layout/AppScreen";
import { GlassCard } from "@/components/ui";
import { design } from "@/constants/design";
import { computeAlbumTotalsFromStates, loadAlbumStatesForUser, type AlbumTotals } from "@/services/albumProgressService";
import { fetchPostCountByUserId, fetchProfileByUserId, type UserProfile, updateCurrentUserProfileMedia } from "@/services/profileService";
import { pickImageFromLibrary, uploadProfileAvatarImage, uploadProfileCoverImage } from "@/services/storageService";
import { useSessionStore } from "@/store/sessionStore";

type ProfileTab = "posts" | "progress" | "album" | "trades";

const COVER_FALLBACK = "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1400&q=70";

export function ProfileScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, signOut, refreshProfile } = useSessionStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [updatingCover, setUpdatingCover] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [postsCount, setPostsCount] = useState(0);
  const [albumTotals, setAlbumTotals] = useState<AlbumTotals>({
    totalStickers: 980,
    totalCollected: 0,
    totalRepeated: 0,
    progress: 0,
  });

  const viewedUserId = typeof params.userId === "string" && params.userId ? params.userId : user?.id ?? null;
  const isOwnProfile = Boolean(user?.id && viewedUserId && user.id === viewedUserId);

  useEffect(() => {
    if (!viewedUserId) {
      setLoadingProfile(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoadingProfile(true);
      try {
        const [fetchedProfile, fetchedPostCount] = await Promise.all([
          fetchProfileByUserId(viewedUserId),
          fetchPostCountByUserId(viewedUserId),
        ]);
        if (!active) return;
        setProfile(fetchedProfile);
        setPostsCount(fetchedPostCount);

        if (isOwnProfile) {
          const states = await loadAlbumStatesForUser(viewedUserId);
          if (!active) return;
          setAlbumTotals(computeAlbumTotalsFromStates(states));
        } else if (
          typeof fetchedProfile?.album_total_stickers === "number" &&
          typeof fetchedProfile?.album_total_collected === "number" &&
          typeof fetchedProfile?.album_total_repeated === "number" &&
          typeof fetchedProfile?.album_progress_percent === "number"
        ) {
          setAlbumTotals({
            totalStickers: fetchedProfile.album_total_stickers,
            totalCollected: fetchedProfile.album_total_collected,
            totalRepeated: fetchedProfile.album_total_repeated,
            progress: fetchedProfile.album_progress_percent,
          });
        } else {
          setAlbumTotals((current) => ({ ...current, totalCollected: 0, totalRepeated: 0, progress: 0 }));
        }
      } catch {
        if (!active) return;
        Alert.alert("Perfil", "Nao foi possivel carregar os dados do perfil.");
      } finally {
        if (active) setLoadingProfile(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isOwnProfile, viewedUserId]);

  async function handleChangeAvatar() {
    if (!isOwnProfile || !user?.id) return;
    try {
      setUpdatingAvatar(true);
      const asset = await pickImageFromLibrary();
      if (!asset) return;
      if (!(asset.mimeType ?? "").startsWith("image/")) {
        Alert.alert("Imagem", "Apenas arquivos de imagem sao permitidos.");
        return;
      }
      const avatarUrl = await uploadProfileAvatarImage(user.id, asset.uri, asset.mimeType || undefined);
      await updateCurrentUserProfileMedia(user.id, { avatarUrl });
      await refreshProfile();
      setProfile(await fetchProfileByUserId(user.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel atualizar a foto de perfil.";
      Alert.alert("Perfil", message);
    } finally {
      setUpdatingAvatar(false);
    }
  }

  async function handleChangeCover() {
    if (!isOwnProfile || !user?.id) return;
    try {
      setUpdatingCover(true);
      const asset = await pickImageFromLibrary();
      if (!asset) return;
      if (!(asset.mimeType ?? "").startsWith("image/")) {
        Alert.alert("Imagem", "Apenas arquivos de imagem sao permitidos.");
        return;
      }
      const coverUrl = await uploadProfileCoverImage(user.id, asset.uri, asset.mimeType || undefined);
      await updateCurrentUserProfileMedia(user.id, { coverUrl });
      setProfile(await fetchProfileByUserId(user.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel atualizar a capa.";
      Alert.alert("Perfil", message);
    } finally {
      setUpdatingCover(false);
    }
  }

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  const profileName = profile?.full_name?.trim() || user?.name || "Colecionador";
  const username = profile?.username?.trim() || user?.username?.trim() || (user?.email ? user.email.split("@")[0] : "figgo");
  const avatarUrl = profile?.avatar_url ?? null;
  const coverUrl = profile?.cover_url ?? null;
  const followersCount = profile?.followers_count ?? 0;
  const followingCount = profile?.following_count ?? 0;
  const missingCount = Math.max(0, albumTotals.totalStickers - albumTotals.totalCollected);
  const initials = profileName.slice(0, 2).toUpperCase();

  const stats = useMemo(
    () => [
      { label: "Seguidores", value: `${followersCount}` },
      { label: "Seguindo", value: `${followingCount}` },
      { label: "Publicacoes", value: `${postsCount}` },
      { label: "Album", value: `${albumTotals.progress}%` },
    ],
    [albumTotals.progress, followersCount, followingCount, postsCount],
  );

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <ImageBackground source={{ uri: coverUrl || COVER_FALLBACK }} style={[styles.cover, { paddingTop: insets.top + 10 }]} imageStyle={styles.coverImage}>
            <View style={styles.coverOverlay} />
            <View style={styles.topActions}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandText}>FigGo</Text>
              </View>
              <Pressable style={styles.roundIconButton} onPress={() => Alert.alert("Perfil", "Configuracoes em breve.")}>
                <Ionicons name="settings-outline" size={21} color="#F2F7FF" />
              </Pressable>
            </View>

            {isOwnProfile && (
              <Pressable style={styles.coverButton} onPress={handleChangeCover} disabled={updatingCover}>
                {updatingCover ? <ActivityIndicator size="small" color="#E9F2FF" /> : <Ionicons name="images-outline" size={15} color="#E9F2FF" />}
                <Text style={styles.coverButtonText}>{updatingCover ? "Atualizando..." : "Editar capa"}</Text>
              </Pressable>
            )}
          </ImageBackground>

          <View style={styles.profilePanel}>
            <Pressable style={styles.avatarWrap} onPress={handleChangeAvatar} disabled={!isOwnProfile || updatingAvatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="camera-outline" size={28} color="#A7B4C7" />
                  <Text style={styles.avatarFallbackText}>{isOwnProfile ? "Adicionar foto" : initials}</Text>
                </View>
              )}
              {isOwnProfile && (
                <View style={styles.avatarBadge}>
                  {updatingAvatar ? <ActivityIndicator size="small" color="#07160D" /> : <Ionicons name="camera-outline" size={13} color="#07160D" />}
                </View>
              )}
            </Pressable>

            <Text style={styles.name} numberOfLines={2}>{profileName}</Text>
            <Text style={styles.username}>@{username}</Text>

            <View style={styles.statsRow}>
              {stats.map((stat) => (
                <View key={stat.label} style={styles.statItem}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.shareButton}>
                <Ionicons name="share-social-outline" size={23} color="#E9F2FF" />
              </Pressable>
              <Pressable style={styles.editButton} onPress={() => Alert.alert("Perfil", "Edicao de dados textuais em breve.")}>
                <Text style={styles.editButtonText}>Editar perfil</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <ProfileTabButton label="Publicacoes" active={activeTab === "posts"} onPress={() => setActiveTab("posts")} />
          <ProfileTabButton label="Progresso" active={activeTab === "progress"} onPress={() => setActiveTab("progress")} />
          <ProfileTabButton label="Album" active={activeTab === "album"} onPress={() => setActiveTab("album")} />
          <ProfileTabButton label="Trocas" active={activeTab === "trades"} onPress={() => setActiveTab("trades")} />
        </View>

        {activeTab === "progress" || activeTab === "album" ? (
          <Pressable style={styles.sectionWrap} onPress={() => router.push("/(tabs)/album")}>
            <GlassCard>
              <View style={styles.albumCard}>
                <View style={styles.albumHeader}>
                  <View>
                    <Text style={styles.cardEyebrow}>Album Copa 2026</Text>
                    <Text style={styles.albumTitle}>Progresso publico</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#BFD0E6" />
                </View>
                <Text style={styles.albumPercent}>{albumTotals.progress}% completo</Text>
                <View style={styles.albumRail}>
                  <View style={[styles.albumFill, { width: `${albumTotals.progress}%` }]} />
                </View>
                <View style={styles.albumMetaRow}>
                  <Text style={styles.albumMeta}>Obtidas: {albumTotals.totalCollected}</Text>
                  <Text style={styles.albumMeta}>Faltam: {missingCount}</Text>
                  <Text style={styles.albumMeta}>Repetidas: {albumTotals.totalRepeated}</Text>
                </View>
              </View>
            </GlassCard>
          </Pressable>
        ) : (
          <View style={styles.sectionWrap}>
            <GlassCard>
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name={activeTab === "posts" ? "albums-outline" : "swap-horizontal-outline"} size={22} color="#D8E4F5" />
                </View>
                <Text style={styles.emptyTitle}>{activeTab === "posts" ? "Publicacoes do colecionador" : "Trocas do colecionador"}</Text>
                <Text style={styles.emptyText}>
                  {activeTab === "posts"
                    ? "Os posts, conquistas e cards de progresso aparecem aqui conforme o feed evolui."
                    : "Pedidos e pontos de troca ficarao reunidos aqui quando essa area estiver conectada."}
                </Text>
              </View>
            </GlassCard>
          </View>
        )}

        {isOwnProfile && (
          <Pressable onPress={handleLogout} style={styles.logoutBtn} disabled={authLoading}>
            <Ionicons name="log-out-outline" size={16} color="#FFB2B2" />
            <Text style={styles.logoutText}>{authLoading ? "Saindo..." : "Sair da conta"}</Text>
          </Pressable>
        )}

        {loadingProfile && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={design.colors.green} />
            <Text style={styles.loadingText}>Carregando perfil...</Text>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function ProfileTabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {active && <View style={styles.tabUnderline} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 120,
  },
  heroWrap: {
    backgroundColor: "#030507",
  },
  cover: {
    height: 270,
    justifyContent: "space-between",
  },
  coverImage: {
    resizeMode: "cover",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,5,8,0.58)",
  },
  topActions: {
    zIndex: 2,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: "center",
  },
  brandText: {
    color: "#F6FAFF",
    fontSize: 15,
    fontWeight: "900",
  },
  roundIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.64)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverButton: {
    zIndex: 2,
    alignSelf: "flex-end",
    marginRight: 16,
    marginBottom: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(0,0,0,0.58)",
    paddingHorizontal: 12,
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  coverButtonText: {
    color: "#E9F2FF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  profilePanel: {
    marginTop: -62,
    paddingHorizontal: 16,
    paddingBottom: 18,
    alignItems: "center",
  },
  avatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "#0A0F16",
    backgroundColor: "#101927",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  avatarFallbackText: {
    color: "#A7B4C7",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  avatarBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: design.colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 38,
  },
  username: {
    color: "#B8C8DC",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 3,
  },
  statsRow: {
    width: "100%",
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    color: "#E3ECF8",
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 5,
  },
  actionRow: {
    width: "100%",
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  shareButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.68)",
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.76)",
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  tabsRow: {
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#030507",
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 78,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabText: {
    color: "#707B8B",
    fontSize: 14,
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabUnderline: {
    marginTop: 10,
    width: 64,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  sectionWrap: {
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  albumCard: {
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  albumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardEyebrow: {
    color: "#95A8C0",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  albumTitle: {
    color: "#F4F8FF",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  albumPercent: {
    marginTop: 8,
    color: "#9BFFBE",
    fontSize: 26,
    fontWeight: "900",
  },
  albumRail: {
    marginTop: 11,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#182332",
    overflow: "hidden",
  },
  albumFill: {
    height: "100%",
    backgroundColor: design.colors.green,
  },
  albumMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  albumMeta: {
    color: "#C3D2E7",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    minHeight: 190,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#F4F8FF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 16,
  },
  emptyText: {
    color: "#9FB0C6",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 7,
  },
  logoutBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#452525",
    backgroundColor: "#1A1012",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    marginHorizontal: 12,
  },
  logoutText: {
    color: "#FFB2B2",
    fontSize: 13.5,
    fontWeight: "700",
  },
  loadingWrap: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loadingText: {
    color: "#97A9C1",
    fontSize: 12.5,
    fontWeight: "600",
  },
});
