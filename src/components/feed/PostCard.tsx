import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Circle, Path, Svg } from "react-native-svg";
import { design } from "@/constants/design";
import { parseAlbumProgressPost } from "@/utils/albumProgressPost";
import { parseTradePointPost } from "@/utils/tradePointPost";

export type FeedItem = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  isMine: boolean;
};

type Props = {
  post: FeedItem;
  onToggleLike: (post: FeedItem) => void;
  onOpenComments: (post: FeedItem) => void;
  onDeletePost: (post: FeedItem) => void;
};

export function PostCard({ post, onToggleLike, onOpenComments, onDeletePost }: Props) {
  const albumProgressPost = parseAlbumProgressPost(post.content);
  const tradePointPost = parseTradePointPost(post.content);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userWrap}>
          {post.avatarUrl ? <Image source={{ uri: post.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback} />}
          <View>
            <Text style={styles.user}>{post.username}</Text>
            <Text style={styles.time}>{formatRelative(post.createdAt)}</Text>
          </View>
        </View>
        {post.isMine ? (
          <Pressable onPress={() => onDeletePost(post)}>
            <Text style={styles.delete}>Excluir</Text>
          </Pressable>
        ) : null}
      </View>
      {tradePointPost ? (
        <TradePointCard payload={tradePointPost} />
      ) : albumProgressPost ? (
        <AlbumProgressCard username={post.username} payload={albumProgressPost} />
      ) : post.content ? (
        <Text style={styles.content}>{post.content}</Text>
      ) : null}
      {post.imageUrl && !tradePointPost ? <Image source={{ uri: post.imageUrl }} style={styles.photo} /> : null}
      <View style={styles.row}>
        <Pressable style={styles.actionButton} onPress={() => onToggleLike(post)}>
          <StickerLikeTransition liked={post.likedByMe} />
          <Text style={[styles.count, post.likedByMe && styles.countActive]}>{post.likesCount}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => onOpenComments(post)}>
          <Ionicons name="chatbubble-ellipses-outline" size={19} color="#D5DFED" />
          <Text style={styles.count}>{post.commentsCount}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TradePointCard({ payload }: { payload: NonNullable<ReturnType<typeof parseTradePointPost>> }) {
  return (
    <Pressable
      style={styles.tradePointCard}
      onPress={() =>
        router.push({
          pathname: "/(tabs)/mapa",
          params: {
            pointId: payload.id,
            lat: `${payload.latitude}`,
            lng: `${payload.longitude}`,
          },
        })
      }
    >
      {payload.imageUrl ? <Image source={{ uri: payload.imageUrl }} style={styles.tradePointImage} /> : null}
      <View style={styles.tradePointBody}>
        <View style={styles.tradePointTop}>
          <View style={styles.tradePointKickerWrap}>
            <Ionicons name="swap-horizontal" size={13} color="#06220F" />
            <Text style={styles.tradePointKicker}>Ponto de troca</Text>
          </View>
          <Ionicons name="map-outline" size={18} color="#DDE8F7" />
        </View>
        <Text style={styles.tradePointTitle}>{payload.name}</Text>
        <Text style={styles.tradePointAddress}>{payload.address}</Text>
        {typeof payload.distanceKm === "number" ? (
          <Text style={styles.tradePointDistance}>{formatDistance(payload.distanceKm)} de voce</Text>
        ) : null}
        {payload.description ? <Text style={styles.tradePointDescription}>{payload.description}</Text> : null}
      </View>
    </Pressable>
  );
}

function AlbumProgressCard({
  username,
  payload,
}: {
  username: string;
  payload: NonNullable<ReturnType<typeof parseAlbumProgressPost>>;
}) {
  return (
    <View style={styles.albumProgressCard}>
      <View style={styles.albumProgressTop}>
        <View>
          <Text style={styles.albumProgressKicker}>Progresso do album</Text>
          <Text style={styles.albumProgressOwner}>{username}</Text>
        </View>
        <View style={styles.albumProgressSeal}>
          <Text style={styles.albumProgressSealText}>{payload.progress}%</Text>
        </View>
      </View>
      <Text style={styles.albumProgressTitle}>Meu album esta {payload.progress}% completo</Text>
      <View style={styles.albumProgressRail}>
        <View style={[styles.albumProgressFill, { width: `${payload.progress}%` }]} />
      </View>
      <View style={styles.albumProgressStats}>
        <View style={styles.albumProgressStat}>
          <Text style={styles.albumProgressStatValue}>{payload.totalCollected}</Text>
          <Text style={styles.albumProgressStatLabel}>obtidas</Text>
        </View>
        <View style={styles.albumProgressStat}>
          <Text style={styles.albumProgressStatValue}>{payload.totalStickers}</Text>
          <Text style={styles.albumProgressStatLabel}>total</Text>
        </View>
        <View style={styles.albumProgressStat}>
          <Text style={styles.albumProgressStatValue}>{payload.totalRepeated}</Text>
          <Text style={styles.albumProgressStatLabel}>repetidas</Text>
        </View>
      </View>
      <Text style={styles.albumProgressMissing}>Faltam {payload.missing} figurinhas para completar</Text>
      {payload.caption ? <Text style={styles.albumProgressCaption}>{payload.caption}</Text> : null}
    </View>
  );
}

function StickerLikeTransition({ liked }: { liked: boolean }) {
  const foldProgress = useRef(new Animated.Value(liked ? 1 : 0)).current;
  const revealProgress = useRef(new Animated.Value(liked ? 1 : 0)).current;

  useEffect(() => {
    foldProgress.stopAnimation();
    revealProgress.stopAnimation();

    if (liked) {
      revealProgress.setValue(0);
      Animated.sequence([
        Animated.timing(foldProgress, {
          toValue: 1,
          duration: 230,
          easing: Easing.bezier(0.2, 0.78, 0.22, 1),
          useNativeDriver: true,
        }),
        Animated.timing(revealProgress, {
          toValue: 1,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(foldProgress, {
        toValue: 0,
        duration: 260,
        easing: Easing.bezier(0.24, 0.7, 0.24, 1),
        useNativeDriver: true,
      }),
      Animated.timing(revealProgress, {
        toValue: 0,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [liked, foldProgress, revealProgress]);

  const topOpacity = foldProgress.interpolate({
    inputRange: [0, 0.84, 1],
    outputRange: [1, 0.82, 0],
  });
  const topTranslateY = foldProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });
  const topTranslateX = foldProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.8],
  });
  const topRotate = foldProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "74deg"],
  });
  const topTilt = foldProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "9deg"],
  });
  const topScaleY = foldProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
  });
  const topShade = foldProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });
  const activeOpacity = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const activeScale = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1],
  });
  const activeTranslateY = revealProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0],
  });

  return (
    <View style={styles.stickerWrap}>
      <Animated.View
        style={[
          styles.stickerLayer,
          { opacity: activeOpacity, transform: [{ scale: activeScale }, { translateY: activeTranslateY }] },
        ]}
      >
        <ActiveLikeStickerSvg />
      </Animated.View>
      <Animated.View
        style={[
          styles.stickerLayer,
          {
            opacity: topOpacity,
            transform: [
              { perspective: 340 },
              { translateX: 11 },
              { translateY: -8 },
              { rotateX: topRotate },
              { rotateZ: topTilt },
              { scaleY: topScaleY },
              { translateX: -11 },
              { translateY: 8 },
              { translateX: topTranslateX },
              { translateY: topTranslateY },
            ],
          },
        ]}
      >
        <View style={styles.topStickerWrap}>
          <InactiveLikeStickerSvg />
          <Animated.View pointerEvents="none" style={[styles.foldShade, { opacity: topShade }]} />
        </View>
      </Animated.View>
    </View>
  );
}

function InactiveLikeStickerSvg() {
  return (
    <Svg width={22} height={22} viewBox="0 0 64 64" fill="none">
      <Path
        d="M16 6H40L54 20V52C54 55.3 51.3 58 48 58H16C12.7 58 10 55.3 10 52V12C10 8.7 12.7 6 16 6Z"
        fill="#FFFFFF"
        stroke="#1F2937"
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <Path d="M40 6V16C40 18.2 41.8 20 44 20H54L40 6Z" fill="#1F2937" />
      <Circle cx={32} cy={27} r={7} fill="#F3F4F6" stroke="#1F2937" strokeWidth={3} />
      <Path
        d="M18 53C19.7 42.8 25 37 32 37C39 37 44.3 42.8 46 53"
        fill="#F3F4F6"
        stroke="#1F2937"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ActiveLikeStickerSvg() {
  return (
    <Svg width={22} height={22} viewBox="0 0 64 64" fill="none">
      <Path
        d="M16 6H40L54 20V52C54 55.3 51.3 58 48 58H16C12.7 58 10 55.3 10 52V12C10 8.7 12.7 6 16 6Z"
        fill="#22C55E"
        stroke="#14532D"
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <Path d="M40 6V16C40 18.2 41.8 20 44 20H54L40 6Z" fill="#14532D" />
      <Circle cx={32} cy={27} r={7} fill="#FFFFFF" />
      <Path d="M18 53C19.7 42.8 25 37 32 37C39 37 44.3 42.8 46 53" fill="#FFFFFF" />
    </Svg>
  );
}

function formatRelative(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm >= 10 ? 0 : 1)} km`;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(156,176,202,0.12)" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#213146" },
  user: { color: design.colors.text, fontSize: 14.5, fontWeight: "700" },
  time: { color: design.colors.textMuted, marginTop: 1, fontSize: 12.5 },
  delete: { color: "#E89999", fontSize: 13, fontWeight: "600" },
  content: { color: "#E7EDF8", marginTop: 10, lineHeight: 21, fontSize: 14.5 },
  tradePointCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(32,210,92,0.38)",
    backgroundColor: "rgba(9,14,22,0.96)",
    overflow: "hidden",
  },
  tradePointImage: { width: "100%", aspectRatio: 16 / 8, backgroundColor: "#14202E" },
  tradePointBody: { padding: 13 },
  tradePointTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tradePointKickerWrap: {
    borderRadius: 999,
    backgroundColor: design.colors.green,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    minHeight: 25,
  },
  tradePointKicker: { color: "#06220F", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  tradePointTitle: { color: "#F7F7F8", fontSize: 19, fontWeight: "900", marginTop: 10 },
  tradePointAddress: { color: "#B7C7DB", fontSize: 13, lineHeight: 18, fontWeight: "600", marginTop: 5 },
  tradePointDistance: { color: "#9BFFBE", fontSize: 12.5, fontWeight: "800", marginTop: 7 },
  tradePointDescription: { color: "#DDE8F7", fontSize: 13, lineHeight: 19, marginTop: 8 },
  albumProgressCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,197,66,0.46)",
    backgroundColor: "rgba(17,23,26,0.96)",
    padding: 14,
  },
  albumProgressTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  albumProgressKicker: { color: "#F8D064", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  albumProgressOwner: { color: "#DDE4EE", fontSize: 12.5, fontWeight: "700", marginTop: 3 },
  albumProgressSeal: {
    minWidth: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(44,255,126,0.42)",
    backgroundColor: "rgba(32,210,92,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  albumProgressSealText: { color: "#7DFFAB", fontSize: 16, fontWeight: "900" },
  albumProgressTitle: { color: "#F7F7F8", fontSize: 20, fontWeight: "900", marginTop: 12, lineHeight: 24 },
  albumProgressRail: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#1B2635",
    marginTop: 12,
    overflow: "hidden",
  },
  albumProgressFill: { height: "100%", backgroundColor: design.colors.green },
  albumProgressStats: { flexDirection: "row", gap: 8, marginTop: 12 },
  albumProgressStat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(156,176,202,0.16)",
    backgroundColor: "rgba(9,13,19,0.7)",
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  albumProgressStatValue: { color: "#E7EDF8", fontSize: 16, fontWeight: "900" },
  albumProgressStatLabel: { color: "#8FA0B7", fontSize: 11, fontWeight: "700", marginTop: 2 },
  albumProgressMissing: { color: "#C8D4E7", fontSize: 13, fontWeight: "700", marginTop: 10 },
  albumProgressCaption: { color: "#E7EDF8", fontSize: 14, lineHeight: 20, marginTop: 10 },
  photo: { width: "100%", marginTop: 12, aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: "#14202E" },
  row: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 16 },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 8 },
  stickerWrap: { width: 22, height: 22 },
  stickerLayer: { position: "absolute", top: 0, left: 0 },
  topStickerWrap: { width: 22, height: 22 },
  foldShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0B1018", borderRadius: 2 },
  count: { color: "#8EA4BF", fontSize: 13, fontWeight: "600" },
  countActive: { color: design.colors.green },
});
