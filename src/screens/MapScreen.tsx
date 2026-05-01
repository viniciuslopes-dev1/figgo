import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "@/components/Ui";

const points = [
  { id: "1", lat: -23.561, lng: -46.656, color: "#20D25C" },
  { id: "2", lat: -23.548, lng: -46.638, color: "#2C6BFF" },
  { id: "3", lat: -23.553, lng: -46.628, color: "#FF4D4D" },
  { id: "4", lat: -23.566, lng: -46.621, color: "#F5C542" },
];

const tabs = ["Todos", "Trocas", "Eventos", "Bancas"];

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Todos");

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -23.555,
          longitude: -46.635,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {points.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }}>
            <View style={[styles.pinOuter, { borderColor: p.color }]}>
              <View style={[styles.pinInner, { backgroundColor: p.color }]} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.overlay, { top: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <View style={styles.cityChip}>
            <Ionicons name="location-outline" size={13} color="#D7E4F4" />
            <Text style={styles.cityText}>Sao Paulo, SP</Text>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={14} color="#9CB0C8" />
            <Text style={styles.searchText}>Buscar no mapa</Text>
          </View>

          <View style={styles.filterBtn}>
            <Ionicons name="options-outline" size={16} color="#E2EAF5" />
          </View>
        </View>

        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const active = activeTab === tab;
            return (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabBtn, active && styles.tabBtnActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.locateWrap}>
          <View style={styles.filterBtn}>
            <Ionicons name="locate" size={16} color="#E2EAF5" />
          </View>
        </View>
      </View>

      <View style={[styles.bottomSheet, { bottom: insets.bottom + 72 }]}>
        <GlassCard>
          <View style={styles.sheet}>
            <View style={styles.sheetTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Shopping Eldorado</Text>
                <Text style={styles.addr}>Av. Reboucas, 3970 - Pinheiros</Text>
              </View>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>12 aqui</Text>
              </View>
            </View>

            <View style={styles.badges}>
              <Tag label="Troca livre" active />
              <Tag label="Seguro" />
            </View>

            <View style={styles.actionsGrid}>
              <ActionBtn icon="navigate" label="Ver rota" primary />
              <ActionBtn icon="checkmark-circle-outline" label="Confirmar" />
              <ActionBtn icon="flag-outline" label="Reportar" ghost />
            </View>
          </View>
        </GlassCard>
      </View>
    </View>
  );
}

function Tag({ label, active }: { label: string; active?: boolean }) {
  return (
    <View style={[styles.tag, active && styles.tagActive]}>
      <Text style={[styles.tagLabel, active && styles.tagLabelActive]}>{label}</Text>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  primary,
  ghost,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary?: boolean;
  ghost?: boolean;
}) {
  return (
    <View style={[styles.actionBtn, primary && styles.actionPrimary, ghost && styles.actionGhost]}>
      <Ionicons name={icon} size={14} color={primary ? "#fff" : "#D6E0ED"} />
      <Text style={[styles.actionText, primary && styles.actionPrimaryText, ghost && styles.actionGhostText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050607" },
  map: { flex: 1 },
  overlay: {
    position: "absolute",
    left: 14,
    right: 14,
    gap: 10,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cityChip: {
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#2B394B",
    backgroundColor: "rgba(8,12,18,0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
  },
  cityText: { color: "#E6EDF8", fontSize: 12, fontWeight: "600" },
  searchBar: {
    flex: 1,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#2B394B",
    backgroundColor: "rgba(8,12,18,0.9)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  searchText: { color: "#97ABC2", fontSize: 13, fontWeight: "500" },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#2B394B",
    backgroundColor: "rgba(8,12,18,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 7,
  },
  tabBtn: {
    flex: 1,
    minHeight: 35,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#29384A",
    backgroundColor: "rgba(8,12,18,0.9)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  tabBtnActive: {
    backgroundColor: "rgba(32,210,92,0.2)",
    borderColor: "#31DA6D",
  },
  tabText: { color: "#B6C5D7", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#A4F7C1", fontWeight: "700" },
  locateWrap: { alignItems: "flex-end" },
  bottomSheet: {
    position: "absolute",
    left: 14,
    right: 14,
  },
  sheet: { padding: 14 },
  sheetTop: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  title: { color: "#fff", fontWeight: "700", fontSize: 17, lineHeight: 22 },
  addr: { color: "#A0A7B4", marginTop: 4, fontSize: 12.5, lineHeight: 17, fontWeight: "500" },
  livePill: {
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2FDF72",
    backgroundColor: "rgba(32,210,92,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#31DA6D" },
  liveText: { color: "#8DFBB2", fontSize: 11, fontWeight: "700" },
  badges: { flexDirection: "row", gap: 6, marginTop: 10 },
  tag: {
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2C394C",
    backgroundColor: "#0A111A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tagActive: { backgroundColor: "rgba(32,210,92,0.18)", borderColor: "#2CFF7E" },
  tagLabel: { color: "#D7E3F2", fontWeight: "600", fontSize: 12 },
  tagLabelActive: { color: "#7DFFAB", fontWeight: "700" },
  actionsGrid: { flexDirection: "row", gap: 7, marginTop: 12 },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0B1018",
    borderWidth: 1,
    borderColor: "#253246",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionPrimary: { backgroundColor: "#1FAE4D", borderColor: "#35D669" },
  actionGhost: { backgroundColor: "transparent", borderColor: "#2A3749" },
  actionText: { color: "#E5E7EB", fontWeight: "600", fontSize: 12.5 },
  actionPrimaryText: { color: "#fff", fontWeight: "700" },
  actionGhostText: { color: "#AFBDCE" },
  pinOuter: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    borderWidth: 2,
    backgroundColor: "rgba(10,15,24,0.82)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  pinInner: { width: 8, height: 8, borderRadius: 4 },
});
