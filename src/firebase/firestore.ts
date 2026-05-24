import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { FIRESTORE_COLLECTIONS } from '../constants';
import type { SportEvent, Message, Chat, User } from '../utils/types';

// ─── Events ───────────────────────────────────────────────────────────────────
export async function createEvent(eventData: Omit<SportEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, FIRESTORE_COLLECTIONS.EVENTS), {
    ...eventData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getEvents(filters?: {
  sport?: string;
  skillLevel?: string;
  limitCount?: number;
}): Promise<SportEvent[]> {
  const constraints: QueryConstraint[] = [
    where('status', '==', 'upcoming'),
    orderBy('date', 'asc'),
  ];

  if (filters?.sport) {
    constraints.push(where('sport', '==', filters.sport));
  }
  if (filters?.skillLevel) {
    constraints.push(where('skillLevel', '==', filters.skillLevel));
  }
  if (filters?.limitCount) {
    constraints.push(limit(filters.limitCount));
  }

  const q = query(collection(db, FIRESTORE_COLLECTIONS.EVENTS), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: (d.data().date as Timestamp)?.toDate() || new Date(),
    createdAt: (d.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (d.data().updatedAt as Timestamp)?.toDate() || new Date(),
  })) as SportEvent[];
}

export async function getEventById(eventId: string): Promise<SportEvent | null> {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.EVENTS, eventId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    date: (data.date as Timestamp)?.toDate() || new Date(),
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
  } as SportEvent;
}

export async function joinEvent(eventId: string, participant: {
  uid: string;
  displayName: string;
  avatar?: string;
}): Promise<void> {
  const eventRef = doc(db, FIRESTORE_COLLECTIONS.EVENTS, eventId);
  await updateDoc(eventRef, {
    participants: arrayUnion({
      ...participant,
      confirmed: true,
      joinedAt: new Date(),
    }),
    currentPlayers: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export async function leaveEvent(eventId: string, uid: string): Promise<void> {
  const event = await getEventById(eventId);
  if (!event) return;
  const participant = event.participants.find((p) => p.uid === uid);
  if (!participant) return;

  const eventRef = doc(db, FIRESTORE_COLLECTIONS.EVENTS, eventId);
  await updateDoc(eventRef, {
    participants: arrayRemove(participant),
    currentPlayers: increment(-1),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToEvents(callback: (events: SportEvent[]) => void) {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.EVENTS),
    where('status', '==', 'upcoming'),
    orderBy('date', 'asc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      date: (d.data().date as Timestamp)?.toDate() || new Date(),
      createdAt: (d.data().createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (d.data().updatedAt as Timestamp)?.toDate() || new Date(),
    })) as SportEvent[];
    callback(events);
  });
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export async function sendMessage(chatId: string, message: Omit<Message, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(
    collection(db, FIRESTORE_COLLECTIONS.CHATS, chatId, FIRESTORE_COLLECTIONS.MESSAGES),
    {
      ...message,
      createdAt: serverTimestamp(),
    }
  );

  // Update chat's last message
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.CHATS, chatId), {
    lastMessage: { ...message, id: ref.id, createdAt: new Date() },
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.CHATS, chatId, FIRESTORE_COLLECTIONS.MESSAGES),
    orderBy('createdAt', 'asc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp)?.toDate() || new Date(),
    })) as Message[];
    callback(messages);
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getUsers(limitCount = 10): Promise<User[]> {
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.USERS),
    orderBy('rating', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() })) as User[];
}
