// Live data shared by every signed-in screen, plus the notification logic
// that watches it (reminders, joins/leaves, group full, new messages).
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { farePerPerson, formatNu } from '../lib/fare';
import { formatTime } from '../lib/time';
import { isChatOpen, notifyNow, syncReminders } from '../notifications';
import { useMe } from './auth';
import { subscribeLatestGroupMessage, useMyDms } from './chat';
import { routeLabel, useMyGroups, useNow } from './groups';
import { firstName, type ChatMessage, type DmThread, type RideGroup } from './types';

type SessionValue = {
  myGroups: RideGroup[];
  upcoming: RideGroup[];
  past: RideGroup[];
  groupsLoading: boolean;
  groupsError: string | null;
  dms: DmThread[];
  latestByGroup: Record<string, ChatMessage | null>;
};

const SessionContext = createContext<SessionValue | null>(null);

const CHAT_WINDOW_MS = 24 * 60 * 60 * 1000; // keep chats of rides that left in the last day

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const now = useNow(30_000);
  const { data: myGroups, loading, error } = useMyGroups(me.uid);
  const dms = useMyDms(me.uid);
  const [latestByGroup, setLatestByGroup] = useState<Record<string, ChatMessage | null>>({});
  const [startedAt] = useState(() => Date.now());
  const notified = useRef(new Set<string>());

  const upcoming = useMemo(() => myGroups.filter((g) => g.departure.getTime() > now.getTime()), [myGroups, now]);
  const past = useMemo(
    () => myGroups.filter((g) => g.departure.getTime() <= now.getTime()).reverse(),
    [myGroups, now],
  );

  // ---------- departure reminders
  useEffect(() => {
    syncReminders(
      upcoming.map((g) => ({ id: g.id, departure: g.departure, title: routeLabel(g) })),
    ).catch((e) => console.warn('reminders', e));
  }, [upcoming]);

  // ---------- joins, leaves, group full
  const prevMembers = useRef<Map<string, string[]> | null>(null);
  useEffect(() => {
    if (loading) return;
    const next = new Map(myGroups.map((g) => [g.id, g.memberIds]));
    const prev = prevMembers.current;
    prevMembers.current = next;
    if (!prev) return; // first load: nothing to announce

    for (const g of myGroups) {
      const before = prev.get(g.id);
      if (!before || g.departure.getTime() <= Date.now()) continue;
      const joined = g.memberIds.filter((u) => !before.includes(u) && u !== me.uid);
      const left = before.filter((u) => !g.memberIds.includes(u) && u !== me.uid);
      const n = g.memberIds.length;
      const fare = g.fare > 0 ? ` Fare is now ${formatNu(farePerPerson(g.fare, n))} each.` : '';
      const title = `${formatTime(g.departure)} · ${routeLabel(g)}`;
      const target = { screen: 'GroupDetail' as const, groupId: g.id };
      if (joined.length && n >= g.seats && before.length < g.seats) {
        notifyNow(title, `Your group is full.${fare}`, target);
      } else if (joined.length) {
        const name = firstName(g.members[joined[0]]?.name ?? 'Someone');
        notifyNow(title, `${name} joined your ride.${fare}`, target);
      } else if (left.length) {
        notifyNow(title, `A rider left your group.${fare}`, target);
      }
    }
  }, [myGroups, loading, me.uid]);

  // ---------- latest message per group chat (for the Chats list and message alerts)
  // Re-subscribe only when the set of chats changes, not on every group update.
  const chatIds = myGroups
    .filter((g) => g.departure.getTime() > now.getTime() - CHAT_WINDOW_MS)
    .map((g) => g.id)
    .join(',');
  const groupsRef = useRef(myGroups);
  useEffect(() => {
    groupsRef.current = myGroups;
  }, [myGroups]);
  useEffect(() => {
    const ids = chatIds ? chatIds.split(',') : [];
    const unsubs = ids.map((id) =>
      subscribeLatestGroupMessage(id, (m) => {
        const g = groupsRef.current.find((x) => x.id === id);
        if (!g) return;
        setLatestByGroup((s) => ({ ...s, [g.id]: m }));
        if (!m || m.system || m.senderId === me.uid) return;
        if (m.sentAt.getTime() < startedAt) return;
        if (notified.current.has(m.id)) return;
        notified.current.add(m.id);
        if (isChatOpen(`group:${g.id}`)) return;
        notifyNow(`${routeLabel(g)} · ${formatTime(g.departure)}`, `${firstName(m.senderName)}: ${m.text}`, {
          screen: 'GroupChat',
          groupId: g.id,
        });
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [chatIds, me.uid, startedAt]);

  // ---------- direct messages
  const prevDm = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    const next = new Map(dms.map((t) => [t.id, t.updatedAt.getTime()]));
    const prev = prevDm.current;
    prevDm.current = next;
    if (!prev) return;
    for (const t of dms) {
      const was = prev.get(t.id) ?? 0;
      if (t.updatedAt.getTime() > was && t.lastSenderId && t.lastSenderId !== me.uid && !isChatOpen(`dm:${t.id}`)) {
        notifyNow(t.names[t.lastSenderId] ?? 'New message', t.lastText, { screen: 'DirectChat', threadId: t.id });
      }
    }
  }, [dms, me.uid]);

  const value = useMemo<SessionValue>(
    () => ({ myGroups, upcoming, past, groupsLoading: loading, groupsError: error, dms, latestByGroup }),
    [myGroups, upcoming, past, loading, error, dms, latestByGroup],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
