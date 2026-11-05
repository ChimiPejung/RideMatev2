import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { MAX_SEATS, placeById, routeKey, type RideType } from '../config';
import { farePerPerson, formatNu } from '../lib/fare';
import { windowRange, type WindowId } from '../lib/time';
import { db } from './firebase';
import { firstName, type Member, type RideGroup, type Student } from './types';

const groupsCol = collection(db, 'groups');

export function parseGroup(snap: DocumentSnapshot): RideGroup | null {
  const d = snap.data({ serverTimestamps: 'estimate' });
  if (!d) return null;
  return {
    id: snap.id,
    routeKey: d.routeKey,
    fromId: d.fromId,
    toId: d.toId,
    departure: (d.departure as Timestamp).toDate(),
    rideType: d.rideType as RideType,
    pickup: d.pickup ?? '',
    fare: d.fare ?? 0,
    seats: d.seats ?? MAX_SEATS,
    createdBy: d.createdBy,
    memberIds: d.memberIds ?? [],
    members: d.members ?? {},
  };
}

export function routeLabel(g: Pick<RideGroup, 'fromId' | 'toId'>) {
  return `${placeById(g.fromId).short} → ${placeById(g.toId).short}`;
}

export function rideTypeLabel(g: Pick<RideGroup, 'rideType' | 'createdBy' | 'members'>) {
  if (g.rideType === 'car') {
    const driver = g.members[g.createdBy]?.name;
    return driver ? `${firstName(driver)}’s car` : 'Student car';
  }
  return g.rideType === 'auto' ? 'Auto' : 'Taxi';
}

export function isFull(g: RideGroup) {
  return g.memberIds.length >= g.seats;
}

export function seatsLeft(g: RideGroup) {
  return Math.max(0, g.seats - g.memberIds.length);
}

export function myShare(g: RideGroup) {
  return farePerPerson(g.fare, g.memberIds.length);
}

export function orderedMembers(g: RideGroup): (Member & { uid: string })[] {
  return g.memberIds
    .map((uid) => ({ uid, ...(g.members[uid] ?? { name: 'Rider', initials: '?', joinedAt: 0 }) }))
    .sort((a, b) => a.joinedAt - b.joinedAt);
}

// ---------------------------------------------------------------- live hooks

type Live<T> = { data: T; loading: boolean; error: string | null };

/** Re-renders every `ms` so departed groups drop off screens that stay open. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * Ride board: only upcoming groups on one route inside the chosen time window.
 * Needs the composite index in firestore.indexes.json (routeKey + departure).
 */
export function useRouteGroups(fromId: string, toId: string, windowId: WindowId): Live<RideGroup[]> {
  const key = `${fromId}>${toId}|${windowId}`;
  const [state, setState] = useState<{ key: string; data: RideGroup[]; error: string | null } | null>(null);
  useEffect(() => {
    const [start, end] = windowRange(windowId);
    const q = query(
      groupsCol,
      where('routeKey', '==', routeKey(fromId, toId)),
      where('departure', '>=', Timestamp.fromDate(start)),
      where('departure', '<=', Timestamp.fromDate(end)),
      orderBy('departure'),
      limit(50),
    );
    return onSnapshot(
      q,
      (snap) =>
        setState({
          key,
          data: snap.docs.map(parseGroup).filter((g): g is RideGroup => !!g),
          error: null,
        }),
      (err) => {
        // A missing-index error includes a link to create it; it shows in the Expo terminal.
        console.warn(err.message);
        setState({ key, data: [], error: err.message });
      },
    );
  }, [key, fromId, toId, windowId]);
  if (!state || state.key !== key) return { data: [], loading: true, error: null };
  return { data: state.data, loading: false, error: state.error };
}

/** Every group the student is in, past and upcoming, sorted by departure. */
export function useMyGroups(uid: string | undefined): Live<RideGroup[]> {
  const [state, setState] = useState<Live<RideGroup[]>>({ data: [], loading: true, error: null });
  useEffect(() => {
    if (!uid) return;
    const q = query(groupsCol, where('memberIds', 'array-contains', uid), limit(200));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(parseGroup).filter((g): g is RideGroup => !!g);
        list.sort((a, b) => a.departure.getTime() - b.departure.getTime());
        setState({ data: list, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
  }, [uid]);
  return state;
}

export function useGroup(id: string): Live<RideGroup | null> & { deleted: boolean } {
  const [state, setState] = useState<Live<RideGroup | null> & { deleted: boolean }>({
    data: null,
    loading: true,
    error: null,
    deleted: false,
  });
  useEffect(() => {
    return onSnapshot(
      doc(db, 'groups', id),
      (snap) => setState({ data: parseGroup(snap), loading: false, error: null, deleted: !snap.exists() }),
      (err) => setState({ data: null, loading: false, error: err.message, deleted: false }),
    );
  }, [id]);
  return state;
}

/** For the home greeting: groups leaving on any route in the next hour. */
export function useLeavingSoonCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const now = new Date();
    const q = query(
      groupsCol,
      where('departure', '>=', Timestamp.fromDate(now)),
      where('departure', '<=', Timestamp.fromDate(new Date(now.getTime() + 60 * 60 * 1000))),
      limit(50),
    );
    return onSnapshot(
      q,
      (snap) => setCount(snap.size),
      () => setCount(0),
    );
  }, []);
  return count;
}

// ---------------------------------------------------------------- writes

export type NewGroup = {
  fromId: string;
  toId: string;
  departure: Date;
  rideType: RideType;
  pickup: string;
  fare: number;
};

function memberEntry(me: Student) {
  return { name: me.name, initials: me.initials, joinedAt: Date.now() };
}

async function postSystem(groupId: string, me: Student, text: string) {
  return addDoc(collection(db, 'groups', groupId, 'messages'), {
    senderId: me.uid,
    senderName: me.name,
    text,
    system: true,
    sentAt: serverTimestamp(),
  });
}

export async function createGroup(input: NewGroup, me: Student): Promise<string> {
  const ref = await addDoc(groupsCol, {
    routeKey: routeKey(input.fromId, input.toId),
    fromId: input.fromId,
    toId: input.toId,
    departure: Timestamp.fromDate(input.departure),
    rideType: input.rideType,
    pickup: input.pickup.trim(),
    fare: Math.max(0, Math.round(input.fare)),
    seats: MAX_SEATS,
    createdBy: me.uid,
    memberIds: [me.uid],
    members: { [me.uid]: memberEntry(me) },
    createdAt: serverTimestamp(),
  });
  await postSystem(ref.id, me, `${firstName(me.name)} created this group.`).catch(() => {});
  return ref.id;
}

export class GroupError extends Error {}

/** Runs in a transaction so two students can never take the last seat together. */
export async function joinGroup(groupId: string, me: Student) {
  const ref = doc(db, 'groups', groupId);
  const after = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const g = parseGroup(snap);
    if (!g) throw new GroupError('This group no longer exists.');
    if (g.memberIds.includes(me.uid)) return g;
    if (g.departure.getTime() <= Date.now()) throw new GroupError('This ride has already left.');
    if (g.memberIds.length >= g.seats) throw new GroupError('Someone just took the last seat.');
    const memberIds = [...g.memberIds, me.uid];
    const members = { ...g.members, [me.uid]: memberEntry(me) };
    tx.update(ref, { memberIds, members });
    return { ...g, memberIds, members };
  });
  const each = farePerPerson(after.fare, after.memberIds.length);
  const fareText = after.fare > 0 ? ` Fare is now ${formatNu(each)} each.` : '';
  await postSystem(groupId, me, `${firstName(me.name)} joined.${fareText}`).catch(() => {});
}

export async function leaveGroup(groupId: string, me: Student) {
  const ref = doc(db, 'groups', groupId);
  const before = parseGroup(await getDoc(ref));
  if (!before || !before.memberIds.includes(me.uid)) return;
  if (before.departure.getTime() <= Date.now()) throw new GroupError('This ride has already left.');

  if (before.memberIds.length === 1) {
    // Last rider out: remove the chat first (needs membership), then the group.
    const msgs = await getDocs(collection(db, 'groups', groupId, 'messages'));
    for (let i = 0; i < msgs.docs.length; i += 400) {
      const batch = writeBatch(db);
      msgs.docs.slice(i, i + 400).forEach((m) => batch.delete(m.ref));
      await batch.commit();
    }
    await runTransaction(db, async (tx) => {
      const g = parseGroup(await tx.get(ref));
      if (!g) return;
      if (g.memberIds.length === 1 && g.memberIds[0] === me.uid) {
        tx.delete(ref);
      } else {
        const members = { ...g.members };
        delete members[me.uid];
        tx.update(ref, { memberIds: g.memberIds.filter((u) => u !== me.uid), members });
      }
    });
    return;
  }

  // Post the notice while still a member, then leave. Undo the notice if leaving fails.
  const remaining = before.memberIds.length - 1;
  const fareText = before.fare > 0 ? ` Fare is now ${formatNu(farePerPerson(before.fare, remaining))} each.` : '';
  const notice = await postSystem(groupId, me, `${firstName(me.name)} left.${fareText}`).catch(() => null);
  try {
    await runTransaction(db, async (tx) => {
      const g = parseGroup(await tx.get(ref));
      if (!g || !g.memberIds.includes(me.uid)) return;
      const members = { ...g.members };
      delete members[me.uid];
      tx.update(ref, { memberIds: g.memberIds.filter((u) => u !== me.uid), members });
    });
  } catch (e) {
    if (notice) await deleteDoc(notice).catch(() => {});
    throw e;
  }
}
