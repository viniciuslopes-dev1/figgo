import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  Animated,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppScreen } from "@/components/layout/AppScreen";
import { CommentsModal } from "@/components/feed/CommentsModal";
import { PostCard, type FeedItem } from "@/components/feed/PostCard";
import { StickerPullToRefresh, STICKER_PULL_REFRESH_TRIGGER } from "@/components/feed/StickerPullToRefresh";
import { design } from "@/constants/design";
import {
  createPost,
  createPostComment,
  deletePost,
  deletePostComment,
  fetchFeedPosts,
  fetchPostComments,
  togglePostLike,
  type FeedComment,
} from "@/services/feedService";
import { createNotification } from "@/services/notificationService";
import { pickImageFromLibrary, uploadPostImage } from "@/services/storageService";
import { useNotificationsStore } from "@/store/notificationsStore";
import { useSessionStore } from "@/store/sessionStore";

export function FeedScreen() {
  const params = useLocalSearchParams<{ postId?: string; openComments?: string }>();
  const user = useSessionStore((state) => state.user);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [composerImageUri, setComposerImageUri] = useState<string | null>(null);
  const [composerImageMime, setComposerImageMime] = useState<string | undefined>(undefined);
  const [posting, setPosting] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const listRef = useRef<FlatList<FeedItem> | null>(null);
  const pullDistanceRef = useRef(0);
  const dragActiveRef = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastJumpKeyRef = useRef<string | null>(null);

  const canInteract = Boolean(user?.id);
  const logoOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    void loadFeed();
  }, [user?.id]);

  useEffect(() => {
    const targetPostId = typeof params.postId === "string" ? params.postId : "";
    if (!targetPostId || !items.length) return;
    const openCommentsFromParams = params.openComments === "1";
    const jumpKey = `${targetPostId}:${openCommentsFromParams ? "1" : "0"}`;
    if (lastJumpKeyRef.current === jumpKey) return;

    const index = items.findIndex((item) => item.id === targetPostId);
    if (index < 0) return;

    lastJumpKeyRef.current = jumpKey;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    if (openCommentsFromParams) {
      void openComments(items[index]);
    }
  }, [items, params.openComments, params.postId]);

  async function loadFeed() {
    try {
      if (!refreshing) setLoading(true);
      const data = await fetchFeedPosts();
      const mapped = data.map((post) => ({
        id: post.id,
        userId: post.user_id,
        username: post.profile?.full_name || post.profile?.username || "Colecionador",
        avatarUrl: post.profile?.avatar_url || null,
        content: post.content,
        imageUrl: post.image_url,
        createdAt: post.created_at,
        likesCount: post.post_likes.length,
        commentsCount: post.post_comments.length,
        likedByMe: !!user?.id && post.post_likes.some((like) => like.user_id === user.id),
        isMine: user?.id === post.user_id,
      }));
      setItems(mapped);
    } catch (error) {
      Alert.alert("Feed", "Nao foi possivel carregar os posts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (!dragActiveRef.current) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    }
  }

  function updatePullDistance(next: number) {
    const bounded = Math.max(0, Math.min(next, STICKER_PULL_REFRESH_TRIGGER * 1.35));
    if (Math.abs(bounded - pullDistanceRef.current) < 0.8) return;
    pullDistanceRef.current = bounded;
    setPullDistance(bounded);
  }

  function triggerFeedRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    updatePullDistance(STICKER_PULL_REFRESH_TRIGGER);
    void loadFeed();
  }

  async function handlePickImage() {
    try {
      const asset = await pickImageFromLibrary();
      if (!asset) return;
      setComposerImageUri(asset.uri);
      setComposerImageMime(asset.mimeType || undefined);
    } catch (error) {
      Alert.alert("Imagem", "Nao foi possivel abrir a galeria.");
    }
  }

  async function handleCreatePost() {
    if (!user?.id) {
      Alert.alert("Login necessario", "Entre na sua conta para publicar.");
      return;
    }

    setPosting(true);
    try {
      let imageUrl: string | undefined;
      if (composerImageUri) {
        imageUrl = await uploadPostImage(user.id, composerImageUri, composerImageMime);
      }
      await createPost({ userId: user.id, content: composerText, imageUrl });
      setComposerText("");
      setComposerImageUri(null);
      setComposerImageMime(undefined);
      setComposerVisible(false);
      await loadFeed();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel publicar agora.";
      Alert.alert("Publicacao", message);
    } finally {
      setPosting(false);
    }
  }

  function closeComposer() {
    setComposerVisible(false);
    setComposerText("");
    setComposerImageUri(null);
    setComposerImageMime(undefined);
  }

  async function handleToggleLike(post: FeedItem) {
    if (!user?.id) {
      Alert.alert("Login necessario", "Entre na sua conta para curtir.");
      return;
    }

    const previous = items;
    setItems((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              likedByMe: !item.likedByMe,
              likesCount: item.likedByMe ? item.likesCount - 1 : item.likesCount + 1,
            }
          : item,
      ),
    );

    try {
      await togglePostLike(post.id, user.id, post.likedByMe);
      if (!post.likedByMe) {
        const actorName = user.name || "Alguem";
        try {
          await createNotification({
            userId: post.userId,
            fromUserId: user.id,
            type: "like",
            referenceId: post.id,
            referenceType: "post",
            content: `${actorName} curtiu sua postagem`,
            sendPush: true,
          });
        } catch {
          // Curtida concluida mesmo se notificacao falhar.
        }
      }
    } catch (error) {
      setItems(previous);
      Alert.alert("Curtida", "Nao foi possivel atualizar a curtida.");
    }
  }

  async function handleDeletePost(post: FeedItem) {
    if (!user?.id || user.id !== post.userId) return;
    try {
      await deletePost(post.id, user.id);
      setItems((current) => current.filter((item) => item.id !== post.id));
    } catch (error) {
      Alert.alert("Post", "Nao foi possivel excluir o post.");
    }
  }

  async function openComments(post: FeedItem) {
    setSelectedPost(post);
    setCommentsVisible(true);
    setCommentsLoading(true);
    try {
      const data = await fetchPostComments(post.id);
      setComments(data);
    } catch (error) {
      setComments([]);
      Alert.alert("Comentarios", "Nao foi possivel carregar comentarios.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handleCreateComment(content: string) {
    if (!selectedPost) return;
    if (!user?.id) {
      Alert.alert("Login necessario", "Entre na sua conta para comentar.");
      return;
    }
    await createPostComment(selectedPost.id, user.id, content);
    const updated = await fetchPostComments(selectedPost.id);
    setComments(updated);
    setItems((current) =>
      current.map((item) => (item.id === selectedPost.id ? { ...item, commentsCount: updated.length } : item)),
    );

    if (user.id !== selectedPost.userId) {
      const actorName = user.name || "Alguem";
      const snippet = content.trim().slice(0, 72);
      try {
        await createNotification({
          userId: selectedPost.userId,
          fromUserId: user.id,
          type: "comment",
          referenceId: selectedPost.id,
          referenceType: "post",
          content: `${actorName} comentou na sua postagem: ${snippet}`,
          sendPush: true,
        });
      } catch {
        // Comentario concluido mesmo se notificacao falhar.
      }
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!user?.id || !selectedPost) return;
    await deletePostComment(commentId, user.id);
    const updated = await fetchPostComments(selectedPost.id);
    setComments(updated);
    setItems((current) =>
      current.map((item) => (item.id === selectedPost.id ? { ...item, commentsCount: updated.length } : item)),
    );
  }

  const badgeLabel = useMemo(() => (unreadCount > 99 ? "99+" : `${unreadCount}`), [unreadCount]);

  return (
    <AppScreen>
      <View style={styles.wrap}>
        <StickerPullToRefresh
          refreshing={refreshing}
          onRefresh={triggerFeedRefresh}
          accentColor={design.colors.green}
          size={42}
          pullDistance={pullDistance}
        />
        <Animated.View style={[styles.topBar, { opacity: logoOpacity }]}>
          <Text style={styles.logo}>
            Fig<Text style={styles.logoGreen}>Go</Text>
          </Text>
          <Pressable style={styles.notificationsButton} onPress={() => router.push("/(tabs)/notificacoes")}>
            <Ionicons name="notifications-outline" size={20} color="#E6EEF8" />
            {unreadCount > 0 ? (
              <View style={styles.notificationsBadge}>
                <Text style={styles.notificationsBadgeText}>{badgeLabel}</Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>

        <Animated.FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={() => {
            if (!params.postId) return;
            void loadFeed();
          }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
            listener: (event: { nativeEvent: { contentOffset: { y: number } } }) => {
              const y = event.nativeEvent.contentOffset.y;
              if (refreshing) return;
              if (y < 0) {
                updatePullDistance(-y);
                return;
              }
              if (!dragActiveRef.current && pullDistanceRef.current > 0) {
                updatePullDistance(0);
              }
            },
          })}
          onScrollBeginDrag={() => {
            dragActiveRef.current = true;
          }}
          onScrollEndDrag={() => {
            dragActiveRef.current = false;
            if (refreshing) return;
            if (pullDistanceRef.current >= STICKER_PULL_REFRESH_TRIGGER) {
              triggerFeedRefresh();
              return;
            }
            updatePullDistance(0);
          }}
          onMomentumScrollEnd={() => {
            if (!refreshing && pullDistanceRef.current > 0) {
              updatePullDistance(0);
            }
          }}
          scrollEventThrottle={16}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>Sem posts ainda.</Text> : null}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onToggleLike={handleToggleLike}
              onOpenComments={openComments}
              onDeletePost={handleDeletePost}
            />
          )}
          contentContainerStyle={styles.content}
          bounces
          overScrollMode="always"
          showsVerticalScrollIndicator={false}
        />

        <Pressable style={[styles.fab, { bottom: insets.bottom + 82 }]} onPress={() => setComposerVisible(true)}>
          <Ionicons name="add" size={24} color="#06220F" />
        </Pressable>
      </View>

      <Modal visible={composerVisible} transparent animationType="fade" onRequestClose={closeComposer}>
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBackdrop}>
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Nova publicacao</Text>
                    <Pressable onPress={closeComposer}>
                      <Text style={styles.modalClose}>Cancelar</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    value={composerText}
                    onChangeText={setComposerText}
                    placeholder="Compartilhe sua troca ou progresso..."
                    placeholderTextColor={design.colors.textMuted}
                    multiline
                    style={styles.modalInput}
                    editable={!posting && canInteract}
                  />
                  {composerImageUri ? (
                    <View style={styles.previewWrap}>
                      <Image source={{ uri: composerImageUri }} style={styles.preview} />
                      <Pressable style={styles.removeImage} onPress={() => setComposerImageUri(null)}>
                        <Text style={styles.removeImageText}>Remover imagem</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  <View style={styles.modalActions}>
                    <Pressable style={styles.secondaryButton} onPress={handlePickImage} disabled={!canInteract || posting}>
                      <Text style={styles.secondaryText}>Adicionar imagem</Text>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={handleCreatePost} disabled={!canInteract || posting}>
                      <Text style={styles.primaryText}>{posting ? "Publicando..." : "Publicar"}</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      <CommentsModal
        visible={commentsVisible}
        comments={comments}
        loading={commentsLoading}
        canInteract={canInteract}
        onClose={() => setCommentsVisible(false)}
        onSubmit={handleCreateComment}
        onDelete={handleDeleteComment}
        myUserId={user?.id ?? null}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { paddingTop: 78, paddingBottom: 148 },
  topBar: { position: "absolute", top: 12, left: 0, right: 0, alignItems: "center", zIndex: 8, pointerEvents: "box-none" },
  logo: { color: "#F7F7F8", fontWeight: "800", fontSize: 29, letterSpacing: -0.7 },
  logoGreen: { color: "#20D25C" },
  notificationsButton: {
    position: "absolute",
    right: 16,
    top: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(156,176,202,0.26)",
    backgroundColor: "rgba(12,20,32,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationsBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#20D25C",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationsBadgeText: { color: "#092111", fontSize: 9, fontWeight: "800" },
  fab: {
    position: "absolute",
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#20D25C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#20D25C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 14,
    elevation: 8,
  },
  modalKeyboardWrap: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: 16,
  },
  modalScrollContent: { flexGrow: 1, justifyContent: "center" },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(156,176,202,0.2)",
    backgroundColor: "rgba(10,16,25,0.96)",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { color: "#F6FAFF", fontSize: 17, fontWeight: "700" },
  modalClose: { color: "#C9D9FF", fontSize: 13.5, fontWeight: "600" },
  modalInput: {
    color: design.colors.text,
    minHeight: 96,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: "top",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(156,176,202,0.2)",
    backgroundColor: "rgba(14,23,34,0.74)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewWrap: { marginTop: 10 },
  preview: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: "#14202E" },
  removeImage: { marginTop: 8, alignSelf: "flex-start" },
  removeImageText: { color: "#E89999", fontSize: 13, fontWeight: "600" },
  modalActions: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  secondaryButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "rgba(44,107,255,0.18)" },
  secondaryText: { color: "#C9D9FF", fontSize: 13, fontWeight: "600" },
  primaryButton: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, backgroundColor: design.colors.green },
  primaryText: { color: "#06220F", fontSize: 13.5, fontWeight: "700" },
  empty: { color: "#9CB0CA", textAlign: "center", marginTop: 30, fontSize: 14 },
});
