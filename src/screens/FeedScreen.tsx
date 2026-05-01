import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/AppScreen";

const HEADER_MAX = 126;
const HEADER_MIN = 72;
const HEADER_RANGE = HEADER_MAX - HEADER_MIN;

const posts = [1, 2, 3];
const stories = ["Seu story", "Lucas", "Amanda", "Pedro", "Gabriel"];

export function FeedScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_RANGE],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: "clamp",
  });
  const logoOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_RANGE * 0.8],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const logoLift = scrollY.interpolate({
    inputRange: [0, HEADER_RANGE],
    outputRange: [0, -12],
    extrapolate: "clamp",
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_RANGE * 0.85],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <AppScreen>
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <View style={styles.headerRow}>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoLift }] }}>
            <Text style={styles.logo}>
              Fig<Text style={styles.logoGreen}>Go</Text>
            </Text>
          </Animated.View>
          <Animated.Text style={[styles.compactTitle, { opacity: titleOpacity }]}>Feed</Animated.Text>
          <View style={styles.icons}>
            <Icon name="add" />
            <Icon name="notifications-outline" />
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
          {stories.map((name) => (
            <View key={name} style={styles.story}>
              <View style={styles.storyAvatar} />
              <Text style={styles.storyName}>{name}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.postList}>
          {posts.map((id) => (
            <View key={id} style={styles.postSurface}>
              <View style={styles.postHeader}>
                <View>
                  <Text style={styles.user}>Lucas{id}</Text>
                  <Text style={styles.location}>Sao Paulo, SP</Text>
                </View>
              </View>
              <Text style={styles.contentText}>Abri 20 pacotes hoje. Faltam 27 para completar o album. #faltam27 #trocaSP</Text>
              <View style={styles.photo} />
              <View style={styles.actions}>
                <Text style={styles.action}>❤ 128</Text>
                <Text style={styles.action}>💬 32</Text>
                <Text style={styles.action}>↻ 12</Text>
                <Text style={styles.action}>🔖</Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>
    </AppScreen>
  );
}

function Icon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.iconBtn}>
      <Ionicons name={name} size={20} color="#E5E7EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    backgroundColor: "rgba(5,7,9,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(47,60,78,0.22)",
  },
  headerRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { fontSize: 35, color: "#fff", fontWeight: "800", letterSpacing: -0.9 },
  logoGreen: { color: "#20D25C" },
  compactTitle: {
    position: "absolute",
    left: 20,
    color: "#F8FAFD",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  icons: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#101720",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#243142",
  },
  content: { paddingTop: HEADER_MAX + 10, paddingBottom: 120 },
  storyRow: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 14,
  },
  story: { alignItems: "center", width: 84 },
  storyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.2,
    borderColor: "#22C55E",
    backgroundColor: "#1A2433",
  },
  storyName: { color: "#E4E8EF", marginTop: 8, fontSize: 14, fontWeight: "500" },
  postList: {
    gap: 14,
    paddingHorizontal: 14,
  },
  postSurface: {
    backgroundColor: "#0E141D",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  user: { color: "#fff", fontSize: 17, fontWeight: "700" },
  location: { color: "#8FA1B8", marginTop: 3, fontSize: 12.5, fontWeight: "500" },
  contentText: { color: "#E5E7EB", marginTop: 10, fontSize: 15.5, lineHeight: 23 },
  photo: {
    marginTop: 14,
    height: 228,
    borderRadius: 14,
    backgroundColor: "#1A2B1D",
  },
  actions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(143,161,184,0.16)",
    paddingTop: 12,
  },
  action: { color: "#D5DBE6", fontSize: 14, fontWeight: "600" },
});
