import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import type { JournalEntry, UserProfile, InteractionMessage } from '../types';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();

// Authentication Instance
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore Instance with specific database ID if configured
export const db: Firestore = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively removes all undefined fields from objects before sending to Firestore
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Sign in using Google Federated Authentication
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('reflectai_auth_token');
  }
  await firebaseSignOut(auth);
}

/**
 * Get fresh auth bearer token for backend API calls
 */
export async function getFreshAuthBearerToken(): Promise<string> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken(false);
      if (token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('reflectai_auth_token', token);
        }
        return token;
      }
    } catch (e) {
      console.warn('Failed to get Firebase ID token directly, using fallback client JWT claims:', e);
    }
    const payload = {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      iss: 'https://securetoken.google.com/reflectai-vault',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    return btoa(JSON.stringify(payload));
  }
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('reflectai_auth_token');
    if (cached) return cached;
  }
  return 'demo-token';
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: UserProfile | null) => void): () => void {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      try {
        const token = await user.getIdToken(false);
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('reflectai_auth_token', token);
        }
      } catch (_) {}
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('reflectai_auth_token');
      }
      callback(null);
    }
  });
}

/**
 * Collection reference for user-isolated journal entries
 * Path: /users/{userId}/entries/{entryId}
 */
export function getUserEntriesCol(userId: string) {
  return collection(db, 'users', userId, 'entries');
}

// Local storage helper for resilient fallback
function getLocalEntries(userId: string): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`reflectai_entries_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalEntries(userId: string, entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`reflectai_entries_${userId}`, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('reflectai-local-entries-updated', { detail: { userId } }));
  } catch (e) {
    console.warn('Could not persist local entries:', e);
  }
}

/**
 * Save or update a journal entry with guaranteed payload sanitization
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) throw new Error('User ID is required to save entry');
  if (!entry.id) throw new Error('Entry ID is required');

  const sanitized = stripUndefined({
    ...entry,
    userId,
    updatedAt: new Date().toISOString(),
  });

  // Always update local cache for instant zero-latency UI response
  const localList = getLocalEntries(userId);
  const existingIdx = localList.findIndex((e) => e.id === entry.id);
  if (existingIdx >= 0) {
    localList[existingIdx] = sanitized;
  } else {
    localList.unshift(sanitized);
  }
  setLocalEntries(userId, localList);

  if (!userId.startsWith('demo-')) {
    try {
      const entryRef = doc(db, 'users', userId, 'entries', entry.id);
      await setDoc(entryRef, sanitized, { merge: true });
    } catch (fsErr) {
      console.warn('Firestore sync notice (local backup maintained):', fsErr);
    }
  }
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) throw new Error('Missing userId or entryId for deletion');

  const localList = getLocalEntries(userId).filter((e) => e.id !== entryId);
  setLocalEntries(userId, localList);

  if (!userId.startsWith('demo-')) {
    try {
      const entryRef = doc(db, 'users', userId, 'entries', entryId);
      await deleteDoc(entryRef);
    } catch (fsErr) {
      console.warn('Firestore delete notice (local backup updated):', fsErr);
    }
  }
}

/**
 * Subscribe to real-time updates for a user's isolated journal entries
 */
export function subscribeToUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!userId) return () => {};

  // Initial local emit
  const initialLocal = getLocalEntries(userId);
  if (initialLocal.length > 0) {
    onUpdate(initialLocal);
  }

  const handleLocalUpdate = (evt: Event) => {
    const customEvt = evt as CustomEvent;
    if (customEvt.detail?.userId === userId) {
      onUpdate(getLocalEntries(userId));
    }
  };
  window.addEventListener('reflectai-local-entries-updated', handleLocalUpdate);

  if (userId.startsWith('demo-')) {
    return () => {
      window.removeEventListener('reflectai-local-entries-updated', handleLocalUpdate);
    };
  }

  const colRef = getUserEntriesCol(userId);
  let isUnsubscribed = false;

  const unsubscribeFs = onSnapshot(
    colRef,
    (snapshot) => {
      if (isUnsubscribed) return;
      const list: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as JournalEntry;
        list.push({
          ...data,
          id: docSnap.id,
          messages: Array.isArray(data.messages) ? data.messages : [],
          images: Array.isArray(data.images) ? data.images : [],
          keyThemes: Array.isArray(data.keyThemes) ? data.keyThemes : [],
          insights: Array.isArray(data.insights) ? data.insights : [],
        });
      });

      list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setLocalEntries(userId, list);
      onUpdate(list);
    },
    (error) => {
      console.warn('Firestore subscription fallback to local cache:', error?.message);
      onUpdate(getLocalEntries(userId));
      if (onError) onError(error);
    }
  );

  return () => {
    isUnsubscribed = true;
    window.removeEventListener('reflectai-local-entries-updated', handleLocalUpdate);
    unsubscribeFs();
  };
}
