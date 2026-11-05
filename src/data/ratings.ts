import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Rating, RideGroup, Student } from './types';

export type RatingSummary = { average: number | null; count: number; noShows: number };

export const EMPTY_SUMMARY: RatingSummary = { average: null, count: 0, noShows: 0 };

export function ratingId(groupId: string, raterId: string, ratedId: string) {
  return `${groupId}_${raterId}_${ratedId}`;
}

function summarise(list: Rating[]): RatingSummary {
  const scored = list.filter((r) => !r.noShow && r.stars > 0);
  const sum = scored.reduce((a, r) => a + r.stars, 0);
  return {
    average: scored.length ? sum / scored.length : null,
    count: scored.length,
    noShows: list.filter((r) => r.noShow).length,
  };
}

function parse(d: { id: string; data: () => any }): Rating {
  const x = d.data();
  return { id: d.id, groupId: x.groupId, raterId: x.raterId, ratedId: x.ratedId, stars: x.stars ?? 0, noShow: !!x.noShow };
}

/**
 * Ratings received by up to 30 riders, summarised per rider.
 * Averages are worked out from the ratings themselves, so nobody can edit
 * someone else's score directly.
 */
export function useRatingSummaries(uids: string[]): Record<string, RatingSummary> {
  const key = [...uids].sort().join(',');
  const [state, setState] = useState<{ key: string; map: Record<string, RatingSummary> }>({ key: '', map: {} });
  useEffect(() => {
    const ids = key ? key.split(',').slice(0, 30) : [];
    if (ids.length === 0) return;
    const q = query(collection(db, 'ratings'), where('ratedId', 'in', ids));
    return onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map(parse);
        const out: Record<string, RatingSummary> = {};
        for (const id of ids) out[id] = summarise(all.filter((r) => r.ratedId === id));
        setState({ key, map: out });
      },
      () => setState({ key, map: {} }),
    );
  }, [key]);
  return state.key === key ? state.map : {};
}

/** Group ids this student has already rated. */
export function useRatedGroupIds(uid: string | undefined): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'ratings'), where('raterId', '==', uid));
    return onSnapshot(
      q,
      (snap) => setIds(new Set(snap.docs.map((d) => d.data().groupId as string))),
      () => setIds(new Set()),
    );
  }, [uid]);
  return ids;
}

export type RatingInput = { ratedId: string; stars: number; noShow: boolean };

export async function submitRatings(group: RideGroup, me: Student, entries: RatingInput[]) {
  const batch = writeBatch(db);
  for (const e of entries) {
    if (e.ratedId === me.uid) continue;
    batch.set(doc(db, 'ratings', ratingId(group.id, me.uid, e.ratedId)), {
      groupId: group.id,
      raterId: me.uid,
      ratedId: e.ratedId,
      stars: e.noShow ? 0 : e.stars,
      noShow: e.noShow,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}
