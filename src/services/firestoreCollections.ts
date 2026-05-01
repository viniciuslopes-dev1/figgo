import { collection, doc, getDocs, limit, orderBy, query, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function saveMapPoint(payload: {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  createdBy: string;
}) {
  if (!db) return;
  await setDoc(doc(db, "mapPoints", payload.id), {
    ...payload,
    createdAt: Timestamp.now(),
    approved: false,
  });
}

export async function getLatestPosts() {
  if (!db) return [];
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}
