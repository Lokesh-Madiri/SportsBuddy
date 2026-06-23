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
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  orderBy,
  setDoc,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { FIRESTORE_COLLECTIONS } from '../constants';
import type { SportEvent, Message, User, Chat, LeaderboardEntry } from '../utils/types';

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
  // Avoid composite index requirement — filter client-side for optional fields
  const constraints: QueryConstraint[] = [
    where('status', '==', 'upcoming'),
  ];

  if (filters?.limitCount) {
    constraints.push(limit(filters.limitCount));
  }

  const q = query(collection(db, FIRESTORE_COLLECTIONS.EVENTS), ...constraints);
  const snapshot = await getDocs(q);

  let results = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: (d.data().date as Timestamp)?.toDate() || new Date(),
    createdAt: (d.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (d.data().updatedAt as Timestamp)?.toDate() || new Date(),
  })) as SportEvent[];

  // Client-side filters for optional fields
  if (filters?.sport) results = results.filter((e) => e.sport === filters.sport);
  if (filters?.skillLevel) results = results.filter((e) => e.skillLevel === filters.skillLevel);

  // Sort by date ascending client-side
  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
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
  // Note: combining WHERE status + ORDER BY date requires a composite Firestore index.
  // Until the index is built, we query without orderBy and sort client-side.
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.EVENTS),
    where('status', '==', 'upcoming'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
        date: (d.data().date as Timestamp)?.toDate() || new Date(),
        createdAt: (d.data().createdAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (d.data().updatedAt as Timestamp)?.toDate() || new Date(),
      }))
      // Sort client-side by date ascending
      .sort((a, b) => (a as SportEvent).date.getTime() - (b as SportEvent).date.getTime()) as SportEvent[];
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

  // Trigger push notifications to other participants via Novu
  try {
    const chatSnap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.CHATS, chatId));
    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      const participants: string[] = chatData.participants || [];
      const otherParticipants = participants.filter((uid) => uid !== message.senderId);

      if (otherParticipants.length > 0) {
        const { novuService } = require('../services/notifications/novuService');
        await novuService.triggerNotification('chat-message', otherParticipants, {
          senderName: message.senderName,
          messageText: message.text,
          eventTitle: chatData.eventTitle || 'Game Chat',
          chatId,
        });
      }
    }
  } catch (err) {
    console.warn('[Firestore] Failed to trigger chat message push notification via Novu:', err);
  }

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

// ─── Event Management (edit / delete / complete) ──────────────────────────────
export async function updateEvent(
  eventId: string,
  data: Partial<Pick<SportEvent, 'title' | 'sport' | 'location' | 'date' | 'time' | 'endTime' | 'skillLevel' | 'maxPlayers' | 'description' | 'status'>>
): Promise<void> {
  const eventRef = doc(db, FIRESTORE_COLLECTIONS.EVENTS, eventId);
  await updateDoc(eventRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteEvent(eventId: string): Promise<void> {
  // Delete the event document
  await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.EVENTS, eventId));
  // Best-effort: delete associated chat document
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.CHATS, eventId));
  } catch {
    // Chat may not exist — non-critical
  }
}

export async function completeEvent(eventId: string): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.EVENTS, eventId), {
    status: 'completed',
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToEvent(
  eventId: string,
  callback: (event: SportEvent | null) => void
): () => void {
  return onSnapshot(doc(db, FIRESTORE_COLLECTIONS.EVENTS, eventId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    const data = snap.data();
    callback({
      id: snap.id,
      ...data,
      date: (data.date as Timestamp)?.toDate() || new Date(),
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
    } as SportEvent);
  });
}

// ─── Chat Subscriptions ────────────────────────────────────────────────────────
export async function ensureChat(chatId: string, eventId: string, eventTitle: string, participantIds: string[]): Promise<void> {
  const chatRef = doc(db, FIRESTORE_COLLECTIONS.CHATS, chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) {
    await setDoc(chatRef, {
      id: chatId,
      eventId,
      eventTitle,
      participants: participantIds,
      unreadCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export function subscribeToUserChats(
  userId: string,
  callback: (chats: Chat[]) => void
): () => void {
  // array-contains + orderBy requires a composite index — query without orderBy,
  // sort client-side to avoid the index requirement.
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.CHATS),
    where('participants', 'array-contains', userId),
    limit(30)
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
        } as Chat;
      })
      // Sort client-side: most recently updated first
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    callback(chats);
  });
}

// ─── Typing Indicators ─────────────────────────────────────────────────────────
const TYPING_TIMEOUT_MS = 4000;
const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export async function setTypingIndicator(
  chatId: string,
  userId: string,
  displayName: string,
  isTyping: boolean
): Promise<void> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.CHATS, chatId, FIRESTORE_COLLECTIONS.TYPING, userId);

  if (isTyping) {
    await setDoc(ref, { uid: userId, displayName, updatedAt: Date.now() });
    // Auto-clear after timeout
    if (typingTimers[`${chatId}:${userId}`]) clearTimeout(typingTimers[`${chatId}:${userId}`]);
    typingTimers[`${chatId}:${userId}`] = setTimeout(() => {
      deleteDoc(ref).catch(() => null);
    }, TYPING_TIMEOUT_MS);
  } else {
    if (typingTimers[`${chatId}:${userId}`]) clearTimeout(typingTimers[`${chatId}:${userId}`]);
    await deleteDoc(ref).catch(() => null);
  }
}

export function subscribeToTyping(
  chatId: string,
  currentUserId: string,
  callback: (typingNames: string[]) => void
): () => void {
  return onSnapshot(
    collection(db, FIRESTORE_COLLECTIONS.CHATS, chatId, FIRESTORE_COLLECTIONS.TYPING),
    (snapshot) => {
      const now = Date.now();
      const names = snapshot.docs
        .filter((d) => d.id !== currentUserId)
        .filter((d) => now - (d.data().updatedAt || 0) < TYPING_TIMEOUT_MS)
        .map((d) => d.data().displayName as string);
      callback(names);
    }
  );
}

// ─── Online Status ─────────────────────────────────────────────────────────────
export async function setUserOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, uid), {
      isOnline,
      lastSeen: serverTimestamp(),
    });
  } catch {
    // Non-critical — user doc may not exist yet
  }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export async function getLeaderboard(
  sport?: string,
  limitCount = 50
): Promise<LeaderboardEntry[]> {
  // Fetch top-rated users; filter by sport client-side if needed
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.USERS),
    orderBy('rating', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);

  let users = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      displayName: data.displayName || 'Player',
      photoURL: data.photoURL,
      sport: data.favoriteSport || (data.sports?.[0] ?? ''),
      gamesPlayed: data.stats?.gamesPlayed || 0,
      rating: data.rating || 0,
      sportsmanshipScore: data.reputation?.sportsmanshipScore || data.sportsmanshipScore || 0,
      reliabilityScore: data.reputation?.reliabilityScore || data.reliabilityScore || 0,
      communityScore: data.reputation?.communityScore || 0,
      trustedBadge: data.reputation?.trustedBadge ?? false,
      trustLevel: data.reputation?.trustLevel || 'new',
      rank: 0,
    } as LeaderboardEntry;
  });

  if (sport) {
    users = users.filter(
      (u) =>
        u.sport?.toLowerCase() === sport.toLowerCase() ||
        (Array.isArray((u as any).sports) &&
          (u as any).sports.some((s: string) => s.toLowerCase() === sport.toLowerCase()))
    );
  }

  // Assign ranks
  return users.map((u, i) => ({ ...u, rank: i + 1 }));
}
