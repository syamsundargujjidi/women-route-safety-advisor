import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { 
  signOut,
} from 'firebase/auth';
import { HistoryItem, SOSAlert } from '../types';
import { auth, app } from '../auth';

// Use the singleton instance from auth.ts
const getDb = (): Firestore | null => {
  try {
    return getFirestore(app);
  } catch (e) {
    console.warn("Firestore initialization error.", e);
    return null;
  }
};

/**
 * Sign Out
 */
export async function logoutUser() {
  if (auth) {
    await signOut(auth);
  }
}

const COLLECTIONS = {
  HISTORY: 'route_history',
  SOS: 'sos_alerts'
};

export async function saveRouteHistory(item: Omit<HistoryItem, 'id'>) {
  const firestore = getDb();
  if (!firestore) return saveToLocalFallback(item, 'history');

  try {
    const docRef = await addDoc(collection(firestore, COLLECTIONS.HISTORY), {
      ...item,
      serverTime: serverTimestamp()
    });
    return { ...item, id: docRef.id };
  } catch (error: any) {
    console.error("Firestore Error (History):", error);
    return saveToLocalFallback(item, 'history');
  }
}

export async function getRouteHistory(): Promise<HistoryItem[]> {
  const firestore = getDb();
  if (!firestore) return getLocalData<HistoryItem>('safety_app_history_fallback');

  try {
    const q = query(
      collection(firestore, COLLECTIONS.HISTORY), 
      orderBy('timestamp', 'desc'), 
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return getLocalData<HistoryItem>('safety_app_history_fallback');
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as HistoryItem[];
  } catch (error: any) {
    console.error("Firestore Error (Get History):", error);
    return getLocalData<HistoryItem>('safety_app_history_fallback');
  }
}

export async function triggerSOS(lat: number, lng: number): Promise<SOSAlert> {
  const alertData = { lat, lng, timestamp: Date.now(), status: 'active' as const };
  const firestore = getDb();
  if (!firestore) return saveToLocalFallback(alertData, 'sos') as any;

  try {
    const docRef = await addDoc(collection(firestore, COLLECTIONS.SOS), {
      ...alertData,
      serverTime: serverTimestamp()
    });
    return { ...alertData, id: docRef.id };
  } catch (error: any) {
    console.error("Firestore Error (SOS):", error);
    return saveToLocalFallback(alertData, 'sos') as any;
  }
}

function saveToLocalFallback(item: any, type: string) {
  const key = `safety_app_${type}_fallback`;
  const data = getLocalData<any>(key);
  const newItem = { ...item, id: `local_${Math.random().toString(36).substr(2, 9)}` };
  localStorage.setItem(key, JSON.stringify([newItem, ...data].slice(0, 50)));
  return newItem;
}

function getLocalData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}