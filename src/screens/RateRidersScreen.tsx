import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar, Button, Card, EmptyState, ErrorText, Header, Loading, Screen, StarInput } from '../components/ui';
import { useMe } from '../data/auth';
import { orderedMembers, routeLabel, useGroup, useNow } from '../data/groups';
import { submitRatings, useRatedGroupIds } from '../data/ratings';
import { formatDayRelative, formatTime } from '../lib/time';
import type { ScreenProps } from '../navigation/types';
import { colors, fonts, type } from '../theme';

type Entry = { stars: number; noShow: boolean };

export default function RateRidersScreen({ route, navigation }: ScreenProps<'RateRiders'>) {
  const { groupId } = route.params;
  const me = useMe();
  const { data: g, loading } = useGroup(groupId);
  const rated = useRatedGroupIds(me.uid);
  const now = useNow();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (!g) {
    return (
      <Screen header={<Header title="Rate riders" />}>
        <EmptyState title="Ride not found" body="This group no longer exists." />
      </Screen>
    );
  }

  const others = orderedMembers(g).filter((m) => m.uid !== me.uid);
  const departed = g.departure.getTime() <= now.getTime();
  const already = rated.has(g.id);

  const set = (uid: string, patch: Partial<Entry>) =>
    setEntries((e) => ({ ...e, [uid]: { ...(e[uid] ?? { stars: 0, noShow: false }), ...patch } }));

  const submit = async () => {
    const missing = others.filter((m) => {
      const e = entries[m.uid];
      return !e || (!e.noShow && e.stars < 1);
    });
    if (missing.length) {
      setError(`Give ${missing.map((m) => m.name.split(' ')[0]).join(' and ')} a rating, or mark them as a no-show.`);
      return;
    }
    setBusy(true);
    try {
      await submitRatings(
        g,
        me,
        others.map((m) => ({ ratedId: m.uid, stars: entries[m.uid].stars, noShow: entries[m.uid].noShow })),
      );
      navigation.goBack();
    } catch (e) {
      console.warn(e);
      setError('Couldn’t save your ratings. You may have rated this ride already.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<Header title="How was your ride?" subtitle={`${routeLabel(g)} · ${formatDayRelative(g.departure)} ${formatTime(g.departure)}`} />}
      footer={!departed || already || others.length === 0 ? undefined : <Button label="Submit ratings" onPress={submit} loading={busy} />}
      contentStyle={{ paddingTop: 4 }}
    >
      {!departed ? (
        <EmptyState title="Not yet" body="You can rate riders once the ride has left." />
      ) : already ? (
        <EmptyState title="Already rated" body="Thanks. Each rider can be rated once per ride." />
      ) : (
        <>
          <Text style={type.small}>Ratings are shown on each rider’s profile and help everyone pick dependable groups. Each rider can be rated once.</Text>
          {others.map((m) => {
            const e = entries[m.uid] ?? { stars: 0, noShow: false };
            return (
              <Card key={m.uid} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar initials={m.initials} />
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink900 }}>{m.name}</Text>
                </View>
                <StarInput value={e.stars} onChange={(n) => set(m.uid, { stars: n, noShow: false })} disabled={e.noShow} />
                <Pressable onPress={() => set(m.uid, { noShow: !e.noShow })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} hitSlop={6}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: e.noShow ? colors.coral500 : colors.lineStrong,
                      backgroundColor: e.noShow ? colors.coral500 : colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {e.noShow ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: e.noShow ? colors.coral500 : colors.ink700 }}>Didn’t show up</Text>
                </Pressable>
              </Card>
            );
          })}
          <ErrorText>{error}</ErrorText>
        </>
      )}
    </Screen>
  );
}
