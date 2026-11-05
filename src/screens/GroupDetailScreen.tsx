import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { seatBadge } from '../components/RideCards';
import { Avatar, Badge, Button, Card, Divider, EmptyState, Header, Loading, Notice, RatingText, Screen, SeatStrip } from '../components/ui';
import { useMe } from '../data/auth';
import { GroupError, isFull, leaveGroup, orderedMembers, rideTypeLabel, routeLabel, useGroup, useNow } from '../data/groups';
import { useRatedGroupIds, useRatingSummaries } from '../data/ratings';
import { firstName } from '../data/types';
import { fareLadder, farePerPerson, formatNu } from '../lib/fare';
import { formatDayRelative, formatTime } from '../lib/time';
import { useJoin } from '../lib/useJoin';
import type { ScreenProps } from '../navigation/types';
import { colors, fonts, type } from '../theme';

export default function GroupDetailScreen({ route, navigation }: ScreenProps<'GroupDetail'>) {
  const { groupId } = route.params;
  const me = useMe();
  const now = useNow(15_000);
  const { data: g, loading, deleted } = useGroup(groupId);
  const members = g ? orderedMembers(g) : [];
  const ratings = useRatingSummaries(members.map((m) => m.uid));
  const rated = useRatedGroupIds(me.uid);
  const { join, joiningId } = useJoin();
  const [leaving, setLeaving] = useState(false);

  if (loading) return <Loading />;
  if (!g || deleted) {
    return (
      <Screen header={<Header title="Group" />}>
        <EmptyState title="This group is gone" body="Everyone left, so the group was removed." />
      </Screen>
    );
  }

  const isMember = g.memberIds.includes(me.uid);
  const departed = g.departure.getTime() <= now.getTime();
  const n = g.memberIds.length;
  const free = g.fare === 0;
  const shownRiders = isMember ? n : Math.min(n + 1, g.seats);
  const share = farePerPerson(g.fare, shownRiders);
  const last = members[members.length - 1];
  const lastJoinedOther = n > 1 && last && last.uid !== me.uid ? last : null;
  const badge = seatBadge(g);
  const day = formatDayRelative(g.departure);

  const confirmLeave = () => {
    const after = n - 1;
    Alert.alert(
      'Leave this group?',
      after === 0
        ? 'You are the only rider, so the group and its chat will be removed.'
        : free
          ? 'Your seat will open up for someone else.'
          : `The fare for the others goes up to ${formatNu(farePerPerson(g.fare, after))} each.`,
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave group',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await leaveGroup(g.id, me);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Couldn’t leave', e instanceof GroupError ? e.message : 'Try again in a moment.');
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  let footer: React.ReactNode;
  if (departed) {
    footer = isMember ? (
      rated.has(g.id) ? (
        <Notice>Thanks for rating this ride.</Notice>
      ) : n > 1 ? (
        <Button label="Rate your riders" onPress={() => navigation.navigate('RateRiders', { groupId: g.id })} />
      ) : (
        <Notice tone="amber" icon="info">This ride has left.</Notice>
      )
    ) : (
      <Notice tone="amber" icon="info">This ride has already left.</Notice>
    );
  } else if (isMember) {
    footer = (
      <>
        <Button label="Open group chat" variant="dark" onPress={() => navigation.navigate('GroupChat', { groupId: g.id })} />
        <Button label="Leave group" variant="danger" onPress={confirmLeave} loading={leaving} />
      </>
    );
  } else if (isFull(g)) {
    footer = <Notice tone="amber" icon="users">This group is full. Try another group or start your own.</Notice>;
  } else {
    footer = (
      <Button
        label={free ? 'Take a seat' : `Join this group · ${formatNu(share)} each`}
        loading={joiningId === g.id}
        onPress={() => join(g.id)}
      />
    );
  }

  return (
    <Screen
      header={
        <Header
          title={`${formatTime(g.departure)} · ${routeLabel(g)}`}
          subtitle={`${day} · ${rideTypeLabel(g)}${g.pickup ? ` · pick-up: ${g.pickup}` : ''}`}
        />
      }
      footer={footer}
      contentStyle={{ paddingTop: 4 }}
    >
      {/* Share card */}
      <Card dark style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[type.micro, { color: colors.ink300 }]}>
            {departed ? 'Your share' : isMember ? 'Your share right now' : 'Your share if you join'}
          </Text>
          <Badge label={badge.label} tone={badge.tone} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 44, color: free ? colors.mint500 : colors.amber500, letterSpacing: -1 }}>
            {free ? 'Free' : formatNu(share)}
          </Text>
          {!free && isMember && lastJoinedOther ? (
            <View>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink300 }}>was {formatNu(farePerPerson(g.fare, n - 1))}</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.mint500 }}>{firstName(lastJoinedOther.name)} joined</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: '#DDE6E8' }}>
          {free
            ? `${firstName(g.members[g.createdBy]?.name ?? 'A student')} is driving and not charging. Just be at the pick-up on time.`
            : `${formatNu(g.fare)} total, split ${shownRiders} way${shownRiders === 1 ? '' : 's'}. It changes the moment anyone joins or leaves.`}
        </Text>
        <SeatStrip initials={members.map((m) => m.initials)} seats={g.seats} size={38} onDark />
      </Card>

      {/* Ladder */}
      {!free ? (
        <Card style={{ gap: 12 }}>
          <Text style={type.heading}>What each rider pays</Text>
          {fareLadder(g.fare).map((row) => {
            const current = row.riders === shownRiders;
            return (
              <View key={row.riders} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ width: 62, fontFamily: current ? fonts.semibold : fonts.regular, fontSize: 13, color: current ? colors.ink900 : colors.ink500 }}>
                  {row.riders} rider{row.riders === 1 ? '' : 's'}
                </Text>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      width: `${Math.max(12, (row.each / g.fare) * 100)}%`,
                      backgroundColor: current ? colors.amber500 : colors.sunken,
                    }}
                  />
                </View>
                <Text style={{ width: 96, textAlign: 'right', fontFamily: current ? fonts.bold : fonts.regular, fontSize: 13, color: current ? colors.ink900 : colors.ink500 }}>
                  {formatNu(row.each)}
                  {current ? '  · now' : ''}
                </Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {/* Members */}
      <Card style={{ paddingVertical: 6 }}>
        {members.map((m, i) => {
          const mine = m.uid === me.uid;
          const creator = m.uid === g.createdBy;
          const r = ratings[m.uid];
          return (
            <React.Fragment key={m.uid}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
                <Avatar initials={m.initials} tone={creator ? 'dark' : 'amber'} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink900 }}>{m.name}</Text>
                  <Text style={[type.small, { fontSize: 12 }]}>
                    {creator ? (mine ? 'You created this group' : g.rideType === 'car' ? 'Driver · created this group' : 'Created this group') : `Joined at ${formatTime(new Date(m.joinedAt))}`}
                  </Text>
                  <RatingText average={r?.average ?? null} count={r?.count ?? 0} />
                </View>
                {mine ? (
                  <Badge label="You" tone="grey" />
                ) : isMember ? (
                  <Pressable
                    onPress={() =>
                      navigation.navigate('DirectChat', {
                        peer: { uid: m.uid, name: m.name, initials: m.initials },
                        context: `Rider in your ${formatTime(g.departure)} group`,
                      })
                    }
                    style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' }}
                    accessibilityLabel={`Message ${m.name}`}
                  >
                    <Feather name="message-square" size={17} color={colors.ink700} />
                  </Pressable>
                ) : null}
              </View>
            </React.Fragment>
          );
        })}
        <Divider />
        <Text style={[type.small, { fontSize: 12, textAlign: 'center', paddingVertical: 10 }]}>
          {isMember ? 'Message anyone here one to one. No request, no approval.' : 'Join to see the chat and message riders.'}
        </Text>
      </Card>
    </Screen>
  );
}
