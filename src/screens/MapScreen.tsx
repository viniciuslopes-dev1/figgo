import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, type LatLng, type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard, IconCircleButton } from "@/components/ui";
import { design } from "@/constants/design";
import { createPost } from "@/services/feedService";
import { notifyUsersAboutNewTradePoint, notifyUsersAboutTradePointPost } from "@/services/notificationService";
import { pickImageFromLibrary, uploadTradePointFacadeImage } from "@/services/storageService";
import { supabaseEnabled } from "@/services/supabase";
import { createTradePoint, fetchTradePoints } from "@/services/tradePointsService";
import { useSessionStore } from "@/store/sessionStore";
import type { TradePoint } from "@/types/tradePoint";
import { serializeTradePointPost } from "@/utils/tradePointPost";

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"] as const;

const initialRegion: Region = {
  latitude: -23.555,
  longitude: -46.635,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const defaultImage = "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80";
const radiusOptions = [1, 3, 5, 10, 20] as const;

type AddressForm = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  complement: string;
};

type NewPointForm = {
  name: string;
  description: string;
  facadeImageUri: string | null;
  facadeImageMime?: string;
  availableDays: string[];
  openingTime: string;
  closingTime: string;
  latitude: number;
  longitude: number;
  address: AddressForm;
};

function emptyAddressForm(): AddressForm {
  return {
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    complement: "",
  };
}

function geocodeToAddressForm(item: Location.LocationGeocodedAddress | undefined): AddressForm {
  if (!item) return emptyAddressForm();
  return {
    street: item.street || item.name || "",
    number: item.streetNumber || "",
    neighborhood: item.district || item.subregion || "",
    city: item.city || "",
    state: item.region || "",
    zipCode: item.postalCode || "",
    complement: "",
  };
}

function buildTradePointAddress(address: AddressForm) {
  const main = [address.street, address.number].filter(Boolean).join(", ");
  const secondary = [address.neighborhood, address.city, address.state].filter(Boolean).join(" - ");
  const zip = address.zipCode ? `, ${address.zipCode}` : "";
  const complement = address.complement ? ` (${address.complement})` : "";
  return `${main}${secondary ? `, ${secondary}` : ""}${zip}${complement}`.trim();
}

function getDistanceKm(origin: LatLng, point: Pick<TradePoint, "latitude" | "longitude">) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(point.latitude - origin.latitude);
  const dLng = toRad(point.longitude - origin.longitude);
  const lat1 = toRad(origin.latitude);
  const lat2 = toRad(point.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceKm: number | null) {
  if (distanceKm === null) return "Distancia indisponivel";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm >= 10 ? 0 : 1)} km`;
}

export function MapScreen() {
  const params = useLocalSearchParams<{ pointId?: string; lat?: string; lng?: string }>();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const mapRef = useRef<MapView | null>(null);

  const [points, setPoints] = useState<TradePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<TradePoint | null>(null);
  const [query, setQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState<(typeof radiusOptions)[number]>(5);
  const [mapRegion, setMapRegion] = useState<Region>(initialRegion);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [manualCoordinateMode, setManualCoordinateMode] = useState(false);
  const [savingPoint, setSavingPoint] = useState(false);
  const [postingToFeed, setPostingToFeed] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [newPoint, setNewPoint] = useState<NewPointForm>({
    name: "",
    description: "",
    facadeImageUri: null,
    facadeImageMime: undefined,
    availableDays: ["Sab"],
    openingTime: "10:00",
    closingTime: "18:00",
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude,
    address: emptyAddressForm(),
  });

  useEffect(() => {
    void loadPoints();
    const lat = typeof params.lat === "string" ? Number(params.lat) : NaN;
    const lng = typeof params.lng === "string" ? Number(params.lng) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      void requestAndCenterUserLocation(false);
    }
  }, []);

  useEffect(() => {
    const lat = typeof params.lat === "string" ? Number(params.lat) : NaN;
    const lng = typeof params.lng === "string" ? Number(params.lng) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const targetRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      setMapRegion(targetRegion);
      mapRef.current?.animateToRegion(targetRegion, 350);
    }

    const pointId = typeof params.pointId === "string" ? params.pointId : "";
    if (!pointId || !points.length) return;
    const point = points.find((entry) => entry.id === pointId);
    if (point) {
      focusPoint(point);
    }
  }, [params.lat, params.lng, params.pointId, points]);

  const visiblePoints = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return points.filter((point) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        point.name.toLowerCase().includes(normalizedQuery) ||
        point.address.toLowerCase().includes(normalizedQuery) ||
        (point.description ?? "").toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) return false;
      if (!userLocation) return true;
      return getDistanceKm(userLocation, point) <= radiusKm;
    });
  }, [points, query, radiusKm, userLocation]);

  async function loadPoints() {
    try {
      const data = await fetchTradePoints();
      setPoints(data);
    } catch (error) {
      Alert.alert("Mapa", "Nao foi possivel carregar os pontos de troca.");
    }
  }

  async function requestAndCenterUserLocation(showDeniedAlert: boolean) {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setHasLocationPermission(false);
        setLocationStatusMessage("Permissao de localizacao negada. Usando localizacao padrao.");
        if (showDeniedAlert) {
          Alert.alert("Localizacao", "Permissao negada. O mapa vai usar uma localizacao padrao.");
        }
        return null;
      }

      setHasLocationPermission(true);
      setLocationStatusMessage(null);
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setUserLocation(coords);

      const centeredRegion = {
        ...coords,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
      setMapRegion(centeredRegion);
      mapRef.current?.animateToRegion(centeredRegion, 350);
      return coords;
    } catch (error) {
      setHasLocationPermission(false);
      setLocationStatusMessage("Nao foi possivel obter sua localizacao agora.");
      return null;
    }
  }

  async function fillAddressFromCoordinates(coords: LatLng, preserveCurrentComplement = true) {
    try {
      const result = await Location.reverseGeocodeAsync(coords);
      const parsed = geocodeToAddressForm(result[0]);
      setNewPoint((current) => ({
        ...current,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: {
          ...parsed,
          number: current.address.number || parsed.number,
          complement: preserveCurrentComplement ? current.address.complement : parsed.complement,
        },
      }));
    } catch (error) {
      setNewPoint((current) => ({
        ...current,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
    }
  }

  function focusPoint(point: TradePoint) {
    setSelectedPoint(point);
    mapRef.current?.animateToRegion(
      {
        latitude: point.latitude,
        longitude: point.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      300,
    );
  }

  function getPointDistance(point: TradePoint) {
    if (!userLocation) return null;
    return getDistanceKm(userLocation, point);
  }

  async function openAddModal() {
    if (!user?.id) {
      Alert.alert("Login necessario", "Entre na sua conta para adicionar ponto de troca.");
      return;
    }

    setAddModalVisible(true);
    setManualCoordinateMode(false);
    setLoadingAddress(true);
    setNewPoint({
      name: "",
      description: "",
      facadeImageUri: null,
      facadeImageMime: undefined,
      availableDays: ["Sab"],
      openingTime: "10:00",
      closingTime: "18:00",
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
      address: emptyAddressForm(),
    });

    const freshUserLocation = await requestAndCenterUserLocation(false);
    const baseCoords = freshUserLocation || userLocation || { latitude: mapRegion.latitude, longitude: mapRegion.longitude };
    await fillAddressFromCoordinates(baseCoords, true);
    setLoadingAddress(false);
  }

  async function handlePickFacade() {
    try {
      const asset = await pickImageFromLibrary();
      if (!asset) return;
      setNewPoint((current) => ({
        ...current,
        facadeImageUri: asset.uri,
        facadeImageMime: asset.mimeType || undefined,
      }));
    } catch (error) {
      Alert.alert("Imagem", "Nao foi possivel abrir a galeria.");
    }
  }

  function toggleDay(day: string) {
    setNewPoint((current) => {
      const hasDay = current.availableDays.includes(day);
      const availableDays = hasDay
        ? current.availableDays.filter((value) => value !== day)
        : [...current.availableDays, day].sort(
            (a, b) =>
              weekDays.indexOf(a as (typeof weekDays)[number]) - weekDays.indexOf(b as (typeof weekDays)[number]),
          );
      return { ...current, availableDays };
    });
  }

  async function handleSavePoint() {
    if (!user?.id) {
      Alert.alert("Login necessario", "Entre na sua conta para salvar o ponto.");
      return;
    }
    if (!newPoint.name.trim()) {
      Alert.alert("Campos obrigatorios", "Informe o nome do ponto.");
      return;
    }

    const composedAddress = buildTradePointAddress(newPoint.address);
    if (!composedAddress) {
      Alert.alert("Endereco", "Preencha ao menos rua, cidade e estado.");
      return;
    }
    if (!newPoint.availableDays.length) {
      Alert.alert("Dias de troca", "Selecione pelo menos um dia disponivel.");
      return;
    }

    setSavingPoint(true);
    try {
      let facadeImageUrl = newPoint.facadeImageUri || undefined;
      const shouldUpload = Boolean(supabaseEnabled && newPoint.facadeImageUri && newPoint.facadeImageUri.startsWith("file"));
      if (shouldUpload) {
        facadeImageUrl = await uploadTradePointFacadeImage(user.id, newPoint.facadeImageUri!, newPoint.facadeImageMime);
      }

      const created = await createTradePoint({
        name: newPoint.name.trim(),
        address: composedAddress,
        latitude: newPoint.latitude,
        longitude: newPoint.longitude,
        description: newPoint.description.trim() || undefined,
        facadeImageUrl,
        availableDays: newPoint.availableDays,
        openingTime: newPoint.openingTime.trim(),
        closingTime: newPoint.closingTime.trim(),
        createdBy: user.id,
      });

      setPoints((current) => [created, ...current]);
      setSelectedPoint(created);
      setAddModalVisible(false);
      setManualCoordinateMode(false);
      focusPoint(created);
      try {
        await notifyUsersAboutNewTradePoint({
          creatorId: user.id,
          tradePointId: created.id,
          tradePointName: created.name,
          latitude: created.latitude,
          longitude: created.longitude,
        });
      } catch {
        // Ponto salvo mesmo se notificacoes falharem.
      }
      Alert.alert("Mapa", "Ponto salvo e adicionado ao mapa.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel salvar o ponto.";
      Alert.alert("Mapa", message);
    } finally {
      setSavingPoint(false);
    }
  }

  async function handlePostToFeed(point: TradePoint) {
    if (!user?.id) {
      Alert.alert("Login necessario", "Entre na sua conta para publicar no feed.");
      return;
    }

    setPostingToFeed(true);
    try {
      const createdPost = await createPost({
        userId: user.id,
        content: serializeTradePointPost(point, getPointDistance(point) ?? undefined),
        imageUrl: point.facadeImageUrl,
      });
      try {
        await notifyUsersAboutTradePointPost({
          authorId: user.id,
          postId: createdPost.id,
          tradePointName: point.name,
        });
      } catch {
        // Post segue normal mesmo se notificacao falhar.
      }
      Alert.alert("Feed", "Post criado no feed com os dados do ponto.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel postar no feed agora.";
      Alert.alert("Feed", message);
    } finally {
      setPostingToFeed(false);
    }
  }

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={hasLocationPermission}
        onRegionChangeComplete={(region) => setMapRegion(region)}
        onLongPress={(event) => {
          if (!manualCoordinateMode) return;
          const coords = event.nativeEvent.coordinate;
          void fillAddressFromCoordinates(coords, true);
          setManualCoordinateMode(false);
        }}
      >
        {visiblePoints.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            onPress={() => focusPoint(point)}
          >
            <View style={[styles.pinOuter, selectedPoint?.id === point.id && styles.pinOuterActive]}>
              <View style={[styles.pinInner, selectedPoint?.id === point.id && styles.pinInnerActive]} />
            </View>
          </Marker>
        ))}

        {addModalVisible ? (
          <Marker coordinate={{ latitude: newPoint.latitude, longitude: newPoint.longitude }}>
            <View style={styles.draftPin}>
              <Ionicons name="add" size={12} color="#06220F" />
            </View>
          </Marker>
        ) : null}
      </MapView>

      <View style={[styles.overlay, { top: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <View style={styles.cityChip}>
            <Ionicons name="location-outline" size={13} color="#D7E4F4" />
            <Text style={styles.cityText}>{userLocation ? "Perto de voce" : "Mapa de trocas"}</Text>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={14} color="#9CB0C8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar ponto, endereco ou descricao"
              placeholderTextColor="#97ABC2"
              style={styles.searchInput}
            />
          </View>

          <IconCircleButton name="options-outline" size={16} />
        </View>

        <View style={styles.radiusRow}>
          {radiusOptions.map((radius) => {
            const isActive = radiusKm === radius;
            return (
              <Pressable key={radius} onPress={() => setRadiusKm(radius)} style={[styles.radiusChip, isActive && styles.radiusChipActive]}>
                <Text style={[styles.radiusText, isActive && styles.radiusTextActive]}>{radius} km</Text>
              </Pressable>
            );
          })}
        </View>

        {locationStatusMessage ? (
          <View style={styles.locationNotice}>
            <Ionicons name="information-circle-outline" size={14} color="#BBD0E7" />
            <Text style={styles.locationNoticeText}>{locationStatusMessage}</Text>
          </View>
        ) : null}

        <View style={styles.mapActions}>
          <IconCircleButton
            name="locate"
            size={16}
            onPress={() => {
              void requestAndCenterUserLocation(true);
            }}
          />
          <Pressable style={styles.addButton} onPress={() => void openAddModal()}>
            <Ionicons name="add" size={20} color="#06220F" />
          </Pressable>
        </View>

        {visiblePoints.length === 0 ? (
          <View style={styles.emptySearchNotice}>
            <Ionicons name="search-outline" size={14} color="#BBD0E7" />
            <Text style={styles.emptySearchText}>Nenhum ponto encontrado neste raio.</Text>
          </View>
        ) : null}
      </View>

      {selectedPoint ? (
        <View style={[styles.bottomSheetWrap, { bottom: insets.bottom + 8 }]}>
          <GlassCard style={styles.bottomSheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheet}>
              <Pressable style={styles.sheetCloseButton} onPress={() => setSelectedPoint(null)}>
                <Ionicons name="close" size={18} color="#E9F2FF" />
              </Pressable>
              <Image source={{ uri: selectedPoint.facadeImageUrl || defaultImage }} style={styles.sheetImage} />
              <View style={styles.sheetKicker}>
                <Ionicons name="swap-horizontal" size={13} color="#06220F" />
                <Text style={styles.sheetKickerText}>Ponto de troca</Text>
              </View>
              <Text style={styles.title}>{selectedPoint.name}</Text>
              <Text style={styles.addr}>{selectedPoint.address}</Text>
              <Text style={styles.distanceText}>{formatDistance(getPointDistance(selectedPoint))} de voce</Text>
              <Text style={styles.schedule}>
                {selectedPoint.availableDays.join(", ")} • {selectedPoint.openingTime} - {selectedPoint.closingTime}
              </Text>
              {selectedPoint.description ? <Text style={styles.description}>{selectedPoint.description}</Text> : null}

              <View style={styles.actionsGrid}>
                <ActionButton icon="navigate" label="Ver no mapa" primary onPress={() => focusPoint(selectedPoint)} />
                <ActionButton
                  icon="megaphone-outline"
                  label={postingToFeed ? "Publicando..." : "Postar no feed"}
                  onPress={() => {
                    if (!postingToFeed) void handlePostToFeed(selectedPoint);
                  }}
                />
              </View>
            </View>
          </GlassCard>
        </View>
      ) : null}

      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={styles.formSheet}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Novo ponto de troca</Text>
              <Pressable onPress={() => setAddModalVisible(false)}>
                <Text style={styles.formClose}>Fechar</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                value={newPoint.name}
                onChangeText={(value) => setNewPoint((current) => ({ ...current, name: value }))}
                placeholder="Nome do ponto"
                placeholderTextColor="#8FA3BD"
                style={styles.input}
              />

              <Text style={styles.label}>Endereco</Text>
              {loadingAddress ? <Text style={styles.addressHint}>Preenchendo endereco pela sua localizacao...</Text> : null}

              <View style={styles.fieldRow}>
                <TextInput
                  value={newPoint.address.street}
                  onChangeText={(value) =>
                    setNewPoint((current) => ({ ...current, address: { ...current.address, street: value } }))
                  }
                  placeholder="Rua"
                  placeholderTextColor="#8FA3BD"
                  style={[styles.input, styles.fieldLarge]}
                />
                <TextInput
                  value={newPoint.address.number}
                  onChangeText={(value) =>
                    setNewPoint((current) => ({ ...current, address: { ...current.address, number: value } }))
                  }
                  placeholder="Numero"
                  placeholderTextColor="#8FA3BD"
                  style={[styles.input, styles.fieldSmall]}
                />
              </View>

              <TextInput
                value={newPoint.address.neighborhood}
                onChangeText={(value) =>
                  setNewPoint((current) => ({ ...current, address: { ...current.address, neighborhood: value } }))
                }
                placeholder="Bairro"
                placeholderTextColor="#8FA3BD"
                style={styles.input}
              />

              <View style={styles.fieldRow}>
                <TextInput
                  value={newPoint.address.city}
                  onChangeText={(value) =>
                    setNewPoint((current) => ({ ...current, address: { ...current.address, city: value } }))
                  }
                  placeholder="Cidade"
                  placeholderTextColor="#8FA3BD"
                  style={[styles.input, styles.fieldLarge]}
                />
                <TextInput
                  value={newPoint.address.state}
                  onChangeText={(value) =>
                    setNewPoint((current) => ({ ...current, address: { ...current.address, state: value } }))
                  }
                  placeholder="Estado"
                  placeholderTextColor="#8FA3BD"
                  style={[styles.input, styles.fieldSmall]}
                />
              </View>

              <View style={styles.fieldRow}>
                <TextInput
                  value={newPoint.address.zipCode}
                  onChangeText={(value) =>
                    setNewPoint((current) => ({ ...current, address: { ...current.address, zipCode: value } }))
                  }
                  placeholder="CEP"
                  placeholderTextColor="#8FA3BD"
                  style={[styles.input, styles.fieldSmall]}
                />
                <TextInput
                  value={newPoint.address.complement}
                  onChangeText={(value) =>
                    setNewPoint((current) => ({ ...current, address: { ...current.address, complement: value } }))
                  }
                  placeholder="Complemento (opcional)"
                  placeholderTextColor="#8FA3BD"
                  style={[styles.input, styles.fieldLarge]}
                />
              </View>

              <TextInput
                value={newPoint.description}
                onChangeText={(value) => setNewPoint((current) => ({ ...current, description: value }))}
                placeholder="Descricao opcional"
                placeholderTextColor="#8FA3BD"
                style={[styles.input, styles.inputMultiline]}
                multiline
              />

              <View style={styles.rowWrap}>
                <Pressable style={styles.secondaryAction} onPress={handlePickFacade}>
                  <Ionicons name="image-outline" size={16} color="#C9D9FF" />
                  <Text style={styles.secondaryActionText}>{newPoint.facadeImageUri ? "Trocar foto" : "Foto da fachada"}</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryAction, manualCoordinateMode && styles.secondaryActionActive]}
                  onPress={() => setManualCoordinateMode((current) => !current)}
                >
                  <Ionicons name="pin-outline" size={16} color={manualCoordinateMode ? "#A4F7C1" : "#C9D9FF"} />
                  <Text style={[styles.secondaryActionText, manualCoordinateMode && styles.secondaryActionTextActive]}>
                    {manualCoordinateMode ? "Toque longo no mapa" : "Selecionar no mapa"}
                  </Text>
                </Pressable>
              </View>

              {newPoint.facadeImageUri ? <Image source={{ uri: newPoint.facadeImageUri }} style={styles.previewImage} /> : null}

              <Text style={styles.label}>Dias de troca</Text>
              <View style={styles.daysGrid}>
                {weekDays.map((day) => {
                  const active = newPoint.availableDays.includes(day);
                  return (
                    <Pressable key={day} onPress={() => toggleDay(day)} style={[styles.dayChip, active && styles.dayChipActive]}>
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.label}>Inicio</Text>
                  <TextInput
                    value={newPoint.openingTime}
                    onChangeText={(value) => setNewPoint((current) => ({ ...current, openingTime: value }))}
                    placeholder="10:00"
                    placeholderTextColor="#8FA3BD"
                    style={styles.input}
                  />
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.label}>Fim</Text>
                  <TextInput
                    value={newPoint.closingTime}
                    onChangeText={(value) => setNewPoint((current) => ({ ...current, closingTime: value }))}
                    placeholder="18:00"
                    placeholderTextColor="#8FA3BD"
                    style={styles.input}
                  />
                </View>
              </View>

              <Text style={styles.coordinates}>
                Coordenadas: {newPoint.latitude.toFixed(5)}, {newPoint.longitude.toFixed(5)}
              </Text>
              <Pressable
                style={styles.secondaryAction}
                onPress={() => {
                  const center = { latitude: mapRegion.latitude, longitude: mapRegion.longitude };
                  void fillAddressFromCoordinates(center, true);
                }}
              >
                <Ionicons name="locate-outline" size={16} color="#C9D9FF" />
                <Text style={styles.secondaryActionText}>Usar centro atual do mapa</Text>
              </Pressable>

              <Pressable style={styles.saveButton} onPress={() => void handleSavePoint()} disabled={savingPoint}>
                <Text style={styles.saveButtonText}>{savingPoint ? "Salvando..." : "Salvar ponto"}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  primary,
  ghost,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  primary?: boolean;
  ghost?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.actionBtn, primary && styles.actionPrimary, ghost && styles.actionGhost]} onPress={onPress}>
      <Ionicons name={icon} size={14} color={primary ? "#fff" : "#D6E0ED"} />
      <Text style={[styles.actionText, primary && styles.actionPrimaryText, ghost && styles.actionGhostText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: design.colors.background },
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
  searchInput: { color: "#E6EDF8", flex: 1, fontSize: 13, fontWeight: "600", paddingVertical: 0 },
  radiusRow: { flexDirection: "row", gap: 7 },
  radiusChip: {
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
  radiusChipActive: {
    backgroundColor: "rgba(32,210,92,0.2)",
    borderColor: "#31DA6D",
  },
  radiusText: { color: "#B6C5D7", fontSize: 12, fontWeight: "700" },
  radiusTextActive: { color: "#A4F7C1", fontWeight: "800" },
  emptySearchNotice: {
    minHeight: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A3B50",
    backgroundColor: "rgba(8,12,18,0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  emptySearchText: { color: "#BBD0E7", fontSize: 11.5, fontWeight: "600", flex: 1 },
  locationNotice: {
    minHeight: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A3B50",
    backgroundColor: "rgba(8,12,18,0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  locationNoticeText: { color: "#BBD0E7", fontSize: 11.5, fontWeight: "500", flex: 1 },
  mapActions: { alignItems: "flex-end", gap: 10 },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: design.colors.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#43EC7D",
  },
  bottomSheetWrap: {
    position: "absolute",
    left: 10,
    right: 10,
  },
  bottomSheetCard: {
    borderRadius: 18,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(194,210,228,0.35)",
    marginTop: 8,
  },
  sheet: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, position: "relative" },
  sheetCloseButton: {
    position: "absolute",
    top: 16,
    right: 20,
    zIndex: 3,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.66)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  sheetImage: {
    width: "100%",
    height: 110,
    borderRadius: 11,
    backgroundColor: "#14202E",
    marginBottom: 10,
  },
  title: { color: "#fff", fontWeight: "700", fontSize: 16, lineHeight: 21 },
  addr: { color: "#A0A7B4", marginTop: 4, fontSize: 12.5, lineHeight: 17, fontWeight: "500" },
  sheetKicker: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: design.colors.green,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    minHeight: 24,
    marginBottom: 8,
  },
  sheetKickerText: { color: "#06220F", fontSize: 10.5, fontWeight: "900", textTransform: "uppercase" },
  distanceText: { color: "#9BFFBE", marginTop: 7, fontSize: 12.5, fontWeight: "800" },
  schedule: { color: "#D9E5F7", marginTop: 8, fontSize: 12.5, fontWeight: "600" },
  description: { color: "#AFC0D5", marginTop: 7, fontSize: 12.5, lineHeight: 18 },
  actionsGrid: { flexDirection: "row", gap: 7, marginTop: 12 },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#0B1018",
    borderWidth: 1,
    borderColor: "#253246",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 7,
  },
  actionPrimary: { backgroundColor: "#1FAE4D", borderColor: "#35D669" },
  actionGhost: { backgroundColor: "transparent", borderColor: "#2A3749" },
  actionText: { color: "#E5E7EB", fontWeight: "600", fontSize: 11.5 },
  actionPrimaryText: { color: "#fff", fontWeight: "700" },
  actionGhostText: { color: "#AFBDCE" },
  pinOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2EBC5C",
    backgroundColor: "rgba(10,15,24,0.82)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  pinOuterActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderColor: "#7EF5A6",
  },
  pinInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#20D25C" },
  pinInnerActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#91FFBA" },
  draftPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: design.colors.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7EF5A6",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  formSheet: {
    backgroundColor: "#0D1117",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "88%",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  formTitle: { color: "#F7F7F8", fontWeight: "700", fontSize: 16 },
  formClose: { color: "#C9D9FF", fontSize: 13.5, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(156,176,202,0.2)",
    borderRadius: 12,
    color: "#E6EDF8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  label: { color: "#B7C8DB", fontSize: 12.5, fontWeight: "600", marginBottom: 7 },
  addressHint: { color: "#9FB5D0", fontSize: 12, marginBottom: 8 },
  fieldRow: { flexDirection: "row", gap: 8 },
  fieldLarge: { flex: 1 },
  fieldSmall: { width: 110 },
  rowWrap: { flexDirection: "row", gap: 8, marginBottom: 10 },
  secondaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#2B3A50",
    backgroundColor: "#111927",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  secondaryActionActive: { borderColor: "#2CFF7E", backgroundColor: "rgba(32,210,92,0.16)" },
  secondaryActionText: { color: "#C9D9FF", fontSize: 12.5, fontWeight: "600" },
  secondaryActionTextActive: { color: "#A4F7C1" },
  previewImage: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12, marginBottom: 10, backgroundColor: "#14202E" },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  dayChip: {
    minWidth: 42,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2C394C",
    backgroundColor: "#0A111A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 11,
  },
  dayChipActive: { backgroundColor: "rgba(32,210,92,0.18)", borderColor: "#2CFF7E" },
  dayChipText: { color: "#D7E3F2", fontWeight: "600", fontSize: 12 },
  dayChipTextActive: { color: "#7DFFAB", fontWeight: "700" },
  timeRow: { flexDirection: "row", gap: 10 },
  timeField: { flex: 1 },
  coordinates: { color: "#99AEC8", marginTop: 2, marginBottom: 8, fontSize: 12.5 },
  saveButton: {
    marginTop: 14,
    backgroundColor: design.colors.green,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 10,
  },
  saveButtonText: { color: "#06220F", fontWeight: "700", fontSize: 13.5 },
});
