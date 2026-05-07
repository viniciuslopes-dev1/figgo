import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { CameraCapturedPicture, CameraView, useCameraPermissions } from "expo-camera";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import {
  buildStickerLookupMap,
  detectStickerCodeFromImage,
  type StickerLookup,
} from "@/services/stickerScannerService";

type StickerScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onDetected: (payload: StickerLookup) => void;
};

const SCAN_INTERVAL_MS = 1300;
const SAME_CODE_COOLDOWN_MS = 2500;

export function StickerScannerModal({ visible, onClose, onDetected }: StickerScannerModalProps) {
  const lookupMap = useMemo(() => buildStickerLookupMap(), []);
  const validCodes = useMemo(() => new Set(lookupMap.keys()), [lookupMap]);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const [manualInput, setManualInput] = useState("");
  const [scannerStatus, setScannerStatus] = useState("Posicione o codigo da figurinha dentro da area");
  const [cameraReady, setCameraReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ocrUnavailable, setOcrUnavailable] = useState(false);
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);
  const [lastDetectedAt, setLastDetectedAt] = useState(0);

  useEffect(() => {
    if (!visible) return;
    void requestPermission();
    setOcrUnavailable(false);
  }, [requestPermission, visible]);

  useEffect(() => {
    if (!visible) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scanLineAnim, visible]);

  const emitDetection = useCallback(
    (code: string) => {
      const foundSticker = lookupMap.get(code);
      if (!foundSticker) {
        setScannerStatus("Codigo valido nao pertence ao album.");
        return;
      }
      setScannerStatus(`Codigo ${code} encontrado!`);
      setLastDetectedCode(code);
      setLastDetectedAt(Date.now());
      Vibration.vibrate(35);
      onDetected(foundSticker);
    },
    [lookupMap, onDetected],
  );

  const normalizeManualCode = useCallback((raw: string) => {
    const normalized = raw.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
    const match = normalized.match(/^(FWC|[A-Z]{3})(\d{1,3})$/);
    if (!match) return null;
    const code = `${match[1]}${Number(match[2])}`;
    if (!validCodes.has(code)) return null;
    return code;
  }, [validCodes]);

  const scanFromCameraFrame = useCallback(async () => {
    if (ocrUnavailable) {
      setScannerStatus("OCR automatico indisponivel neste build. Use o codigo manual.");
      return;
    }
    if (!cameraRef.current || !cameraReady || processing || !visible) return;
    setProcessing(true);
    try {
      setScannerStatus("Escaneando...");
      const picture: CameraCapturedPicture = await cameraRef.current.takePictureAsync({
        quality: 0.35,
        skipProcessing: true,
      });
      const code = await detectStickerCodeFromImage(picture.uri, validCodes, {
        width: picture.width,
        height: picture.height,
      });
      if (!code) {
        setScannerStatus("Nao encontrou ainda. Ajuste luz e alinhamento.");
        return;
      }

      const now = Date.now();
      if (lastDetectedCode === code && now - lastDetectedAt < SAME_CODE_COOLDOWN_MS) {
        setScannerStatus(`Codigo ${code} ja lido. Aguarde...`);
        return;
      }
      emitDetection(code);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "OCR_UNAVAILABLE") {
        setOcrUnavailable(true);
        setScannerStatus("OCR automatico indisponivel neste build. Use o codigo manual.");
      } else {
        setScannerStatus("Falha na leitura OCR. Tente novamente ou use codigo manual.");
      }
    } finally {
      setProcessing(false);
    }
  }, [cameraReady, emitDetection, lastDetectedAt, lastDetectedCode, ocrUnavailable, processing, validCodes, visible]);

  useEffect(() => {
    if (!visible || !permission?.granted) return;
    const timer = setInterval(() => {
      void scanFromCameraFrame();
    }, SCAN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [permission?.granted, scanFromCameraFrame, visible]);

  function handleManualSubmit() {
    const code = normalizeManualCode(manualInput);
    if (!code) {
      setScannerStatus("Codigo invalido. Exemplo valido: SUI14");
      return;
    }
    emitDetection(code);
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
          />
        ) : (
          <View style={styles.permissionBlock}>
            <Text style={styles.permissionText}>Precisamos da permissao da camera para escanear.</Text>
            <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
              <Text style={styles.primaryButtonText}>Permitir camera</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <Text style={styles.scanLabel}>Escaneando...</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#E7F1FF" />
            </Pressable>
          </View>

          <View style={styles.guideOuter}>
            <View style={styles.guideFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 200],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.scanGlow} />
            </View>
            <Text style={styles.guideHint}>Posicione o codigo da figurinha dentro da area</Text>
            {ocrUnavailable && <Text style={styles.statusWarn}>Leitura automatica requer Development Build.</Text>}
            <Text style={styles.statusText}>{scannerStatus}</Text>
          </View>

          <View style={styles.bottomPanel}>
            <TextInput
              style={styles.manualInput}
              placeholder="Fallback manual: SUI14"
              placeholderTextColor="#8EA0B7"
              value={manualInput}
              autoCapitalize="characters"
              onChangeText={setManualInput}
            />
            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleManualSubmit}>
                <Text style={styles.primaryButtonText}>Validar codigo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#010203",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingTop: 52,
    paddingBottom: 26,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scanLabel: {
    color: "#E7F1FF",
    fontSize: 15,
    fontWeight: "800",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(232,245,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,10,16,0.68)",
  },
  guideOuter: {
    alignItems: "center",
    gap: 10,
  },
  guideFrame: {
    width: "88%",
    maxWidth: 340,
    aspectRatio: 1.18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(68,255,151,0.42)",
    overflow: "hidden",
    backgroundColor: "rgba(12,24,31,0.12)",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#5BFFB1",
  },
  cornerTopLeft: {
    top: 8,
    left: 8,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 8,
    right: 8,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#5BFFB1",
    shadowColor: "#5BFFB1",
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  scanGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    backgroundColor: "rgba(61,255,159,0.08)",
  },
  guideHint: {
    color: "#E0EDF9",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  statusText: {
    color: "#9FE7C2",
    fontSize: 12.5,
    fontWeight: "700",
    textAlign: "center",
  },
  statusWarn: {
    color: "#FFD17A",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  bottomPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(152,176,206,0.34)",
    backgroundColor: "rgba(8,14,21,0.9)",
    padding: 12,
    gap: 10,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: "rgba(152,176,206,0.35)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    color: "#E8F2FF",
    fontWeight: "700",
    backgroundColor: "rgba(6,10,15,0.85)",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2ED56B",
  },
  primaryButtonText: {
    color: "#07220F",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(152,176,206,0.35)",
    backgroundColor: "rgba(13,20,30,0.86)",
  },
  secondaryButtonText: {
    color: "#D9E6F8",
    fontSize: 13,
    fontWeight: "700",
  },
  permissionBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  permissionText: {
    color: "#E8F2FF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
