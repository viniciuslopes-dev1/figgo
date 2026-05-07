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

export const DEFAULT_SCAN_AREA: ScanArea = { left: 0.08, top: 0.28, right: 0.92, bottom: 0.72 };

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
const TOKEN_REGEX = /[A-Z0-9]{4,6}/g;

export class OcrUnavailableError extends Error {
  constructor() {
    super("OCR_UNAVAILABLE");
    this.name = "OcrUnavailableError";
  }
}

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

function getPrefixCharVariants(value: string) {
  if (value === "0") return ["O"];
  if (value === "1") return ["I", "L"];
  if (value === "5") return ["S"];
  if (value === "8") return ["B"];
  if (value === "I") return ["I", "L"];
  if (value === "L") return ["L", "I"];
  return [value];
}

function getPrefixVariants(rawPrefix: string) {
  return rawPrefix.split("").reduce<string[]>(
    (prefixes, char) => prefixes.flatMap((prefix) => getPrefixCharVariants(char).map((variant) => `${prefix}${variant}`)),
    [""],
  );
}

function normalizeCandidateVariants(raw: string) {
  const compact = raw.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
  if (!compact) return [];

  const match = compact.match(/^(FWC|[A-Z0-9]{3})([A-Z0-9]{1,3})$/);
  if (!match) return [];

  const normalizedNumber = String(
    Number(
      match[2]
        .replace(/[OQD]/g, "0")
        .replace(/[IL]/g, "1")
        .replace(/S/g, "5")
        .replace(/B/g, "8"),
    ),
  );
  if (normalizedNumber === "NaN") return [];

  const prefixes = match[1] === "FWC" ? ["FWC"] : getPrefixVariants(match[1]);
  return prefixes.map((prefix) => `${prefix}${normalizedNumber}`);
}

export function resolveStickerCodeFromText(text: string, validCodes: Set<string>) {
  const normalizedText = text.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, " ");
  const compactText = normalizedText.replace(/\s+/g, "");
  const rawCandidates = new Set<string>();

  for (const match of normalizedText.matchAll(CANDIDATE_REGEX)) {
    rawCandidates.add(match[1]);
  }
  for (const match of normalizedText.matchAll(TOKEN_REGEX)) {
    rawCandidates.add(match[0]);
  }
  for (let index = 0; index < compactText.length; index += 1) {
    for (const size of [4, 5, 6]) {
      const slice = compactText.slice(index, index + size);
      if (slice.length === size) rawCandidates.add(slice);
    }
  }

  for (const rawCandidate of rawCandidates) {
    for (const candidate of normalizeCandidateVariants(rawCandidate)) {
      if (validCodes.has(candidate)) return candidate;
    }
  }

  return null;
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
  const candidates = new Set<string>();
  const candidate = resolveStickerCodeFromText(text, validCodes);
  if (candidate) {
    candidates.add(candidate);
  }
  return candidates;
}

export function resolveStickerCodeFromRecognition(
  recognition: Text,
  validCodes: Set<string>,
  imageSize?: { width?: number; height?: number },
  scanArea: ScanArea = DEFAULT_SCAN_AREA,
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

async function cropImageToScanArea(imageUri: string, imageSize: { width?: number; height?: number }, scanArea: ScanArea) {
  const width = imageSize.width ?? 0;
  const height = imageSize.height ?? 0;
  if (width <= 0 || height <= 0) return null;

  const originX = Math.max(0, Math.floor(width * scanArea.left));
  const originY = Math.max(0, Math.floor(height * scanArea.top));
  const cropWidth = Math.max(1, Math.min(width - originX, Math.floor(width * (scanArea.right - scanArea.left))));
  const cropHeight = Math.max(1, Math.min(height - originY, Math.floor(height * (scanArea.bottom - scanArea.top))));

  return manipulateAsync(
    imageUri,
    [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
    { compress: 0.9, format: SaveFormat.JPEG },
  );
}

async function recognizeAndResolve(recognizeText: RecognizeTextFn, imageUri: string, validCodes: Set<string>, imageSize?: { width?: number; height?: number }) {
  const recognition = await recognizeText(imageUri);
  return resolveStickerCodeFromRecognition(recognition, validCodes, imageSize);
}

export async function detectStickerCodeFromImage(
  imageUri: string,
  validCodes: Set<string>,
  imageSize?: { width?: number; height?: number },
  scanArea: ScanArea = DEFAULT_SCAN_AREA,
) {
  const recognizeText = getRecognizer();
  if (!recognizeText) {
    throw new OcrUnavailableError();
  }

  const cropped = imageSize ? await cropImageToScanArea(imageUri, imageSize, scanArea) : null;
  const croppedMatch = cropped ? await recognizeAndResolve(recognizeText, cropped.uri, validCodes, { width: cropped.width, height: cropped.height }) : null;
  if (croppedMatch) return croppedMatch;

  const directMatch = await recognizeAndResolve(recognizeText, imageUri, validCodes, imageSize);
  if (directMatch) return directMatch;

  // Fallback para figurinha deitada: roda a imagem e tenta OCR novamente.
  for (const source of [cropped?.uri, imageUri].filter(Boolean) as string[]) {
    for (const rotation of [90, 270]) {
    const rotated = await manipulateAsync(
      source,
      [{ rotate: rotation }],
      { compress: 0.8, format: SaveFormat.JPEG },
    );
    const rotatedMatch = await recognizeAndResolve(recognizeText, rotated.uri, validCodes, { width: rotated.width, height: rotated.height });
    if (rotatedMatch) return rotatedMatch;
    }
  }

  return null;
}
