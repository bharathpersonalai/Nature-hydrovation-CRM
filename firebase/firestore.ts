// firebase/firestore.ts
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { getDoc } from "firebase/firestore"; // place this near the other imports at top if not already present
import { db } from "./firebaseConfig";

/**
 * Add a new document to any collection
 * @param collectionName - name of firestore collection
 * @param data - object to store
 */
export async function addToCollection(collectionName: string, data: any) {
  const colRef = collection(db, collectionName);
  const result = await addDoc(colRef, {
    ...data,
    createdAt: Date.now(),
  });

  return result.id; // return generated document ID
}

/**
 * Update document
 */
export async function updateDocument(
  collectionName: string,
  docId: string,
  data: any
) {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

/**
 * Delete document
 */
export async function deleteDocument(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

/**
 * Real-time subscription to a collection
 * @param collectionName 
 * @param callback - receives an array of objects
 */
export function subscribeToCollection(
  collectionName: string,
  callback: (items: any[]) => void
) {
  const colRef = collection(db, collectionName);

  return onSnapshot(colRef, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(items);
  });
}

/**
 * Add a stock history entry for a product
 * @param entry - object containing: productId, productName, date, change, reason, newQuantity
 */
export async function addStockHistoryEntry(entry: {
  productId: string;
  productName: string;
  date?: string; // optional - will default to now if not provided
  change: number;
  reason: string;
  newQuantity: number;
}) {
  const payload = {
    ...entry,
    date: entry.date ?? new Date().toISOString(),
    createdAt: Date.now(),
  };
  const id = await addToCollection("stockHistory", payload);
  return id;
}

/**
 * Get a single document by collection and id
 * returns `null` if not found
 */
export async function getDocumentById(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}