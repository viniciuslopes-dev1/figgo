import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { requireOptionalNativeModule } from "expo-modules-core";
import { groups, specialSections } from "@/constants/albumData";

export type StickerLookup = {
  code: string;
  country: string;
  number: number;
};

export type ScanArea = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type TextElement = {
  text: string;
  frame: Rect;
  recognizedLanguages: string[];
};

type TextLine = {
  text: string;
  frame: Rect;
  recognizedLanguages: string[];
  elements: TextElement[];
};

type Block = {
  text: string;
  frame: Rect;
  recognizedLanguages: string[];
  lines: TextLine[];
};

type Text = {
  text: string;
  blocks: Block[];
};

type RecognizeTextFn = (imagePath: string) => Promise<Text>;

let cachedRecognizer: RecognizeTextFn | null | undefined;

const CANDIDATE_REGEX = /(FWC\d{1,3}|[A-Z]{3}\d{1,3})/g;

function getRecognizer() {
  if (cachedRecognizer !== undefined) return cachedRecognizer;
  const nativeModule = requireOptionalNativeModule<{ recognizeText?: RecognizeTextFn }>("RNMLKitTextRecognition");
  cachedRecognizer = typeof nativeModule?.recognizeText === "function" ? nativeModule.recognizeText : null;
  return cachedRecognizer;
}

export function buildStickerLookupMap() {
  const map = new Map<string, StickerLookup>();
  for (const group of groups) {
    for (const team of group.teams) {
      for (let number = 1; number <= 20; number += 1) {
        const code = `${team.code}${number}`;
        map.set(code, { code, country: team.name, number });
      }
    }
  }
  for (const section of specialSections) {
    for (const code of section.codes) {
      map.set(code, {
        code,
        country: section.title,
        number: Number(code.replace("FWC", "")) || 0,
      });
    }
  }
  return map;
}

function normalizeCandidate(raw: string) {
  const compact = raw.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
  if (!compact) return null;

  const match = compact.match(/^(FWC|[A-Z]{3})(\d{1,3})$/);
  if (!match) return null;

  const prefix = match[1];
  const normalizedNumber = String(Number(match[2]));
  if (normalizedNumber === "NaN") return null;
  return `${prefix}${normalizedNumber}`;
}

function intersectsScanArea(block: Block, width: number, height: number, scanArea: ScanArea) {
  const { left, top, right, bottom } = block.frame;
  const normalizedLeft = left / width;
  const normalizedTop = top / height;
  const normalizedRight = right / width;
  const normalizedBottom = bottom / height;
  return !(
    normalizedRight < scanArea.left ||
    normalizedLeft > scanArea.right ||
    normalizedBottom < scanArea.top ||
    normalizedTop > scanArea.bottom
  );
}

function collectCandidatesFromText(text: string, validCodes: Set<string>) {
  const normalizedText = text.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, " ");
  const candidates = new Set<string>();
  for (const match of normalizedText.matchAll(CANDIDATE_REGEX)) {
    const candidate = normalizeCandidate(match[1]);
    if (candidate && validCodes.has(candidate)) {
      candidates.add(candidate);
    }
  }
  return candidates;
}

export function resolveStickerCodeFromRecognition(
  recognition: Text,
  validCodes: Set<string>,
  imageSize?: { width?: number; height?: number },
  scanArea: ScanArea = { left: 0.18, top: 0.2, right: 0.82, bottom: 0.8 },
) {
  const width = imageSize?.width ?? 0;
  const height = imageSize?.height ?? 0;
  const scopedBlocks =
    width > 0 && height > 0
      ? recognition.blocks.filter((block) => intersectsScanArea(block, width, height, scanArea))
      : recognition.blocks;

  const scopedText = scopedBlocks.map((block) => block.text).join(" ");
  const scopedCandidates = collectCandidatesFromText(scopedText, validCodes);
  if (scopedCandidates.size > 0) return [...scopedCandidates][0];

  const fullCandidates = collectCandidatesFromText(recognition.text, validCodes);
  if (fullCandidates.size > 0) return [...fullCandidates][0];

  return null;
}

export async function detectStickerCodeFromImage(
  imageUri: string,
  validCodes: Set<string>,
  imageSize?: { width?: number; height?: number },
) {
  const recognizeText = getRecognizer();
  if (!recognizeText) {
    throw new Error("OCR_UNAVAILABLE");
  }

  const recognition = await recognizeText(imageUri);
  const directMatch = resolveStickerCodeFromRecognition(recognition, validCodes, imageSize);
  if (directMatch) return directMatch;

  // Fallback para figurinha deitada: roda a imagem e tenta OCR novamente.
  for (const rotation of [90, 270]) {
    const rotated = await manipulateAsync(
      imageUri,
      [{ rotate: rotation }],
      { compress: 0.8, format: SaveFormat.JPEG },
    );
    const rotatedRecognition = await recognizeText(rotated.uri);
    const rotatedMatch = resolveStickerCodeFromRecognition(rotatedRecognition, validCodes);
    if (rotatedMatch) return rotatedMatch;
  }

  return null;
}
