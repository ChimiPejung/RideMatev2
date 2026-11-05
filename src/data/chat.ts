import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ChatMessage, DmThread, Student } from './types';

const PAGE = 30;

function parseMessage(d: QueryDocumentSnapshot): ChatMessage {
  const x = d.data({ serverTimestamps: 'estimate' });
  return {
    id: d.id,
    senderId: x.senderId,
    senderName: x.senderName ?? '',
    text: x.text ?? '',
    sentAt: x.sentAt instanceof Timestamp ? x.sentAt.toDate() : new Date(),
    system: !!x.system,
  };
}

/**
 * Latest 30 messages live, older ones loaded a page at a time.
 * `path` is the messages collection, e.g. ['groups', id, 'messages'].
 * Returned oldest-first.
 */
export function useMessages(path: [string, string, string] | null) {
  const key = path?.join('/') ?? '';
  // State is tagged with the chat it belongs to, so switching chats starts empty.
  type S = { key: string; latest: ChatMessage[]; older: ChatMessage[]; hasMore: boolean; loaded: boolean; error: string | null };
  const empty = (k: string): S => ({ key: k, latest: [], older: [], hasMore: false, loaded: false, error: null });
  const [raw, setRaw] = useState<S>(() => empty(key));
  const st = raw.key === key ? raw : empty(key);
  const oldestDoc = useRef<{ key: string; doc: QueryDocumentSnapshot } | null>(null);

  useEffect(() => {
    if (!path) return;
    const q = query(collection(db, ...path), orderBy('sentAt', 'desc'), limit(PAGE));
    return onSnapshot(
      q,
      (snap) => {
        // Only set the paging cursor once, so new messages don't move it.
        if (oldestDoc.current?.key !== key && snap.docs.length > 0) {
          oldestDoc.current = { key, doc: snap.docs[snap.docs.length - 1] };
        }
        const latest = snap.docs.map(parseMessage).reverse();
        setRaw((r) => {
          const base = r.key === key ? r : empty(key);
          return { ...base, latest, hasMore: base.hasMore || snap.docs.length === PAGE, loaded: true, error: null };
        });
      },
      (err) => setRaw((r) => ({ ...(r.key === key ? r : empty(key)), loaded: true, error: err.message })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loadOlder = useCallback(async () => {
    const cursor = oldestDoc.current;
    if (!path || !cursor || cursor.key !== key) return;
    const q = query(collection(db, ...path), orderBy('sentAt', 'desc'), startAfter(cursor.doc), limit(PAGE));
    const snap = await getDocs(q);
    if (snap.docs.length > 0) oldestDoc.current = { key, doc: snap.docs[snap.docs.length - 1] };
    const page = snap.docs.map(parseMessage).reverse();
    setRaw((r) => (r.key === key ? { ...r, older: [...page, ...r.older], hasMore: snap.docs.length === PAGE } : r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const seen = new Set<string>();
  const messages = [...st.older, ...st.latest].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  return { messages, hasMore: st.hasMore, loadOlder, loading: !!path && !st.loaded, error: st.error };
}

export async function sendGroupMessage(groupId: string, me: Student, text: string) {
  const t = text.trim();
  if (!t) return;
  await addDoc(collection(db, 'groups', groupId, 'messages'), {
    senderId: me.uid,
    senderName: me.name,
    text: t,
    system: false,
    sentAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------- direct messages

export function dmId(a: string, b: string) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export type DmPeer = { uid: string; name: string; initials: string };

/** Creates the thread if needed. Must run before listening to its messages. */
export async function openDm(me: Student, other: DmPeer, context?: string) {
  const id = dmId(me.uid, other.uid);
  const members = [me.uid, other.uid].sort();
  await setDoc(
    doc(db, 'dms', id),
    {
      members,
      names: { [me.uid]: me.name, [other.uid]: other.name },
      initials: { [me.uid]: me.initials, [other.uid]: other.initials },
      ...(context ? { context } : {}),
    },
    { merge: true },
  );
  return id;
}

export async function sendDm(threadId: string, me: Student, text: string) {
  const t = text.trim();
  if (!t) return;
  await addDoc(collection(db, 'dms', threadId, 'messages'), {
    senderId: me.uid,
    senderName: me.name,
    text: t,
    sentAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'dms', threadId), {
    lastText: t,
    lastSenderId: me.uid,
    updatedAt: serverTimestamp(),
  });
}

export function useMyDms(uid: string | undefined) {
  const [threads, setThreads] = useState<DmThread[]>([]);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'dms'), where('members', 'array-contains', uid), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const x = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            members: x.members ?? [],
            names: x.names ?? {},
            initials: x.initials ?? {},
            lastText: x.lastText ?? '',
            lastSenderId: x.lastSenderId ?? '',
            updatedAt: x.updatedAt instanceof Timestamp ? x.updatedAt.toDate() : new Date(0),
            context: x.context,
          } as DmThread;
        });
        list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        setThreads(list);
      },
      () => setThreads([]),
    );
  }, [uid]);
  return threads;
}

/** Most recent message in a group chat (used for notifications and the Chats list). */
export function subscribeLatestGroupMessage(groupId: string, cb: (m: ChatMessage | null) => void) {
  const q = query(collection(db, 'groups', groupId, 'messages'), orderBy('sentAt', 'desc'), limit(1));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs[0] ? parseMessage(snap.docs[0]) : null),
    () => cb(null),
  );
}
