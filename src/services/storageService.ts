import * as ImagePicker from "expo-image-picker";
import { supabase, supabaseEnabled } from "@/services/supabase";

const POST_BUCKET_NAME = "post-images";
const TRADE_POINT_BUCKET_NAME = "trade-point-facades";
const PROFILE_BUCKET_NAME = "post-images";

function requireSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error("Supabase nao configurado no app.");
  }
  return supabase;
}

function parseStorageError(error: unknown) {
  const fallback = "Falha no upload da imagem.";
  const raw =
    typeof error === "object" && error !== null
      ? (error as { message?: string; code?: string; details?: string; hint?: string })
      : null;
  const msg = raw?.message || (error instanceof Error ? error.message : "");
  const code = raw?.code || "";
  const details = raw?.details || "";
  const hint = raw?.hint || "";
  const composed = [msg, code ? `code=${code}` : "", details, hint].filter(Boolean).join(" | ");
  if (!msg) return fallback;
  if (msg.includes("Bucket not found")) return "Bucket de imagens nao encontrado no Supabase.";
  if (msg.toLowerCase().includes("row-level security")) {
    return "Permissao negada no Storage. Verifique as politicas do bucket post-images.";
  }
  return composed || fallback;
}

export async function pickImageFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("Permissao da galeria negada.");

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets.length) return null;
  return result.assets[0];
}

export async function uploadPostImage(userId: string, localUri: string, mimeType?: string) {
  return uploadImageToBucket(POST_BUCKET_NAME, userId, localUri, mimeType);
}

export async function uploadTradePointFacadeImage(userId: string, localUri: string, mimeType?: string) {
  return uploadImageToBucket(TRADE_POINT_BUCKET_NAME, userId, localUri, mimeType);
}

export async function uploadProfileAvatarImage(userId: string, localUri: string, mimeType?: string) {
  return uploadImageToBucket(PROFILE_BUCKET_NAME, userId, localUri, mimeType, "avatar");
}

export async function uploadProfileCoverImage(userId: string, localUri: string, mimeType?: string) {
  return uploadImageToBucket(PROFILE_BUCKET_NAME, userId, localUri, mimeType, "cover");
}

async function uploadImageToBucket(
  bucketName: string,
  userId: string,
  localUri: string,
  mimeType?: string,
  namespace?: string,
) {
  const client = requireSupabase();

  const fileRes = await fetch(localUri);
  const contentType = mimeType ?? fileRes.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) throw new Error("Apenas imagens sao permitidas.");

  const ext = contentType.split("/")[1] || "jpg";
  const prefix = namespace ? `${namespace}/` : "";
  const path = `${prefix}${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const arrayBuffer = await fileRes.arrayBuffer();

  const { error } = await client.storage.from(bucketName).upload(path, arrayBuffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(parseStorageError(error));

  const { data } = client.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}
